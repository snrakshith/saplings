import { Gateway, type GatewayConfig } from '@saplings/harbor';
import { project } from '../config/sapling.js';
import type { StarterTelemetry } from '../deployment/telemetry.js';
import { RequestError } from '../services/auth.js';

export const sdkCatalogPath = '/api/starter/catalog';
export const internalCatalogPath = '/internal' + sdkCatalogPath;

export async function openCatalogGateway(apiPort: number, telemetry: StarterTelemetry) {
  const target = '127.0.0.1:' + apiPort;
  const config: GatewayConfig = {
    apiVersion: 'gateway.sapling.dev/v1alpha1',
    kind: 'GatewayConfig',
    metadata: { name: project.id + '-catalog', environment: 'production' },
    spec: {
      upstreams: [{ name: 'starter', targets: [{ target }] }],
      services: [
        {
          name: 'catalog',
          upstream: 'starter',
          path: '/internal',
          routes: [
            { name: 'sdk-catalog', paths: [sdkCatalogPath], pathMatch: 'exact', methods: ['GET'] },
          ],
        },
      ],
    },
  };
  const gateway = new Gateway(config, {
    allowedUpstreamHosts: [target],
    tlsTerminatedByTrustedProxy: true,
    trustProxy: true,
    trustedProxyCidrs: ['127.0.0.1/32'],
    onEvent: (event) =>
      telemetry.log({
        level: 'info',
        event: 'starter.harbor.request',
        fields: { route: event.route, status: event.status, duration_ms: event.latencyMs },
      }),
  });
  try {
    const port = await gateway.listen(0, '127.0.0.1');
    return {
      close: () => gateway.close(),
      async read() {
        // The HTTPS edge terminates TLS before the app. Only the app can reach this loopback listener.
        const response = await fetch('http://127.0.0.1:' + port + sdkCatalogPath, {
          headers: { 'x-forwarded-proto': 'https' },
          signal: AbortSignal.timeout(4000),
        });
        if (!response.ok) throw new RequestError('The SDK gateway is unavailable.', 502);
        return response.json();
      },
    };
  } catch (error) {
    await gateway.close();
    throw error;
  }
}
