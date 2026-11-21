import type { ConsoleStore } from '../store.js';
import { parseSampleManifest, type SampleManifest } from './manifest.js';

export function sampleDiscovery(store: ConsoleStore, port: number) {
  const url = 'http://127.0.0.1:' + port + '/.well-known/saplings-console.json';
  let pending: Promise<void> | undefined;

  async function sync() {
    let manifest: SampleManifest;
    try {
      const response = await fetch(url, {
        redirect: 'error',
        signal: AbortSignal.timeout(1200),
        headers: { 'Accept-Encoding': 'identity' },
      });
      const size = Number(response.headers.get('content-length'));
      if (
        !response.ok ||
        !response.headers.get('content-type')?.startsWith('application/json') ||
        response.headers.has('content-encoding') ||
        !Number.isSafeInteger(size) ||
        size < 1 ||
        size > 64 * 1024
      ) {
        await response.body?.cancel();
        return;
      }
      manifest = parseSampleManifest(await response.json());
    } catch {
      // The console can run while the sample is stopped, starting, or changing configuration.
      return;
    }
    store.syncSample(manifest);
  }

  return () => {
    pending ??= sync().finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
