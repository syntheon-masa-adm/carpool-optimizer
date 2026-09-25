import json
import asyncio
import httpx
from pathlib import Path
from typing import Tuple, List, Dict, Any

class GeocodingService:
    def __init__(self, api_key: str, cache_file: str = "cache/geocode_cache.json"):
        self.api_key = api_key
        self.cache_file = Path(cache_file)
        self.cache: Dict[str, Dict[str, float]] = self._load_cache()
        self.base_url = "https://maps.googleapis.com/maps/api/geocode/json"

    def _load_cache(self) -> Dict[str, Dict[str, float]]:
        if self.cache_file.exists():
            with open(self.cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _save_cache(self) -> None:
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.cache_file, "w", encoding="utf-8") as f:
            json.dump(self.cache, f, ensure_ascii=False, indent=2)

    async def geocode(self, address: str) -> Tuple[float, float]:
        if address in self.cache:
            return self.cache[address]["lat"], self.cache[address]["lng"]

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.base_url,
                params={"address": address, "key": self.api_key}
            )
            response.raise_for_status()
            data = response.json()
            
            if data["status"] == "OK" and data["results"]:
                location = data["results"][0]["geometry"]["location"]
                lat = location["lat"]
                lng = location["lng"]
                self.cache[address] = {"lat": lat, "lng": lng}
                self._save_cache()
                return lat, lng
            else:
                raise ValueError(f"Failed to geocode address '{address}': {data.get('status')}")

    async def batch_geocode(self, addresses: List[str]) -> List[Tuple[float, float]]:
        tasks = [self.geocode(address) for address in addresses]
        return await asyncio.gather(*tasks)
