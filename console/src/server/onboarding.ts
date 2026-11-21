import { createSapling } from '@saplings/sdk';
import {
  domains,
  type DomainId,
  type PreviewResult,
  type SetupField,
  type SetupValue,
  type SetupValues,
} from '../onboarding.js';
import { InputError, object } from './config.js';

function validValue(field: SetupField, value: unknown): value is SetupValue {
  if (field.type === 'number') {
    return (
      typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      value >= field.min &&
      value <= field.max
    );
  }
  if (field.type === 'boolean') return typeof value === 'boolean';
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) return false;
  switch (field.type) {
    case 'choice':
      return field.options.includes(value);
    case 'key':
      return /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(value);
    case 'env':
      return /^[A-Z][A-Z0-9_]{0,99}$/.test(value);
    case 'text':
      return value.trim() === value && value.length <= 100 && !/[\u0000-\u001f\u007f]/.test(value);
    case 'url': {
      const url = URL.parse(value);
      return (
        url?.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.search
      );
    }
  }
}

export function setupValues(id: DomainId, input: unknown): SetupValues {
  const values = object(input);
  const { fields } = domains[id];
  if (Object.keys(values).length !== fields.length)
    throw new InputError('Provide the setup fields listed in the console.');
  const entries = fields.map((field) => {
    const value = values[field.key];
    if (!Object.hasOwn(values, field.key) || !validValue(field, value))
      throw new InputError('Check the value for ' + field.label + '.');
    return [field.key, value] as const;
  });
  return Object.fromEntries(entries);
}

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
