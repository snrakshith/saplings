import type { ConfigPair, Project, TenantSummary } from '../../contracts.js';
import { domainId, type DomainId, type SetupValues } from '../../onboarding.js';
import { InputError, object, record } from '../input.js';
import { setupValues } from '../setup/values.js';
import { validatePair } from '../tenants/platform-config.js';

export interface SampleManifest {
  project: Project;
  tenant: TenantSummary;
  config: ConfigPair;
  setup: Partial<Record<DomainId, SetupValues>>;
}

export function parseSampleManifest(input: unknown): SampleManifest {
  const manifest = object(input);
  const project = record(object(manifest.project));
  const tenant = record(object(manifest.tenant));
  if (manifest.version !== 1 || project.id !== 'sapling-fullstack-demo')
    throw new InputError('Unrecognized sample app manifest.');
  const domains = Object.entries(object(manifest.setup)).map(([domain, values]) => {
    if (!domainId(domain)) throw new InputError('Unrecognized sample setup area.');
    return [domain, setupValues(domain, values)] as const;
  });
  return {
    project,
    tenant,
    config: validatePair(manifest.config),
    setup: Object.fromEntries(domains),
  };
}
