import httpx
import asyncio
from typing import Tuple, List, Dict, Any
import math

class POISnapService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.url = "https://places.googleapis.com/v1/places:searchNearby"

    async def snap_to_poi(self, centroid: Tuple[float, float], radius_km: float = 1.0) -> Dict[str, Any]:
        lat, lng = centroid
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "places.displayName,places.location,places.types,places.rating,places.formattedAddress",
            "Content-Type": "application/json"
        }
        
        body = {
            "includedTypes": ["transit_station", "parking", "convenience_store"],
            "maxResultCount": 10,
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": lat,
                        "longitude": lng
                    },
                    "radius": radius_km * 1000
                }
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(self.url, headers=headers, json=body)
            if response.status_code != 200:
                return {
                    "name": "Centroid Fallback",
                    "address": "Unknown",
                    "lat": lat,
                    "lng": lng,
                    "type": "centroid_fallback",
                    "score": 0
                }
                
            data = response.json()
            places = data.get("places", [])
            
            if not places:
                return {
                    "name": "Centroid Fallback",
                    "address": "Unknown",
                    "lat": lat,
                    "lng": lng,
                    "type": "centroid_fallback",
                    "score": 0
                }

            best_poi = None
            max_score = -1.0

            for place in places:
                p_lat = place["location"]["latitude"]
                p_lng = place["location"]["longitude"]
                types = place.get("types", [])
                
                type_priority = 0
                if "transit_station" in types:
                    type_priority = 100
                elif "parking" in types:
                    type_priority = 70
                elif "convenience_store" in types:
                    type_priority = 50

                r = 6371.0 # km
                dlat = math.radians(p_lat - lat)
                dlng = math.radians(p_lng - lng)
                a = math.sin(dlat/2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(p_lat)) * math.sin(dlng/2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
                distance = r * c

                distance_score = max(0, (1 - distance / radius_km) * 50)
                
                rating = place.get("rating")
                rating_score = (rating / 5.0) * 20 if rating else 10
                
                total_score = type_priority + distance_score + rating_score
                
                if total_score > max_score:
                    max_score = total_score
                    best_poi = {
                        "name": place.get("displayName", {}).get("text", "Unknown"),
                        "address": place.get("formattedAddress", "Unknown"),
                        "lat": p_lat,
                        "lng": p_lng,
                        "type": types[0] if types else "unknown",
                        "score": total_score
                    }
                    
            if best_poi:
                return best_poi
            
            return {
                "name": "Centroid Fallback",
                "address": "Unknown",
                "lat": lat,
                "lng": lng,
                "type": "centroid_fallback",
                "score": 0
            }

    async def snap_all_centroids(self, centroids: List[Tuple[float, float]], radius_km: float) -> List[Dict[str, Any]]:
        tasks = [self.snap_to_poi(centroid, radius_km) for centroid in centroids]
        return await asyncio.gather(*tasks)
