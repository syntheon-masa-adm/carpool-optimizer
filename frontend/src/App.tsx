import { useState, useRef, useCallback } from 'react';
import type { OptimizeRequest, OptimizeResponse } from './types';
import { InputForm } from './components/InputForm';
import { MapView } from './components/MapView';
import { ResultPanel } from './components/ResultPanel';
import { optimizeClientSide } from './lib/optimizer';

const STORAGE_KEY = 'carpool_optimizer_api_key';

function App() {
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [showApiKeyForm, setShowApiKeyForm] = useState(!apiKey);
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      setApiKey(trimmed);
      localStorage.setItem(STORAGE_KEY, trimmed);
      setShowApiKeyForm(false);
    }
  };

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleOptimize = async (request: OptimizeRequest) => {
    if (!apiKey) {
      setError('Google Maps API Key を設定してください');
      setShowApiKeyForm(true);
      return;
    }
    if (!mapRef.current) {
      setError('地図の読み込みを待っています。少々お待ちください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress('');
    try {
      const data = await optimizeClientSide(
        request,
        mapRef.current,
        (step) => setProgress(step)
      );
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '最適化処理中にエラーが発生しました';
      setError(message);
    } finally {
      setIsLoading(false);
      setProgress('');
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
          <button
            onClick={() => setShowApiKeyForm(!showApiKeyForm)}
            className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg"
          >
            🔑 APIキー設定
          </button>
        </div>
      </header>

      {showApiKeyForm && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="max-w-2xl mx-auto">
            <p className="text-blue-800 text-sm font-bold mb-2">
              🔑 Google Maps API Key を入力してください
            </p>
            <p className="text-blue-600 text-xs mb-3">
              Google Cloud Console で Geocoding API, Places API, Distance Matrix API, Directions API, Maps JavaScript API を有効化したキーが必要です。
              キーはブラウザのローカルストレージに保存されます。
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIza..."
                className="flex-1 border border-blue-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveApiKey}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {!apiKey && !showApiKeyForm && (
        <div className="bg-yellow-100 text-yellow-800 p-2 text-center text-sm font-bold">
          ⚠️ API Key が設定されていません。右上の「APIキー設定」から設定してください。
        </div>
      )}

      {error && (
        <div className="bg-red-100 text-red-800 p-4 m-4 rounded-xl border border-red-200">
          <strong>エラー:</strong> {error}
        </div>
      )}

      {isLoading && progress && (
        <div className="bg-indigo-100 text-indigo-800 p-3 mx-4 mt-4 rounded-xl border border-indigo-200 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-medium">{progress}</span>
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <div className="w-full lg:w-[450px] flex-shrink-0 h-full overflow-y-auto pr-2">
          <InputForm onOptimize={handleOptimize} isLoading={isLoading} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full gap-4 overflow-y-auto pr-2">
          <div className="h-[400px] lg:h-[50%] flex-shrink-0">
            <MapView result={result} apiKey={apiKey} onMapReady={handleMapReady} />
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResultPanel result={result} />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t px-6 py-3 text-center text-xs text-slate-400">
        車割りオプティマイザー — 全ての計算はブラウザ内で完結します。サーバーにデータは送信されません。
      </footer>
    </div>
  );
}

export default App;
