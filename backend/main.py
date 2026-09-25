import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import OptimizeRequest, OptimizeResponse, DriverRoute, PickupPoint, Location
from services.geocoding import GeocodingService
from services.clustering import ClusteringService
from services.poi_snap import POISnapService
from services.distance_matrix import DistanceMatrixService
from services.vrp_solver import VRPSolver
from services.route_builder import RouteBuilderService

load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def check_api_key():
    if not API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_MAPS_API_KEY is not set.")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/geocode")
async def geocode(address: str):
    check_api_key()
    try:
        geo_service = GeocodingService(api_key=API_KEY)
        lat, lng = await geo_service.geocode(address)
        return {"lat": lat, "lng": lng}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/optimize", response_model=OptimizeResponse)
async def optimize(req: OptimizeRequest):
    check_api_key()
    try:
        geo_service = GeocodingService(api_key=API_KEY)
        cluster_service = ClusteringService()
        poi_service = POISnapService(api_key=API_KEY)
        matrix_service = DistanceMatrixService(api_key=API_KEY)
        vrp_solver = VRPSolver()
        route_service = RouteBuilderService(api_key=API_KEY)

        # 1. Geocode
        driver_addresses = [d.address for d in req.drivers]
        passenger_addresses = [p.address for p in req.passengers]
        all_addresses = driver_addresses + passenger_addresses + [req.destination]
        
        coords = await geo_service.batch_geocode(all_addresses)
        
        driver_coords = coords[:len(req.drivers)]
        passenger_coords = coords[len(req.drivers):len(req.drivers)+len(req.passengers)]
        destination_coord = coords[-1]
        
        # 2. Clustering
        centroids, labels = cluster_service.cluster_passengers(passenger_coords, req.num_hubs)
        
        # 3. POI Snap
        snapped_pois = await poi_service.snap_all_centroids(centroids, req.search_radius_km)
        
        # Group passengers by POI
        poi_passengers = [[] for _ in range(len(snapped_pois))]
        for i, label in enumerate(labels):
            poi_passengers[label].append(req.passengers[i].name)
            
        # 4. Duration Matrix
        all_nodes = driver_coords + [(p["lat"], p["lng"]) for p in snapped_pois] + [destination_coord]
        
        raw_matrix = await matrix_service.get_duration_matrix(origins=all_nodes, destinations=all_nodes)
        
        duration_matrix = [[int(val) for val in row] for row in raw_matrix]
        
        # 5. VRP
        num_vehicles = len(req.drivers)
        vehicle_capacities = [d.capacity for d in req.drivers]
        
        demands = [0] * num_vehicles + [len(p) for p in poi_passengers] + [0]
        
        starts = list(range(num_vehicles))
        ends = [len(all_nodes) - 1] * num_vehicles
        
        routes = vrp_solver.solve(duration_matrix, num_vehicles, vehicle_capacities, demands, starts, ends)
        
        if not routes:
            raise HTTPException(status_code=400, detail="Could not find a valid route configuration.")
            
        # 6. Build Routes & Prepare Response
        driver_routes = []
        global_pickup_points = []
        
        for i, poi in enumerate(snapped_pois):
            global_pickup_points.append(
                PickupPoint(
                    location=Location(lat=poi["lat"], lng=poi["lng"], address=poi["address"], name=poi["name"]),
                    poi_name=poi["name"],
                    poi_type=poi["type"],
                    assigned_passengers=poi_passengers[i]
                )
            )
            
        route_coords = []
        for v_id, route_nodes in enumerate(routes):
            coords_seq = [all_nodes[idx] for idx in route_nodes]
            route_coords.append(coords_seq)
            
        directions = await route_service.build_all_routes(route_coords)
        
        total_duration_minutes = 0.0
        
        for v_id, route_nodes in enumerate(routes):
            d_info = directions[v_id]
            d_duration = d_info["duration_seconds"] / 60.0
            total_duration_minutes += d_duration
            
            vehicle_passengers = []
            vehicle_pickups = []
            for idx in route_nodes[1:-1]:
                poi_idx = idx - num_vehicles
                vehicle_pickups.append(global_pickup_points[poi_idx])
                vehicle_passengers.extend(poi_passengers[poi_idx])
                
            driver_routes.append(
                DriverRoute(
                    driver_name=req.drivers[v_id].name,
                    origin=Location(lat=driver_coords[v_id][0], lng=driver_coords[v_id][1], address=req.drivers[v_id].address),
                    pickup_points=vehicle_pickups,
                    destination=Location(lat=destination_coord[0], lng=destination_coord[1], address=req.destination, name=req.destination_name),
                    passengers=vehicle_passengers,
                    total_duration_minutes=d_duration,
                    total_distance_km=d_info["distance_meters"] / 1000.0,
                    polyline=d_info["polyline"],
                    vehicle_capacity=req.drivers[v_id].capacity,
                    passenger_count=len(vehicle_passengers)
                )
            )
            
        # 割り当て済みの同乗者を集計
        assigned = set()
        for route in driver_routes:
            assigned.update(route.passengers)
        all_passenger_names = [p.name for p in req.passengers]
        unassigned = [name for name in all_passenger_names if name not in assigned]

        summary = {
            "total_drivers": num_vehicles,
            "total_passengers": len(req.passengers),
            "total_duration_minutes": total_duration_minutes,
            "unassigned_passengers": unassigned
        }
        
        return OptimizeResponse(
            routes=driver_routes,
            pickup_points=global_pickup_points,
            summary=summary
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
