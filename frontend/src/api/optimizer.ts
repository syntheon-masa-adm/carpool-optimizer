import { OptimizeRequest, OptimizeResponse } from '../types';

export async function optimize(request: OptimizeRequest): Promise<OptimizeResponse> {
  const response = await fetch('/api/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
