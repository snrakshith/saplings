import { useEffect } from 'react';
import { useAsync } from '@saplings/hooks';

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
  const { state, run, cancel } = useAsync((signal, url: string) => request<T>(url, { signal }));
  useEffect(() => {
    void run(path).catch(() => {});
    return cancel;
  }, [path, run, cancel]);
  return {
    data: state.data,
    error:
      state.status === 'error'
        ? state.error instanceof Error
          ? state.error.message
          : 'Could not connect to the Starter API.'
        : undefined,
  };
}
