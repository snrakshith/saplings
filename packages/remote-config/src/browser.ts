import type { Document } from './types.js';

/** One reader per authenticated scope. Call reset on logout or scope change. */
export function createConfigReader<T extends Document>(
  url: string,
  fallback: T,
  settings: { refreshMs?: number; fetch?: typeof fetch } = {},
) {
  const request = settings.fetch ?? fetch;
  let cached: { value: T; etag: string | null } | undefined;
  let nextRead = 0;
  let generation = 0;
  return {
    reset() {
      generation++;
      cached = undefined;
      nextRead = 0;
    },
    async read(time = Date.now(), { force = false } = {}): Promise<T> {
      if (!force && time < nextRead) return cached?.value ?? fallback;
      const started = ++generation;
      try {
        const response = await request(url, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: cached?.etag ? { 'If-None-Match': cached.etag } : {},
        });
        if (started !== generation) return cached?.value ?? fallback;
        if ([401, 403, 404].includes(response.status)) cached = undefined;
        else if (response.ok) {
          const payload = (await response.json()) as { value: T };
          if (started !== generation) return cached?.value ?? fallback;
          cached = { value: payload.value, etag: response.headers.get('etag') };
        }
        nextRead = time + (settings.refreshMs ?? 30_000);
      } catch {
        if (started === generation) nextRead = time + (settings.refreshMs ?? 30_000);
      }
      return cached?.value ?? fallback;
    },
  };
}
