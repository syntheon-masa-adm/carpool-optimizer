import React from 'react';
import { OptimizeResponse } from '../types';
import { RouteCard } from './RouteCard';

interface Props {
  result: OptimizeResponse | null;
}

const ROUTE_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#FF6D01', '#46BDC6', '#7B1FA2', '#C2185B'];

export const ResultPanel: React.FC<Props> = ({ result }) => {
  if (!result) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
        情報を入力して「最適化を実行」をクリックしてください
      </div>
    );
  }

  const { summary, routes } = result;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">📊 最適化結果サマリー</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-sm text-blue-600 font-bold">ドライバー数</div>
            <div className="text-2xl font-bold text-blue-800">{summary.total_drivers} 名</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-sm text-green-600 font-bold">同乗者数</div>
            <div className="text-2xl font-bold text-green-800">{summary.total_passengers} 名</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
             <div className="text-sm text-purple-600 font-bold">推定総移動時間</div>
             <div className="text-2xl font-bold text-purple-800">{Math.round(summary.total_duration_minutes)} 分</div>
          </div>
        </div>
        
        {summary.unassigned_passengers.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">
            <strong>⚠️ 割り当てできなかった同乗者がいます:</strong> {summary.unassigned_passengers.join(', ')}
            <br/>定員オーバーか、検索範囲内に適切な集合場所が見つかりませんでした。
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">🚗 割り当てルート詳細</h2>
        {routes.map((route, index) => (
          <RouteCard key={index} route={route} index={index} color={ROUTE_COLORS[index % ROUTE_COLORS.length]} />
        ))}
      </div>
    </div>
  );
};
