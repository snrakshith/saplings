import type { Document, JsonValue, Scope } from './types.js';

export class ConfigError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function scopedKey(scope: Scope, key: string) {
  const id = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/;
  if (
    !id.test(scope.projectId) ||
    !id.test(scope.tenantId) ||
    !id.test(key) ||
    !['development', 'staging', 'production'].includes(scope.environment)
  )
    throw new ConfigError('Invalid config scope or key.');
  return JSON.stringify([scope.projectId, scope.environment, key]);
}

export function document(value: unknown): Document {
  function validate(entry: unknown, depth: number): entry is JsonValue {
    if (depth > 16) return false;
    if (entry === null || typeof entry === 'boolean' || typeof entry === 'string') return true;
    if (typeof entry === 'number') return Number.isFinite(entry);
    if (Array.isArray(entry)) return entry.every((item) => validate(item, depth + 1));
    if (
      !entry ||
      typeof entry !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(entry))
    )
      return false;
    return Object.entries(entry).every(
      ([key, item]) =>
        !['__proto__', 'constructor', 'prototype'].includes(key) && validate(item, depth + 1),
    );
  }
  if (!value || Array.isArray(value) || typeof value !== 'object' || !validate(value, 0))
    throw new ConfigError('Expected a plain JSON object with at most 16 nested levels.');
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized) > 64 * 1024)
    throw new ConfigError('Config exceeds 64 KiB.', 413);
  return JSON.parse(serialized) as Document;
}
