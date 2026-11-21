import type { Properties } from './types.js';

export function createMinerClient(options: { base?: string; fetch?: typeof fetch } = {}) {
  const request = options.fetch ?? fetch;
  const base = options.base ?? '/api/miner';
  async function send<T>(path: string, payload: unknown, retry = false): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await request(base + path, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        if (retry && attempt < 2) continue;
        throw error;
      }
      if (response.ok) return response.json() as Promise<T>;
      if (retry && response.status >= 500 && attempt < 2) continue;
      throw new Error('Miner request returned HTTP ' + response.status);
    }
  }
  return {
    track(name: string, properties?: Properties, id = crypto.randomUUID()) {
      return send<{ duplicate: boolean }>(
        '/events',
        { id, name, properties, at: new Date().toISOString() },
        true,
      );
    },
    identify: () => send('/identify', {}),
    flag: (id: string) => send<{ enabled: boolean }>('/flags/' + encodeURIComponent(id), {}),
    assign: (id: string) =>
      send<{ variant: 'control' | 'treatment' } | null>(
        '/experiments/' + encodeURIComponent(id) + '/assignment',
        {},
      ),
    expose: (id: string, variant: 'control' | 'treatment') =>
      send('/experiments/' + encodeURIComponent(id) + '/exposure', { variant }, true),
  };
}
