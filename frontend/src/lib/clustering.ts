/**
 * K-means クラスタリング — 純TypeScript実装
 * 同乗者の位置を K 個のクラスターに分割し、各クラスターの重心を算出する
 */

export interface Point {
  lat: number;
  lng: number;
}

export interface ClusterResult {
  centroids: Point[];
  labels: number[];
}

function distance(a: Point, b: Point): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aCalc =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
}

function nearestCentroid(point: Point, centroids: Point[]): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < centroids.length; i++) {
    const d = distance(point, centroids[i]);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

export function kmeans(
  points: Point[],
  k: number,
  maxIter: number = 100
): ClusterResult {
  const actualK = Math.min(k, points.length);
  if (actualK <= 0) return { centroids: [], labels: [] };

  // 初期重心: ランダムに選択（K-means++風に分散させる）
  const centroids: Point[] = [];
  const usedIndices = new Set<number>();

  // 最初の重心はランダム
  const firstIdx = Math.floor(Math.random() * points.length);
  centroids.push({ ...points[firstIdx] });
  usedIndices.add(firstIdx);

  // 残りの重心は最も遠い点から選択
  for (let c = 1; c < actualK; c++) {
    let maxDist = -1;
    let bestIdx = 0;
    for (let i = 0; i < points.length; i++) {
      if (usedIndices.has(i)) continue;
      const minDistToCentroid = Math.min(
        ...centroids.map((cent) => distance(points[i], cent))
      );
      if (minDistToCentroid > maxDist) {
        maxDist = minDistToCentroid;
        bestIdx = i;
      }
    }
    centroids.push({ ...points[bestIdx] });
    usedIndices.add(bestIdx);
  }

  let labels = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // 割り当て
    const newLabels = points.map((p) => nearestCentroid(p, centroids));

    // 収束チェック
    const changed = newLabels.some((l, i) => l !== labels[i]);
    labels = newLabels;

    if (!changed) break;

    // 重心の更新
    for (let c = 0; c < actualK; c++) {
      const members = points.filter((_, i) => labels[i] === c);
      if (members.length > 0) {
        centroids[c] = {
          lat: members.reduce((s, p) => s + p.lat, 0) / members.length,
          lng: members.reduce((s, p) => s + p.lng, 0) / members.length,
        };
      }
    }
  }

  return { centroids, labels };
}
