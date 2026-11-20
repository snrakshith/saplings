'use client';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
/** Stable callback identity, always invokes the most recently committed callback. */
export function useEvent<A extends unknown[], R>(callback: (...args: A) => R): (...args: A) => R {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  }, [callback]);
  return useCallback((...args: A) => ref.current(...args), []);
}
export function useToggle(initial = false) {
  const [value, set] = useState(initial);
  return {
    value,
    set,
    toggle: useCallback(() => set((v) => !v), []),
    on: useCallback(() => set(true), []),
    off: useCallback(() => set(false), []),
  };
}
export function useCounter(initial = 0) {
  const [value, set] = useState(initial);
  return {
    value,
    set,
    increment: useCallback((n = 1) => set((v) => v + n), []),
    decrement: useCallback((n = 1) => set((v) => v - n), []),
    reset: useCallback(() => set(initial), [initial]),
  };
}
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, set] = useState<T>(() => value);
  useEffect(() => {
    const t = setTimeout(() => set(() => value), Math.max(0, delayMs));
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs = 300,
) {
  const event = useEvent(callback);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const args = useRef<A | undefined>(undefined);
  const cancel = useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    args.current = undefined;
  }, []);
  const flush = useCallback(() => {
    const pending = args.current;
    cancel();
    if (pending) event(...pending);
  }, [cancel, event]);
  const run = useCallback(
    (...next: A) => {
      cancel();
      args.current = next;
      timer.current = setTimeout(flush, Math.max(0, delayMs));
    },
    [cancel, flush, delayMs],
  );
  useEffect(() => cancel, [cancel, delayMs]);
  return { run, cancel, flush };
}
export function useInterval(callback: () => void, delayMs: number | null) {
  const event = useEvent(callback);
  useEffect(() => {
    if (delayMs === null) return;
    const timer = setInterval(event, Math.max(1, delayMs));
    return () => clearInterval(timer);
  }, [event, delayMs]);
}
export function useTimeout(callback: () => void, delayMs: number | null) {
  const event = useEvent(callback);
  useEffect(() => {
    if (delayMs === null) return;
    const timer = setTimeout(event, Math.max(0, delayMs));
    return () => clearTimeout(timer);
  }, [event, delayMs]);
}
export function useDisclosure(initial = false) {
  const { value, on, off, toggle } = useToggle(initial);
  return { isOpen: value, open: on, close: off, toggle };
}
export function useList<T>(initial: readonly T[] = []) {
  const [items, setItems] = useState<T[]>(() => [...initial]);
  return {
    items,
    setItems,
    append: useCallback((item: T) => setItems((v) => [...v, item]), []),
    removeAt: useCallback((index: number) => setItems((v) => v.filter((_, i) => i !== index)), []),
    updateAt: useCallback(
      (index: number, item: T) => setItems((v) => v.map((old, i) => (i === index ? item : old))),
      [],
    ),
    clear: useCallback(() => setItems([]), []),
  };
}
export function usePagination(total: number, pageSize = 20, initialPage = 1) {
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    !Number.isSafeInteger(initialPage)
  )
    throw new RangeError('Invalid pagination');
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const [requested, setRequested] = useState(initialPage);
  const clamp = (p: number) => Math.min(pageCount, Math.max(1, p));
  const page = clamp(requested);
  const setPage = useCallback(
    (p: number) => {
      if (!Number.isSafeInteger(p)) throw new RangeError('Invalid page');
      setRequested(Math.min(pageCount, Math.max(1, p)));
    },
    [pageCount],
  );
  useEffect(() => {
    setRequested((p) => Math.min(pageCount, Math.max(1, p)));
  }, [pageCount]);
  return {
    page,
    pageCount,
    pageSize,
    offset: (page - 1) * pageSize,
    hasNext: page < pageCount,
    hasPrevious: page > 1,
    setPage,
    next: () => setPage(page + 1),
    previous: () => setPage(page - 1),
  };
}
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
export function useSelection<T>(initial: readonly T[] = []) {
  const [selected, setSelected] = useState<ReadonlySet<T>>(() => new Set(initial));
  const toggle = useCallback(
    (value: T) =>
      setSelected((old) => {
        const next = new Set(old);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      }),
    [],
  );
  return useMemo(
    () => ({
      selected,
      toggle,
      clear: () => setSelected(new Set<T>()),
      has: (value: T) => selected.has(value),
    }),
    [selected, toggle],
  );
}
