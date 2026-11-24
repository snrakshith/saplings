import { loadGatewayConfig, type GatewayConfig, type GatewayDependencies } from '@saplings/harbor';
import { project, tenant } from './project.ts';

export const sdkCatalogPath = '/api/starter/catalog';
const upstreamPrefix = '/internal';
export const internalCatalogPath = upstreamPrefix + sdkCatalogPath;

export function gatewayConfig(apiPort: number, profile: 'local' | 'durable') {
  const durable = profile === 'durable';
  const target = '127.0.0.1:' + apiPort;
  const upstream = 'starter-api';
  return {
    config: {
      apiVersion: 'gateway.sapling.dev/v1alpha1',
      kind: 'GatewayConfig',
      metadata: {
        name: durable ? project.id + '-catalog' : project.id + '-' + tenant.id,
        workspace: project.id,
        environment: durable ? 'production' : 'development',
      },
      spec: {
        upstreams: [{ name: upstream, targets: [{ target }] }],
        services: [
          {
            name: upstream,
            upstream,
            protocol: 'http',
            ...(durable && { path: upstreamPrefix }),
            routes: durable
              ? [
                  {
                    name: 'sdk-catalog',
                    paths: [sdkCatalogPath],
                    pathMatch: 'exact',
                    methods: ['GET'],
                  },
                ]
              : [{ name: upstream, paths: ['/api'], pathMatch: 'prefix' }],
          },
        ],
      },
    } satisfies GatewayConfig,
    dependencies: {
      allowedUpstreamHosts: [target],
      ...(durable && {
        tlsTerminatedByTrustedProxy: true,
        trustProxy: true,
        trustedProxyCidrs: ['127.0.0.1/32'],
      }),
    } satisfies GatewayDependencies,
  };
}

export async function catalogGatewayConfig(apiPort: number) {
  const defaults = gatewayConfig(apiPort, 'durable');
  const path = process.env.SAPLINGS_HARBOR_CONFIG_FILE;
  if (!path) return defaults;
  const config = await loadGatewayConfig(path);
  if (config.metadata.environment !== 'production')
    throw new Error('The durable Harbor gateway requires production policy.');
  for (const upstream of config.spec.upstreams) {
    if (
      upstream.targets.some(
        ({ target }) => !defaults.dependencies.allowedUpstreamHosts.includes(target),
      )
    )
      throw new Error('Harbor targets must use the Starter API loopback address and bound port.');
  }
  return { config, dependencies: defaults.dependencies };
}
