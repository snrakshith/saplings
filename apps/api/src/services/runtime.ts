import { createMiner, type MinerStore } from '@saplings/miner';
import {
  createRemoteConfig,
  type ConfigStore,
  type Definition,
  type ReviewPolicy,
} from '@saplings/remote-config';
import { project, tenant } from '../sapling.config.js';

const text = (value: unknown) => typeof value === 'string' && value.length <= 120;
const definitions = {
  welcome: {
    audience: 'public',
    validate: (value) => Object.keys(value).length === 1 && text(value.message),
  },
  workspace: {
    audience: 'signed-in',
    validate: (value) => Object.keys(value).length === 1 && text(value.message),
  },
} satisfies Record<string, Definition>;

export const publicTenantId = 'public-' + project.id;
export const starterScope = {
  projectId: project.id,
  environment: 'development',
  tenantId: tenant.id,
} as const;

export function createServices(
  store: ConfigStore & MinerStore,
  options: { reviewPolicy?: ReviewPolicy } = {},
) {
  return {
    definitions,
    config: createRemoteConfig({
      store,
      definitions,
      publicTenantId,
      reviewPolicy: options.reviewPolicy,
    }),
    miner: createMiner({
      store,
      schemas: {
        'starter.viewed': { page: 'string' },
        'starter.completed': {},
        'starter.backend': {},
      },
    }),
  };
}
export type Services = ReturnType<typeof createServices>;
