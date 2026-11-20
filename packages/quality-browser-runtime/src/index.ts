/** Browser-side real-user diagnostics; call this from your app entry point. */
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
export interface BrowserTelemetryEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}
declare global {
  interface Window {
    __SAPLING_QUALITY_EVENTS__?: BrowserTelemetryEvent[];
  }
}
export function startFrontendObservability(
  options: {
    endpoint?: string;
    sampleRate?: number;
    onEvent?: (event: BrowserTelemetryEvent) => void;
  } = {},
) {
  if (typeof window === 'undefined') return () => {};
  if (Math.random() > (options.sampleRate ?? 1)) return () => {};
  let active = true;
  const deliver = (type: string, data: Record<string, unknown>) => {
    if (!active) return;
    const event: BrowserTelemetryEvent = { type, timestamp: new Date().toISOString(), data };
    (window.__SAPLING_QUALITY_EVENTS__ ??= []).push(event);
    if (window.__SAPLING_QUALITY_EVENTS__!.length > 200) window.__SAPLING_QUALITY_EVENTS__!.shift();
    options.onEvent?.(event);
    if (options.endpoint) {
      const body = JSON.stringify(event);
      if (navigator.sendBeacon)
        navigator.sendBeacon(options.endpoint, new Blob([body], { type: 'application/json' }));
      else
        void fetch(options.endpoint, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {});
    }
  };
  const vitals = (m: Metric) =>
    deliver('web-vital', { name: m.name, value: m.value, rating: m.rating, id: m.id });
  onLCP(vitals);
  onINP(vitals);
  onCLS(vitals);
  const onError = (ev: ErrorEvent) =>
    deliver('error', { message: ev.message, filename: ev.filename, lineno: ev.lineno });
  const onReject = (ev: PromiseRejectionEvent) =>
    deliver('unhandledrejection', { reason: String(ev.reason) });
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onReject);
  deliver('telemetry-started', { path: location.pathname });
  return () => {
    active = false;
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onReject);
  };
}
