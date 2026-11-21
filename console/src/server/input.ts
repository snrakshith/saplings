import type { Project } from '../contracts.js';

export class InputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InputError('Expected a JSON object.');
  return value as Record<string, unknown>;
}

export function record(value: Record<string, unknown>): Project {
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(id))
    throw new InputError('Use 1–40 lowercase letters, numbers, or hyphens for the key.');
  if (!name || name.length > 100) throw new InputError('Enter a name of up to 100 characters.');
  return { id, name };
}
