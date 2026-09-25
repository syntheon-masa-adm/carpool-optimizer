import React from 'react';
import { DriverRoute } from '../types';

interface Props {
  route: DriverRoute;
  index: number;
  color: string;
}

export const RouteCard: React.FC<Props> = ({ route, index, color }) => {
  const isFull = route.passenger_count >= route.vehicle_capacity;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border-l-8 p-4 mb-4" style={{ borderLeftColor: color }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="w-6 h-6 rounded-full text-white flex items-center justify-center text-sm" style={{ backgroundColor: color }}>
            {index + 1}
          </span>
          {route.driver_name} の車
        </h3>
        <div className="text-sm font-medium">
          <span className="text-gray-500">乗車人数: </span>
          <span className={isFull ? 'text-red-500 font-bold' : ''}>{route.passenger_count + 1}</span>
          <span className="text-gray-500"> / {route.vehicle_capacity + 1}</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, ((route.passenger_count + 1) / (route.vehicle_capacity + 1)) * 100)}%`, backgroundColor: color }}></div>
      </div>
      
      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent mb-4 pl-6">
        <div className="relative flex items-center gap-3">
          <div className="absolute -left-8 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow"></div>
          <div>
            <div className="text-xs font-bold text-gray-500">出発地</div>
            <div className="text-sm">{route.origin.address}</div>
          </div>
        </div>
        
        {route.pickup_points.map((pt, i) => (
          <div key={i} className="relative flex items-center gap-3">
             <div className="absolute -left-8 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
             <div className="bg-gray-50 p-2 rounded w-full">
               <div className="text-xs font-bold text-gray-500">集合場所: {pt.poi_name}</div>
               <div className="text-sm">{pt.location.address}</div>
               <div className="text-xs mt-1 text-gray-600">乗車: {pt.assigned_passengers.join(', ')}</div>
             </div>
          </div>
        ))}
        
        <div className="relative flex items-center gap-3">
          <div className="absolute -left-8 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
          <div>
             <div className="text-xs font-bold text-gray-500">目的地</div>
             <div className="text-sm">{route.destination.address}</div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-lg">
        <div>
          <span className="font-semibold text-gray-700">総距離: </span>
          {route.total_distance_km.toFixed(1)} km
        </div>
        <div>
          <span className="font-semibold text-gray-700">所要時間: </span>
          {Math.round(route.total_duration_minutes)} 分
        </div>
      </div>
    </div>
  );
};
