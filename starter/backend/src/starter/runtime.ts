import { createSapling, type Store } from '@saplings/sdk';

import { project, starterConfig, setup, tenant } from '../config/sapling.js';
import { localNotifications, localOperation, localPayments } from './local-adapters.js';

export function starterRuntimeConfig(port: number, store?: Store) {
  const config = starterConfig(port);
  return {
    ...config,
    providers: { store, notifications: localNotifications, payments: localPayments },
    services: {
      ...config.services,
      providerOperations: { [setup.operations.operation]: localOperation },
    },
  };
}

export async function startStarterSdk(port: number, store: Store) {
  const config = starterRuntimeConfig(port, store);
  const sdk = createSapling(config);
  const context = {
    tenantId: tenant.id,
    actorId: 'starter-app',
    permissions: ['flags:write'],
  };
  const { flag, enabled, rollout } = setup.flags;
  await sdk.flags.set(context, { key: flag, enabled, rollout });
  await sdk.analytics.track(context, {
    name: setup.analytics.event,
    subjectId: setup.analytics.subject,
  });
  return {
    sdk,
    apiPort: port,
    context,
    manifest: {
      kind: 'saplings.starter',
      version: 1,
      project,
      tenant,
      config: {
        kingsman: config.platforms.kingsman.config,
        harbor: config.platforms.harbor.config,
      },
      setup,
    },
  };
}

export type StarterRuntime = Awaited<ReturnType<typeof startStarterSdk>>;
