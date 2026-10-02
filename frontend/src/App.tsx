import { useState, useEffect } from 'react';
import type { OptimizeRequest, OptimizeResponse } from './types';
import { optimize, healthCheck } from './api/optimizer';
import { InputForm } from './components/InputForm';
import { MapView } from './components/MapView';
import { ResultPanel } from './components/ResultPanel';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function App() {
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    healthCheck().then(setBackendOnline);
  }, []);

  const handleOptimize = async (request: OptimizeRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await optimize(request);
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '最適化処理中にエラーが発生しました';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm px-6 py-4 z-10 sticky top-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              🚗 車割りオプティマイザー
            </h1>
            <p className="text-slate-500 text-sm mt-1">大会遠征の配車を自動最適化</p>
          </div>
          <div className="flex items-center gap-2">
            {backendOnline !== null && (
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${backendOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {backendOnline ? '🟢 API接続中' : '🔴 API未接続'}
              </span>
            )}
          </div>
        </div>
      </header>

      {backendOnline === false && (
        <div className="bg-red-100 text-red-800 p-4 mx-4 mt-4 rounded-xl border border-red-200">
          <strong>⚠️ バックエンドAPIに接続できません。</strong>
          <p className="text-sm mt-1">Cloud Run のバックエンドが起動しているか、<code className="bg-red-200 px-1 rounded">VITE_API_BASE_URL</code> が正しく設定されているか確認してください。</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 text-red-800 p-4 mx-4 mt-4 rounded-xl border border-red-200">
          <strong>エラー:</strong> {error}
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden h-[calc(100vh-80px)]">
        <div className="w-full lg:w-[450px] flex-shrink-0 h-full overflow-y-auto pr-2">
          <InputForm onOptimize={handleOptimize} isLoading={isLoading} />
        </div>

        <div className="flex-1 flex flex-col h-full gap-4 overflow-y-auto pr-2">
          <div className="h-[400px] lg:h-[50%] flex-shrink-0">
            <MapView result={result} apiKey={MAPS_API_KEY} />
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResultPanel result={result} />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t px-6 py-3 text-center text-xs text-slate-400">
        車割りオプティマイザー — APIキーはサーバー側で安全に管理されています
      </footer>
    </div>
  );
}

export default App;
