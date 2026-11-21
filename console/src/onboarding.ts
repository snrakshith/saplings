import { commerce } from './onboarding/commerce.js';
import { foundation } from './onboarding/foundation.js';
import { operations } from './onboarding/operations.js';
import type { SetupValues } from './onboarding/types.js';

export type { SetupField, SetupValue, SetupValues } from './onboarding/types.js';

export const domains = { ...foundation, ...commerce, ...operations };

export type DomainId = keyof typeof domains;
export type SetupDraft = { revision: number; values: SetupValues };
export type TenantSetup = Partial<Record<DomainId, SetupDraft>>;
export type PreviewResult = { enabled: boolean; variant?: string } | { count: number };

export function domainId(value: string): value is DomainId {
  return Object.hasOwn(domains, value);
}
