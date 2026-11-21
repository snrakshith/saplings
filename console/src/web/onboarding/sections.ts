import type { DomainId } from '../../onboarding.js';

export const groups: { title: string; areas: DomainId[] }[] = [
  { title: 'Application foundation', areas: ['workspace', 'flags', 'analytics', 'storage'] },
  { title: 'Payments and billing', areas: ['payments', 'billing'] },
  {
    title: 'Operations and governance',
    areas: ['notifications', 'workflows', 'audit', 'governance', 'operations'],
  },
];
export const areas = groups.flatMap((group) => group.areas);
