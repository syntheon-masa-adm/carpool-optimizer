import httpx
from typing import Tuple, List

class DistanceMatrixService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.url = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"

    async def get_duration_matrix(self, origins: List[Tuple[float, float]], destinations: List[Tuple[float, float]]) -> List[List[float]]:
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters",
            "Content-Type": "application/json"
        }
        
        origins_payload = [
            {
                "waypoint": {
                    "location": {
                        "latLng": {"latitude": lat, "longitude": lng}
                    }
                }
            } for lat, lng in origins
        ]
        
        destinations_payload = [
            {
                "waypoint": {
                    "location": {
                        "latLng": {"latitude": lat, "longitude": lng}
                    }
                }
            } for lat, lng in destinations
        ]

        body = {
            "origins": origins_payload,
            "destinations": destinations_payload,
            "travelMode": "DRIVE"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(self.url, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            
            matrix = [[0.0] * len(destinations) for _ in range(len(origins))]
            
            for elem in data:
                o_idx = elem.get("originIndex", 0)
                d_idx = elem.get("destinationIndex", 0)
                duration_str = elem.get("duration", "0s")
                duration_sec = float(duration_str.rstrip('s')) if duration_str.endswith('s') else 0.0
                matrix[o_idx][d_idx] = duration_sec
                
            return matrix
