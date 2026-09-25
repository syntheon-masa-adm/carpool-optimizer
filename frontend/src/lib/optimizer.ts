/**
 * Google Maps JavaScript API を使ったクライアントサイド最適化エンジン
 * 
 * GitHub Pages上でバックエンド不要で動作する。
 * 全てのAPIコール + アルゴリズムがブラウザ内で完結。
 */

import { kmeans, Point } from './clustering';
import { solveVRP } from './vrpSolver';
import type { OptimizeRequest, OptimizeResponse, DriverRoute, PickupPoint } from '../types';

// ============================================================
// ① ジオコーディング
// ============================================================
async function geocode(address: string): Promise<Point> {
  const geocoder = new google.maps.Geocoder();
  const res = await geocoder.geocode({ address });
  if (!res.results.length) throw new Error(`ジオコーディング失敗: ${address}`);
  const loc = res.results[0].geometry.location;
  return { lat: loc.lat(), lng: loc.lng() };
}

// ============================================================
// ③ POI スナップ補正 — Places API (Nearby Search)
// ============================================================
interface POIResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
}

async function snapToPOI(
  centroid: Point,
  radiusKm: number,
  map: google.maps.Map
): Promise<POIResult> {
  const service = new google.maps.places.PlacesService(map);

  const searchTypes = ['transit_station', 'parking', 'convenience_store'];
  const typeWeights: Record<string, number> = {
    transit_station: 100,
    parking: 70,
    convenience_store: 50,
  };

  return new Promise((resolve) => {
    const request: google.maps.places.PlaceSearchRequest = {
      location: new google.maps.LatLng(centroid.lat, centroid.lng),
      radius: radiusKm * 1000,
      type: searchTypes[0], // primary type
    };

    service.nearbySearch(request, (results, status) => {
      if (
        status !== google.maps.places.PlacesServiceStatus.OK ||
        !results?.length
      ) {
        // フォールバック: 重心そのものを使用
        resolve({
          name: `集合地点 (${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)})`,
          address: '重心座標（POI未検出）',
          lat: centroid.lat,
          lng: centroid.lng,
          type: 'centroid_fallback',
        });
        return;
      }

      let bestPOI: POIResult | null = null;
      let maxScore = -1;

      for (const place of results) {
        if (!place.geometry?.location) continue;

        const pLat = place.geometry.location.lat();
        const pLng = place.geometry.location.lng();
        const types = place.types || [];

        // タイプスコア
        let typePriority = 30;
        for (const t of types) {
          if (typeWeights[t] && typeWeights[t] > typePriority) {
            typePriority = typeWeights[t];
          }
        }

        // 距離スコア
        const dist = haversineDistance(centroid, { lat: pLat, lng: pLng });
        const distScore = Math.max(0, (1 - dist / radiusKm) * 50);

        // 評価スコア
        const rating = place.rating || 3.0;
        const ratingScore = (rating / 5.0) * 20;

        const totalScore = typePriority + distScore + ratingScore;

        if (totalScore > maxScore) {
          maxScore = totalScore;
          bestPOI = {
            name: place.name || '不明',
            address: place.vicinity || '不明',
            lat: pLat,
            lng: pLng,
            type: types[0] || 'unknown',
          };
        }
      }

      resolve(
        bestPOI || {
          name: `集合地点`,
          address: '重心座標',
          lat: centroid.lat,
          lng: centroid.lng,
          type: 'centroid_fallback',
        }
      );
    });
  });
}

function haversineDistance(a: Point, b: Point): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const calc =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
}

