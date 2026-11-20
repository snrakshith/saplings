'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEvent } from './state.js';
export type AsyncState<T> =
  | { status: 'idle' | 'pending' | 'cancelled'; data?: T; error?: never }
  | { status: 'success'; data: T; error?: never }
  | { status: 'error'; data?: T; error: unknown };
/** Last invocation wins. Caller receives rejected errors; aborted/stale results never update state. */
export function useAsync<T, A extends unknown[]>(
  operation: (signal: AbortSignal, ...args: A) => Promise<T>,
) {
  const task = useEvent(operation);
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });
  const active = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
      active.current = undefined;
    };
  }, []);
  const cancel = useCallback(() => {
    active.current?.abort();
    active.current = undefined;
    if (mounted.current) setState({ status: 'cancelled' });
  }, []);
  const reset = useCallback(() => {
    active.current?.abort();
    active.current = undefined;
    if (mounted.current) setState({ status: 'idle' });
  }, []);
  const run = useCallback(
    async (...args: A): Promise<T> => {
      if (!mounted.current) throw new Error('Component unmounted');
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      setState({ status: 'pending' });
      try {
        const data = await task(controller.signal, ...args);
        if (active.current === controller && mounted.current && !controller.signal.aborted)
          setState({ status: 'success', data });
        return data;
      } catch (error) {
        if (active.current === controller && mounted.current && !controller.signal.aborted)
          setState({ status: 'error', error });
        throw error;
      } finally {
        if (active.current === controller) active.current = undefined;
      }
    },
    [task],
  );
  return { state, run, cancel, reset };
}
export interface FetchOptions<T> {
  request?: RequestInit;
  parse: (response: Response) => Promise<T>;
}
/** Explicit execution; does not infer trust or response types from JSON. */
export function useFetch<T>(options: FetchOptions<T>) {
  return useAsync(async (signal: AbortSignal, url: string | URL, override?: RequestInit) => {
    const res = await fetch(url, { ...options.request, ...override, signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return options.parse(res);
  });
}
