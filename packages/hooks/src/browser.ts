'use client';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { useEvent } from './state.js';
export function useMediaQuery(query: string, serverValue = false) {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    [query],
  );
  const read = useCallback(
    () =>
      typeof window === 'undefined' || !window.matchMedia
        ? serverValue
        : window.matchMedia(query).matches,
    [query, serverValue],
  );
  return useSyncExternalStore(subscribe, read, () => serverValue);
}
const subscribeOnline = (cb: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeOnline,
    () =>
      typeof window === 'undefined' || typeof navigator === 'undefined' ? true : navigator.onLine,
    () => true,
  );
}
const subscribeVisibility = (cb: () => void) => {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
};
export function useDocumentVisible() {
  return useSyncExternalStore(
    subscribeVisibility,
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
    () => true,
  );
}
export function useWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
) {
  const event = useEvent(handler);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener(type, event, options);
    return () => window.removeEventListener(type, event, options);
  }, [type, event, options]);
}
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: PointerEvent) => void,
  enabled = true,
) {
  const event = useEvent(handler);
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const listener = (e: PointerEvent) => {
      const node = ref.current;
      if (
        node &&
        e.target instanceof Node &&
        !e.composedPath().includes(node) &&
        !node.contains(e.target)
      )
        event(e);
    };
    document.addEventListener('pointerdown', listener, true);
    return () => document.removeEventListener('pointerdown', listener, true);
  }, [ref, event, enabled]);
}
export function useKeyPress(key: string, handler: (event: KeyboardEvent) => void, enabled = true) {
  useWindowEvent('keydown', (e) => {
    if (enabled && e.key === key) handler(e);
  });
}
/** Callback ref supports a target that mounts or changes after the first render. */
export function useIntersection<T extends Element>(options: IntersectionObserverInit = {}) {
  const [target, ref] = useState<T | null>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | undefined>(undefined);
  const { root, rootMargin } = options;
  const threshold = JSON.stringify(options.threshold ?? 0);
  useEffect(() => {
    setEntry(undefined);
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => setEntry(entries[0]), {
      root,
      rootMargin,
      threshold: JSON.parse(threshold),
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [target, root, rootMargin, threshold]);
  return { ref, entry, visible: entry?.isIntersecting ?? false };
}
export function useElementSize<T extends Element>() {
  const [target, ref] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!target) {
      setSize({ width: 0, height: 0 });
      return;
    }
    const read = () => {
      const r = target.getBoundingClientRect();
      setSize((old) =>
        old.width === r.width && old.height === r.height
          ? old
          : { width: r.width, height: r.height },
      );
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(read);
    observer.observe(target);
    return () => observer.disconnect();
  }, [target]);
  return { ref, ...size };
}
export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    setCopied(false);
    if (typeof navigator === 'undefined' || !navigator.clipboard)
      throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }, []);
  return { copied, copy, reset: () => setCopied(false) };
}
export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  return size;
}
