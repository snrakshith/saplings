import { createSapling, Gateway } from '@saplings/sdk';

import { setup, tenant } from '../sapling.config.js';
import { commerce } from './commerce.js';
import { foundation } from './foundation.js';
import { operations } from './operations.js';
import { starterRuntimeConfig, type StarterRuntime } from './runtime.js';

export const checks = { ...foundation, ...commerce, ...operations };

export const platformChecks = {
  kingsman: {
    title: 'Kingsman identity',
    description: 'Read the configured OIDC issuer, JWKS, and registered client.',
  },
  harbor: {
    title: 'Harbor routing',
    description: 'Send a real request through Harbor to the starter API on loopback.',
  },
};

export const capabilities = [
  ...Object.entries(platformChecks).map(([id, detail]) => ({ id, ...detail })),
  ...Object.entries(checks).map(([id, { title, description }]) => ({ id, title, description })),
];

const checkContext = {
  tenantId: tenant.id,
  actorId: 'starter-check',
  permissions: [
    'workspaces:write',
    'projects:write',
    'flags:write',
    'storage:write',
    'storage:read',
    'payments:write',
    'plans:write',
    'billing:write',
    'billing:meter',
    'billing:read',
    'provider-operations:' + setup.operations.operation + ':submit',
    'provider-operations:' + setup.operations.operation + ':reconcile',
  ],
};

export async function runStarterCheck(id: string, runtime: StarterRuntime) {
  if (id === 'kingsman') {
    const identity = runtime.sdk.kingsman;
    if (!identity) throw new Error('The starter realm is unavailable.');
    return {
      issuer: identity.discovery().issuer,
      signingKeys: identity.jwks().keys.length,
      clients: identity.config.spec.clients.map((client) => client.clientId),
    };
  }
  const config = starterRuntimeConfig(runtime.apiPort);
  if (id === 'harbor') {
    const { config: gatewayConfig, dependencies } = config.platforms.harbor;
    const gateway = new Gateway(gatewayConfig, dependencies);
    const port = await gateway.listen(0, '127.0.0.1');
    try {
      const reply = await fetch('http://127.0.0.1:' + port + '/api/items', {
        signal: AbortSignal.timeout(3000),
      });
      if (!reply.ok) throw new Error('The route returned HTTP ' + reply.status);
      const { items } = (await reply.json()) as { items: unknown[] };
      return { route: '/api/items', status: reply.status, items: items.length };
    } finally {
      await gateway.close();
    }
  }
  if (!Object.hasOwn(checks, id)) return;
  const check = checks[id as keyof typeof checks];
  const sdk = createSapling({ ...config, platforms: undefined });
  return check.run(sdk, checkContext);
}
