import type { Actor, Properties, Scope, Window } from './types.js';

export const day = 86_400_000;
export class MinerError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
export function reject(message: string, status = 400): never {
  throw new MinerError(message, status);
}
export function key(value: unknown) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value))
    return reject('Invalid Miner identifier.');
  return value;
}
export function collection(scope: Scope, section: string) {
  key(scope.tenantId);
  key(scope.projectId);
  if (!['development', 'staging', 'production'].includes(scope.environment))
    return reject('Invalid environment.');
  return 'miner:' + section + ':' + JSON.stringify([scope.projectId, scope.environment]);
}
export function permission(actor: Actor, name: string) {
  if (!actor.subject.startsWith('u:') || !actor.permissions?.includes(name))
    reject('Miner permission denied.', 403);
  key(actor.subject);
}
export function props(input: unknown): Properties {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return reject('Properties must be an object.');
  const entries = Object.entries(input);
  if (entries.length > 32) return reject('Too many event properties.');
  for (const [name, value] of entries) {
    key(name);
    if (
      ['constructor', 'prototype', '__proto__'].includes(name) ||
      !(
        value === null ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value)) ||
        (typeof value === 'string' && value.length <= 512)
      )
    )
      return reject('Invalid event property.');
  }
  return Object.fromEntries(entries);
}
export function window(range: Window, days: number) {
  if (
    !Number.isSafeInteger(range.from) ||
    !Number.isSafeInteger(range.to) ||
    range.from < 0 ||
    range.from >= range.to ||
    range.to - range.from > days * day
  )
    return reject('Invalid report window.');
  return range;
}
export function percentage(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
    return reject('A percentage must be between zero and 100.');
  return value;
}
