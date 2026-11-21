import { domainId } from '../../onboarding.js';
import { InputError, object } from '../input.js';
import type { ConsoleStore } from '../store.js';
import { previewSetup } from './preview.js';
import { setupValues } from './values.js';

export function updateSetupDraft(
  store: ConsoleStore,
  projectId: string,
  tenantId: string,
  domain: string,
  input: unknown,
) {
  if (!domainId(domain)) throw new InputError('Setup area not found.', 404);
  const { revision, values } = object(input);
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0)
    throw new InputError('Provide the current setup revision.');
  return store.saveSetup(projectId, tenantId, domain, revision, setupValues(domain, values));
}

export function previewSetupDraft(
  store: ConsoleStore,
  projectId: string,
  tenantId: string,
  domain: string,
  input: unknown,
) {
  if (!domainId(domain)) throw new InputError('Setup area not found.', 404);
  store.tenant(projectId, tenantId);
  return previewSetup(domain, tenantId, setupValues(domain, input));
}
