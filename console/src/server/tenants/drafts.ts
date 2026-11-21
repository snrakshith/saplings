import { InputError, object, record } from '../input.js';
import type { ConsoleStore } from '../store.js';
import { importPair, validatePair } from './platform-config.js';
import { starterPair } from './starter-config.js';

export function createTenantDraft(store: ConsoleStore, projectId: string, input: unknown) {
  const project = store.project(projectId);
  const body = object(input);
  const tenant = record(body);
  if (body.mode !== 'new' && body.mode !== 'import')
    throw new InputError('Choose an onboarding mode.');
  const pair =
    body.mode === 'import'
      ? importPair(body.config)
      : starterPair(project, tenant, body.issuerBase);
  return store.addTenant(project.id, tenant, pair);
}

export function updateTenantDraft(
  store: ConsoleStore,
  projectId: string,
  tenantId: string,
  input: unknown,
) {
  const { revision, config } = object(input);
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1)
    throw new InputError('Provide the current draft revision.');
  return store.saveTenant(projectId, tenantId, revision, validatePair(config));
}
