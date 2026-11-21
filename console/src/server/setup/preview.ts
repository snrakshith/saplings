import { createSapling } from '@saplings/sdk';
import type { DomainId, PreviewResult, SetupValues } from '../../onboarding.js';
import { InputError } from '../input.js';

export async function previewSetup(
  id: DomainId,
  tenantId: string,
  values: SetupValues,
): Promise<PreviewResult> {
  if (id !== 'flags' && id !== 'analytics')
    throw new InputError('This setup is verified in your staging app.');
  const sdk = createSapling({ app: { id: 'console-onboarding', environment: 'test' } });
  const ctx = { tenantId, actorId: 'console-preview', permissions: ['flags:write'] };
  if (id === 'flags') {
    const { flag, enabled, rollout, subject } = values;
    await sdk.flags.set(ctx, {
      key: String(flag),
      enabled: enabled === true,
      rollout: Number(rollout),
    });
    return sdk.flags.evaluate(ctx, String(flag), String(subject));
  }
  await sdk.analytics.track(ctx, { name: values.event, subjectId: values.subject });
  const { total } = await sdk.analytics.count(ctx, { name: values.event });
  return { count: total };
}
