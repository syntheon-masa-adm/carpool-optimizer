import httpx
import asyncio
from typing import Tuple, List, Dict, Any

class RouteBuilderService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.url = "https://maps.googleapis.com/maps/api/directions/json"
        
    async def get_route(self, waypoints: List[Tuple[float, float]]) -> Dict[str, Any]:
        if len(waypoints) < 2:
            return {"duration_seconds": 0, "distance_meters": 0, "polyline": ""}
            
        origin = waypoints[0]
        destination = waypoints[-1]
        
        params = {
            "origin": f"{origin[0]},{origin[1]}",
            "destination": f"{destination[0]},{destination[1]}",
            "key": self.api_key,
            "mode": "driving"
        }
        
        if len(waypoints) > 2:
            intermediate = waypoints[1:-1]
            params["waypoints"] = "|".join([f"{lat},{lng}" for lat, lng in intermediate])
            
        async with httpx.AsyncClient() as client:
            response = await client.get(self.url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data["status"] != "OK":
                raise ValueError(f"Directions API error: {data.get('status')}")
                
            route = data["routes"][0]
            leg = route["legs"][0]
            
            duration = sum(l["duration"]["value"] for l in route["legs"])
            distance = sum(l["distance"]["value"] for l in route["legs"])
            polyline = route["overview_polyline"]["points"]
            
            return {
                "duration_seconds": duration,
                "distance_meters": distance,
                "polyline": polyline
            }
            
    async def build_all_routes(self, routes: List[List[Tuple[float, float]]]) -> List[Dict[str, Any]]:
        tasks = [self.get_route(waypoints) for waypoints in routes]
        return await asyncio.gather(*tasks)
