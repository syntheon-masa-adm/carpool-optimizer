import type { OptimizeRequest, OptimizeResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function optimize(request: OptimizeRequest): Promise<OptimizeResponse> {
  const res = await fetch(`${API_BASE_URL}/api/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(error.detail || `サーバーエラー (${res.status})`);
  }

  return res.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