// ============================================================
// ④ Distance Matrix
// ============================================================
async function getDurationMatrix(
  points: google.maps.LatLng[]
): Promise<number[][]> {
  const service = new google.maps.DistanceMatrixService();
  const n = points.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );

  // Distance Matrix API は 1回あたり最大25要素のため、バッチ処理
  const BATCH = 10; // 10 origins × 10 destinations = 100 要素だが、上限は25 originsまたは25 dests
  for (let oStart = 0; oStart < n; oStart += BATCH) {
    const oEnd = Math.min(oStart + BATCH, n);
    const origins = points.slice(oStart, oEnd);

    for (let dStart = 0; dStart < n; dStart += BATCH) {
      const dEnd = Math.min(dStart + BATCH, n);
      const destinations = points.slice(dStart, dEnd);

      const res = await service.getDistanceMatrix({
        origins,
        destinations,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      for (let i = 0; i < res.rows.length; i++) {
        for (let j = 0; j < res.rows[i].elements.length; j++) {
          const elem = res.rows[i].elements[j];
          matrix[oStart + i][dStart + j] =
            elem.status === 'OK' ? elem.duration.value : 99999;
        }
      }
    }
  }

  return matrix;
}

// ============================================================
// ⑥ ルート取得 (Directions API)
// ============================================================
async function getDirectionsRoute(
  waypoints: google.maps.LatLng[]
): Promise<{ durationSec: number; distanceM: number; polyline: string }> {
  if (waypoints.length < 2) {
    return { durationSec: 0, distanceM: 0, polyline: '' };
  }

  const directionsService = new google.maps.DirectionsService();
  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const intermediate = waypoints.slice(1, -1).map((wp) => ({
    location: wp,
    stopover: true,
  }));

  const result = await directionsService.route({
    origin,
    destination,
    waypoints: intermediate,
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: false,
  });

  if (result.routes.length === 0) {
    return { durationSec: 0, distanceM: 0, polyline: '' };
  }

  const route = result.routes[0];
  let totalDuration = 0;
  let totalDistance = 0;
  for (const leg of route.legs) {
    totalDuration += leg.duration?.value || 0;
    totalDistance += leg.distance?.value || 0;
  }

  return {
    durationSec: totalDuration,
    distanceM: totalDistance,
    polyline: route.overview_polyline || '',
  };
}

// ============================================================
// メイン最適化パイプライン
// ============================================================
export async function optimizeClientSide(
  request: OptimizeRequest,
  map: google.maps.Map,
  onProgress?: (step: string) => void
): Promise<OptimizeResponse> {
  const progress = onProgress || (() => {});

  // 1. ジオコーディング
  progress('住所を座標に変換中...');
  const driverCoords = await Promise.all(
    request.drivers.map((d) => geocode(d.address))
  );
  const passengerCoords = await Promise.all(
    request.passengers.map((p) => geocode(p.address))
  );
  const destCoord = await geocode(request.destination);

  // 2. K-means クラスタリング
  progress('同乗者をクラスタリング中...');
  const { centroids, labels } = kmeans(passengerCoords, request.k);

  // 3. POI スナップ
  progress('集合場所の候補を検索中...');
  const snappedPOIs = await Promise.all(
    centroids.map((c) => snapToPOI(c, request.search_radius_km, map))
  );

  // 各POIに割り当てられた同乗者
  const poiPassengers: string[][] = centroids.map(() => []);
  labels.forEach((label, i) => {
    poiPassengers[label].push(request.passengers[i].name);
  });

  // 4. Distance Matrix
  progress('移動時間マトリクスを計算中...');
  const allPoints: google.maps.LatLng[] = [
    ...driverCoords.map((c) => new google.maps.LatLng(c.lat, c.lng)),
    ...snappedPOIs.map((p) => new google.maps.LatLng(p.lat, p.lng)),
    new google.maps.LatLng(destCoord.lat, destCoord.lng),
  ];
  const durationMatrix = await getDurationMatrix(allPoints);

  // 5. VRP ソルバー
  progress('最適なルートを計算中...');
  const numVehicles = request.drivers.length;
  const demands = [
    ...new Array(numVehicles).fill(0),
    ...poiPassengers.map((pp) => pp.length),
    0,
  ];
  const starts = request.drivers.map((_, i) => i);
  const ends = new Array(numVehicles).fill(allPoints.length - 1);

  const vrpResult = solveVRP({
    durationMatrix,
    numVehicles,
    vehicleCapacities: request.drivers.map((d) => d.capacity),
    demands,
    starts,
    ends,
  });

  if (!vrpResult) {
    throw new Error('最適なルートが見つかりませんでした。容量を確認してください。');
  }

  // 6. ルート詳細取得
  progress('ルートの詳細を取得中...');
  const driverRoutes: DriverRoute[] = [];
  const globalPickupPoints: PickupPoint[] = [];

  for (let i = 0; i < snappedPOIs.length; i++) {
    globalPickupPoints.push({
      location: {
        lat: snappedPOIs[i].lat,
        lng: snappedPOIs[i].lng,
        address: snappedPOIs[i].address,
        name: snappedPOIs[i].name,
      },
      poi_name: snappedPOIs[i].name,
      poi_type: snappedPOIs[i].type,
      assigned_passengers: poiPassengers[i],
    });
  }

  for (let v = 0; v < numVehicles; v++) {
    const routeNodes = vrpResult.routes[v];
    const waypointCoords = routeNodes.map((idx) => allPoints[idx]);

    const dir = await getDirectionsRoute(waypointCoords);

    const vehiclePassengers: string[] = [];
    const vehiclePickups: PickupPoint[] = [];
    for (const idx of routeNodes.slice(1, -1)) {
      const poiIdx = idx - numVehicles;
      if (poiIdx >= 0 && poiIdx < globalPickupPoints.length) {
        vehiclePickups.push(globalPickupPoints[poiIdx]);
        vehiclePassengers.push(...poiPassengers[poiIdx]);
      }
    }

    const originCoord = driverCoords[v];
    const driverRoute: DriverRoute = {
      driver_name: request.drivers[v].name,
      origin: {
        lat: originCoord.lat,
        lng: originCoord.lng,
        address: request.drivers[v].address,
      },
      pickup_points: vehiclePickups,
      destination: {
        lat: destCoord.lat,
        lng: destCoord.lng,
        address: request.destination,
        name: request.destination_name,
      },
      passengers: vehiclePassengers,
      total_duration_minutes: dir.durationSec / 60,
      total_distance_km: dir.distanceM / 1000,
      polyline: dir.polyline,
      vehicle_capacity: request.drivers[v].capacity,
      passenger_count: vehiclePassengers.length,
    };

    driverRoutes.push(driverRoute);
  }

  // 未割り当て同乗者チェック
  const assigned = new Set(driverRoutes.flatMap((r) => r.passengers));
  const unassigned = request.passengers
    .map((p) => p.name)
    .filter((n) => !assigned.has(n));

  const totalDuration = driverRoutes.reduce(
    (s, r) => s + r.total_duration_minutes,
    0
  );

  progress('完了！');

  return {
    routes: driverRoutes,
    pickup_points: globalPickupPoints,
    summary: {
      total_drivers: numVehicles,
      total_passengers: request.passengers.length,
      total_duration_minutes: totalDuration,
      unassigned_passengers: unassigned,
    },
  };
}
