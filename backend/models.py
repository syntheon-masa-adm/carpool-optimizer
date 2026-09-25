from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Location(BaseModel):
    lat: float
    lng: float
    address: str
    name: Optional[str] = None

class DriverInput(BaseModel):
    name: str
    address: str
    capacity: int = Field(ge=1)

class PassengerInput(BaseModel):
    name: str
    address: str

class OptimizeRequest(BaseModel):
    drivers: List[DriverInput]
    passengers: List[PassengerInput]
    destination: str
    destination_name: Optional[str] = None
    waypoints: List[str] = Field(default_factory=list)
    num_hubs: int = Field(alias='k', ge=1, le=10)
    search_radius_km: float = 1.0

class PickupPoint(BaseModel):
    location: Location
    poi_name: str
    poi_type: str
    assigned_passengers: List[str]

class DriverRoute(BaseModel):
    driver_name: str
    origin: Location
    pickup_points: List[PickupPoint]
    destination: Location
    passengers: List[str]
    total_duration_minutes: float
    total_distance_km: float
    polyline: str
    vehicle_capacity: int
    passenger_count: int

class OptimizeResponse(BaseModel):
    routes: List[DriverRoute]
    pickup_points: List[PickupPoint]
    summary: Dict[str, Any]
