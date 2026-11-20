import { context, isSpanContextValid, trace } from '@opentelemetry/api';
import { stdout } from 'node:process';

const priorities = { debug: 10, info: 20, warn: 30, error: 40 };
const credentialKeys = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'password',
  'passwordHash',
  'passphrase',
  'secret',
  'clientSecret',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'sessionToken',
  'apiKey',
  'x-api-key',
  'privateKey',
  'otp',
];
const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

export type LogLevel = keyof typeof priorities;
export interface LogEvent {
  level: LogLevel;
  event: string;
  at?: string;
  fields?: Record<string, unknown>;
}
export interface LoggerOptions {
  serviceName: string;
  minLevel?: LogLevel;
  redactKeys?: readonly string[];
  write?: (line: string) => void | Promise<void>;
}

function sanitizeFields(fields: Record<string, unknown>, redact: Set<string>) {
  let remaining = 200;
  const ancestors = new WeakSet<object>();
  function copy(value: unknown, depth: number): unknown {
    if (remaining-- <= 0 || depth > 6) return '[Truncated]';
    if (typeof value === 'string') return value.slice(0, 2048);
    if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return String(value);
    if (typeof value !== 'object') return undefined;

    if (ancestors.has(value)) return '[Circular]';
    const isArray = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (!isArray && prototype !== Object.prototype && prototype !== null) return '[Unsupported]';

    ancestors.add(value);
    const result = isArray ? [] : Object.create(null);
    const keys = isArray
      ? Array.from({ length: Math.min(value.length, 50) }, (_, index) => String(index))
      : Object.keys(value).slice(0, 50);
    for (const key of keys) {
      if (remaining <= 0) break;
      if (key.length > 128) continue;
      const property = Object.getOwnPropertyDescriptor(value, key);
      if (property && 'value' in property) {
        if (redact.has(normalizeKey(key))) {
          remaining--;
          result[key] = '[Redacted]';
        } else result[key] = copy(property.value, depth + 1);
      }
    }
    ancestors.delete(value);
    return result;
  }
  return copy(fields, 0);
}

export function createLogger({
  serviceName,
  minLevel = 'info',
  redactKeys = [],
  write = (line) => {
    stdout.write(line);
  },
}: LoggerOptions) {
  const service = serviceName.trim();
  if (!service || service.length > 128)
    throw new Error('Provide a service name of 1 to 128 characters');
  const redact = new Set([...credentialKeys, ...redactKeys].map(normalizeKey));

  return async function log({ level, event, at, fields }: LogEvent): Promise<void> {
    if (!Object.hasOwn(priorities, level) || priorities[level] < priorities[minLevel]) return;
    try {
      const span = trace.getSpanContext(context.active());
      const traceFields =
        span && isSpanContextValid(span) ? { trace_id: span.traceId, span_id: span.spanId } : {};
      await write(
        JSON.stringify({
          at: at ?? new Date().toISOString(),
          level,
          service,
          event: event.slice(0, 128),
          ...traceFields,
          ...(fields && { fields: sanitizeFields(fields, redact) }),
        }) + '\n',
      );
    } catch {
      // A failed sink or unserializable optional field must not fail application work.
    }
  };
}
