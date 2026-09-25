import React, { useState } from 'react';
import { OptimizeRequest, DriverInput, PassengerInput } from '../types';

interface Props {
  onOptimize: (request: OptimizeRequest) => void;
  isLoading: boolean;
}

export const InputForm: React.FC<Props> = ({ onOptimize, isLoading }) => {
  const [drivers, setDrivers] = useState<DriverInput[]>([
    { id: 'd1', name: '佐藤', address: '東京都新宿区西新宿2-8-1', capacity: 4 }
  ]);
  const [passengers, setPassengers] = useState<PassengerInput[]>([
    { id: 'p1', name: '鈴木', address: '東京都渋谷区渋谷2-24-1' },
    { id: 'p2', name: '高橋', address: '東京都世田谷区北沢2-24-2' }
  ]);
  const [destination, setDestination] = useState('長野県北佐久郡軽井沢町');
  const [k, setK] = useState(3);
  const [searchRadius, setSearchRadius] = useState(1.0);

  const addDriver = () => setDrivers([...drivers, { id: Date.now().toString(), name: '', address: '', capacity: 4 }]);
  const removeDriver = (id: string) => setDrivers(drivers.filter(d => d.id !== id));
  
  const addPassenger = () => setPassengers([...passengers, { id: Date.now().toString(), name: '', address: '' }]);
  const removePassenger = (id: string) => setPassengers(passengers.filter(p => p.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOptimize({
      drivers: drivers.map(({ id, ...rest }) => rest),
      passengers: passengers.map(({ id, ...rest }) => rest),
      destination,
      k,
      search_radius_km: searchRadius
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center">🚗 ドライバー</h2>
        {drivers.map((driver, index) => (
          <div key={driver.id} className="mb-4 flex gap-2 items-start border-b pb-4 last:border-0 last:pb-0">
            <div className="flex-1 space-y-2">
              <input type="text" placeholder="名前" className="w-full border p-2 rounded" value={driver.name} onChange={e => {
                const newDrivers = [...drivers];
                newDrivers[index].name = e.target.value;
                setDrivers(newDrivers);
              }} required />
              <input type="text" placeholder="出発住所" className="w-full border p-2 rounded" value={driver.address} onChange={e => {
                const newDrivers = [...drivers];
                newDrivers[index].address = e.target.value;
                setDrivers(newDrivers);
              }} required />
              <div className="flex items-center gap-2">
                <label className="text-sm">乗車可能人数:</label>
                <input type="number" min="1" className="border p-2 rounded w-20" value={driver.capacity} onChange={e => {
                  const newDrivers = [...drivers];
                  newDrivers[index].capacity = parseInt(e.target.value);
                  setDrivers(newDrivers);
                }} required />
              </div>
            </div>
            {drivers.length > 1 && (
              <button type="button" onClick={() => removeDriver(driver.id)} className="text-red-500 font-bold p-2 text-xl hover:bg-red-50 rounded">×</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addDriver} className="w-full mt-2 py-2 text-blue-600 font-semibold border-2 border-dashed border-blue-200 rounded-lg hover:bg-blue-50">+ ドライバーを追加</button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center">👥 同乗者</h2>
        {passengers.map((passenger, index) => (
          <div key={passenger.id} className="mb-4 flex gap-2 items-start border-b pb-4 last:border-0 last:pb-0">
            <div className="flex-1 space-y-2">
              <input type="text" placeholder="名前" className="w-full border p-2 rounded" value={passenger.name} onChange={e => {
                const newPassengers = [...passengers];
                newPassengers[index].name = e.target.value;
                setPassengers(newPassengers);
              }} required />
              <input type="text" placeholder="出発住所" className="w-full border p-2 rounded" value={passenger.address} onChange={e => {
                const newPassengers = [...passengers];
                newPassengers[index].address = e.target.value;
                setPassengers(newPassengers);
              }} required />
            </div>
            <button type="button" onClick={() => removePassenger(passenger.id)} className="text-red-500 font-bold p-2 text-xl hover:bg-red-50 rounded">×</button>
          </div>
        ))}
        <button type="button" onClick={addPassenger} className="w-full mt-2 py-2 text-blue-600 font-semibold border-2 border-dashed border-blue-200 rounded-lg hover:bg-blue-50">+ 同乗者を追加</button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center">📍 目的地</h2>
        <input type="text" placeholder="目的地の住所" className="w-full border p-2 rounded" value={destination} onChange={e => setDestination(e.target.value)} required />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center">⚙️ 設定</h2>
        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-sm mb-1">
              <span>集合場所数 (K)</span>
              <span className="font-bold">{k}</span>
            </label>
            <input type="range" min="1" max="10" value={k} onChange={e => setK(parseInt(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="flex justify-between text-sm mb-1">
              <span>検索半径 (km)</span>
              <span className="font-bold">{searchRadius}</span>
            </label>
            <input type="range" min="0.5" max="5.0" step="0.5" value={searchRadius} onChange={e => setSearchRadius(parseFloat(e.target.value))} className="w-full" />
          </div>
        </div>
      </div>

      <button type="submit" disabled={isLoading} className={`w-full py-3 rounded-xl font-bold text-white ${isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
        {isLoading ? '最適化中...' : '最適化を実行'}
      </button>
    </form>
  );
};
