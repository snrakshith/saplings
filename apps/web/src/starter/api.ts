import { useEffect, useState } from 'react';

export type Capability = { id: string; title: string; description: string };
export type CatalogEntry = { featureId: string; kind: string; actions: string[]; note: string };

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error ?? 'The starter API returned HTTP ' + response.status);
  }
  return response.json();
}

export function post<T>(path: string, payload: unknown, headers: Record<string, string> = {}) {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
}

export function useStarterFetch<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    request<T>(path, { signal: controller.signal }).then(setData, (error: unknown) => {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : 'Could not connect to the starter API.');
    });
    return () => controller.abort();
  }, [path]);
  return { data, error };
}
