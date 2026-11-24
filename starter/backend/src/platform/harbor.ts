import { Gateway } from '@saplings/harbor';
import { catalogGatewayConfig, sdkCatalogPath } from '../config/harbor.js';
import type { StarterTelemetry } from '../deployment/telemetry.js';
import { RequestError } from '../services/auth.js';

export async function openCatalogGateway(apiPort: number, telemetry: StarterTelemetry) {
  const { config, dependencies } = await catalogGatewayConfig(apiPort);
  const gateway = new Gateway(config, {
    ...dependencies,
    onEvent: (event) =>
      telemetry.log({
        level: 'info',
        event: 'starter.harbor.request',
        fields: { route: event.route, status: event.status, duration_ms: event.latencyMs },
      }),
  });
  try {
    const port = await gateway.listen(0, '127.0.0.1');
    async function read() {
      // The HTTPS edge terminates TLS before the app. Only the app can reach this loopback listener.
      const response = await fetch('http://127.0.0.1:' + port + sdkCatalogPath, {
        headers: { 'x-forwarded-proto': 'https' },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new RequestError('The SDK gateway is unavailable.', 502);
      const manifest: unknown = await response.json();
      if (!Array.isArray(manifest))
        throw new RequestError('Expected the SDK catalog from Harbor.', 502);
      return manifest;
    }
    // The configured route must reach the catalog before the API reports readiness.
    await read();
    return { close: () => gateway.close(), read };
  } catch (error) {
    await gateway.close();
    throw error;
  }
}
