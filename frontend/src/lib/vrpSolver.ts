/**
 * VRP（配車計画）ソルバー — 純TypeScript実装
 * 
 * 貪欲法 + 2-opt改善による近似解法。
 * OR-Toolsほどの最適性はないが、ブラウザ上で瞬時に動作する。
 *
 * 手順:
 * 1. 各ピックアップ地点を「最も近いドライバー」に貪欲に割り当て（容量制約付き）
 * 2. 2-optで各ドライバーのルート内のピックアップ順序を改善
 */

export interface VRPInput {
  /** 全ノード間の移動時間（秒）。ノード順: [driver0, driver1, ..., pickup0, pickup1, ..., destination] */
  durationMatrix: number[][];
  numVehicles: number;
  vehicleCapacities: number[];
  /** 各ノードの需要（ピックアップ地点 = そのクラスターの同乗者数、それ以外 = 0） */
  demands: number[];
  /** 各ドライバーの出発ノードインデックス */
  starts: number[];
  /** 各ドライバーの終点ノードインデックス（全員同じ = 目的地） */
  ends: number[];
}

export interface VRPResult {
  /** 各車両のルート（ノードインデックスの配列） */
  routes: number[][];
}

export function solveVRP(input: VRPInput): VRPResult | null {
  const { durationMatrix, numVehicles, vehicleCapacities, demands, starts, ends } = input;

  // ピックアップ地点のインデックスを抽出（ドライバー出発地でも目的地でもないノード）
  const allNodes = new Set<number>();
  for (let i = 0; i < durationMatrix.length; i++) allNodes.add(i);
  const startSet = new Set(starts);
  const endSet = new Set(ends);
  const pickupNodes = [...allNodes].filter(
    (n) => !startSet.has(n) && !endSet.has(n)
  );

  // 各車両のルートと残容量を初期化
  const routes: number[][] = starts.map((s) => [s]);
  const remainingCapacity = [...vehicleCapacities];

  // 貪欲割り当て: 各ピックアップ地点を「到達コスト最小かつ容量あり」のドライバーに割り当て
  const unassigned = [...pickupNodes];

  // コスト順にソート（目的地からの距離が遠いピックアップを先に割り当て = 難しいものから）
  const destIdx = ends[0];
  unassigned.sort(
    (a, b) => durationMatrix[b][destIdx] - durationMatrix[a][destIdx]
  );

  for (const pickup of unassigned) {
    const demand = demands[pickup];
    let bestVehicle = -1;
    let bestCost = Infinity;

    for (let v = 0; v < numVehicles; v++) {
      if (remainingCapacity[v] < demand) continue;

      // この車両の現在の最終地点からピックアップへの追加コスト
      const lastNode = routes[v][routes[v].length - 1];
      const cost = durationMatrix[lastNode][pickup];

      if (cost < bestCost) {
        bestCost = cost;
        bestVehicle = v;
      }
    }

    if (bestVehicle === -1) {
      // 容量オーバーで割り当て不可 — スキップ
      continue;
    }

    routes[bestVehicle].push(pickup);
    remainingCapacity[bestVehicle] -= demand;
  }

  // 各ルートの末尾に目的地を追加
  for (let v = 0; v < numVehicles; v++) {
    routes[v].push(ends[v]);
  }

  // 2-opt改善: 各車両のピックアップ地点の訪問順序を改善
  for (let v = 0; v < numVehicles; v++) {
    if (routes[v].length <= 3) continue; // start + dest のみ、または1ピックアップなら改善不要

    let improved = true;
    while (improved) {
      improved = false;
      // ピックアップ部分のインデックス (1 ～ routes.length-2)
      for (let i = 1; i < routes[v].length - 2; i++) {
        for (let j = i + 1; j < routes[v].length - 1; j++) {
          const before =
            durationMatrix[routes[v][i - 1]][routes[v][i]] +
            durationMatrix[routes[v][j]][routes[v][j + 1]];
          const after =
            durationMatrix[routes[v][i - 1]][routes[v][j]] +
            durationMatrix[routes[v][i]][routes[v][j + 1]];

          if (after < before) {
            // i ～ j の区間を反転
            const segment = routes[v].slice(i, j + 1).reverse();
            routes[v].splice(i, j - i + 1, ...segment);
            improved = true;
          }
        }
      }
    }
  }

  return { routes };
}
