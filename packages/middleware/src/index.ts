import { randomUUID, createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
export interface AsyncSchema {
  safeParseAsync(
    input: unknown,
  ): Promise<
    { success: true; data: unknown } | { success: false; error: { issues: readonly unknown[] } }
  >;
}
export interface Request extends IncomingMessage {
  body?: unknown;
  query?: unknown;
  params?: unknown;
  sapling?: {
    tenantId?: string;
    userId?: string;
    correlationId?: string;
    roles?: string[];
    permissions?: string[];
  };
  validated?: Record<string, unknown>;
  saplingSignal?: AbortSignal;
  file?: unknown;
  files?: unknown;
}
export type Next = (error?: unknown) => void;
export type Middleware = (req: Request, res: ServerResponse, next: Next) => void | Promise<void>;
export class HttpError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode = 400,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
export interface MiddlewareConfig {
  correlationId?: boolean;
  requestLogging?: boolean;
  timeoutMs?: number;
  log?: (event: {
    method: string;
    path: string;
    status: number;
    durationMs: number;
    correlationId: string;
  }) => void;
  onError?: (error: unknown, correlationId?: string) => void;
}
const json = (res: ServerResponse, status: number, body: unknown) => {
  if (res.headersSent || res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};
export function correlationId(): Middleware {
  return (req, res, next) => {
    const id = req.sapling?.correlationId ?? randomUUID();
    res.setHeader('X-Request-ID', id);
    next();
  };
}
export function requestLogger(log: NonNullable<MiddlewareConfig['log']>): Middleware {
  return (req, res, next) => {
    const start = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        log({
          method: req.method ?? '',
          path: (req.url ?? '').split('?')[0].slice(0, 512),
          status: res.statusCode,
          durationMs: performance.now() - start,
          correlationId: String(res.getHeader('X-Request-ID') ?? ''),
        });
      } catch {
        /* do not alter response */
      }
    };
    res.once('finish', finish);
    res.once('close', finish);
    next();
  };
}
/** Cooperative cancellation + response deadline. A timed out handler can still commit unless it honors the signal. */
export function requestTimeout(ms: number): Middleware {
  if (!Number.isSafeInteger(ms) || ms < 1 || ms > 3600000) throw Error('Invalid timeout');
  return (req, res, next) => {
    const controller = new AbortController();
    req.saplingSignal = controller.signal;
    const timer = setTimeout(() => {
      controller.abort(new Error('Request deadline exceeded'));
      if (res.headersSent) {
        if (!res.writableEnded) res.destroy();
      } else
        json(res, 504, {
          error: { code: 'REQUEST_TIMEOUT', message: 'Request deadline exceeded' },
        });
    }, ms);
    timer.unref();
    res.once('finish', () => clearTimeout(timer));
    res.once('close', () => {
      clearTimeout(timer);
      controller.abort();
    });
    next();
  };
}
export function requireAuth(): Middleware {
  return (req, _res, next) => {
    if (!req.sapling?.userId || !req.sapling?.tenantId)
      return next(new HttpError('UNAUTHENTICATED', 'Authentication required', 401));
    next();
  };
}
export function authorize(check: (req: Request) => boolean | Promise<boolean>): Middleware {
  return async (req, _res, next) => {
    try {
      if (!req.sapling?.tenantId || !req.sapling?.userId)
        throw new HttpError('UNAUTHENTICATED', 'Authentication required', 401);
      if (!(await check(req))) throw new HttpError('FORBIDDEN', 'Access denied', 403);
      next();
    } catch (e) {
      next(e);
    }
  };
}
export function requirePermissions(...permissions: string[]): Middleware {
  return authorize((req) => permissions.every((p) => req.sapling?.permissions?.includes(p)));
}
export function validate(
  schemas: Partial<Record<'body' | 'query' | 'params' | 'headers', AsyncSchema>>,
): Middleware {
  return async (req, _res, next) => {
    try {
      const parsed: Record<string, unknown> = {};
      for (const [key, schema] of Object.entries(schemas)) {
        if (!schema) continue;
        const r = await schema.safeParseAsync(req[key as keyof Request]);
        if (!r.success)
          throw new HttpError('VALIDATION_ERROR', 'Invalid request', 422, {
            target: key,
            issues: r.error.issues,
          });
        parsed[key] = r.data;
      }
      req.validated = parsed;
      next();
    } catch (e) {
      next(e);
    }
  };
}
export function requireContentType(...types: string[]): Middleware {
  return (req, _res, next) => {
    const type = String(req.headers['content-type'] ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!types.includes(type))
      return next(new HttpError('UNSUPPORTED_MEDIA_TYPE', 'Unsupported content type', 415));
    next();
  };
}
export function limitContentLength(max: number): Middleware {
  if (!Number.isSafeInteger(max) || max < 1) throw Error('Invalid byte limit');
  return (req, _res, next) => {
    const len = req.headers['content-length'];
    if (len !== undefined && (!/^\d+$/.test(len) || Number(len) > max))
      return next(new HttpError('PAYLOAD_TOO_LARGE', 'Request body too large', 413));
    next();
  };
}
export function asyncHandler(
  fn: (req: Request, res: ServerResponse, next: Next) => unknown | Promise<unknown>,
): Middleware {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (e) {
      next(e);
    }
  };
}
export function notFound(): Middleware {
  return (_req, _res, next) => next(new HttpError('NOT_FOUND', 'Resource not found', 404));
}
export function errorHandler(config: MiddlewareConfig = {}) {
  return (error: unknown, req: Request, res: ServerResponse, next: Next) => {
    if (res.headersSent || res.writableEnded) return next(error);
    const id = String(res.getHeader('X-Request-ID') ?? req.sapling?.correlationId ?? '');
    try {
      config.onError?.(error, id);
    } catch {}
    const e = error as { statusCode?: number; status?: number; code?: string; message?: string };
    const candidate =
      e?.code === 'LIMIT_FILE_SIZE'
        ? 413
        : e?.code?.startsWith('LIMIT_')
          ? 400
          : (e?.statusCode ?? e?.status ?? 500);
    const status =
      Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;
    const trusted = error instanceof HttpError;
    json(res, status, {
      error: {
        code: trusted ? error.code : status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message: status >= 500 ? 'Unexpected error' : trusted ? error.message : 'Request rejected',
        ...(trusted && status < 500 && error.details ? { details: error.details } : {}),
      },
      correlationId: id,
    });
  };
}
export function createMiddleware(config: MiddlewareConfig = {}): Middleware[] {
  const result: Middleware[] = [];
  if (config.correlationId !== false) result.push(correlationId());
  if (config.requestLogging) {
    if (!config.log) throw Error('requestLogging requires log callback');
    result.push(requestLogger(config.log));
  }
  if (config.timeoutMs !== undefined) result.push(requestTimeout(config.timeoutMs));
  return result;
}
export interface CacheStore {
  get(key: string): Promise<{ expiresAt: number; body: unknown } | undefined>;
  set(key: string, value: { expiresAt: number; body: unknown }): Promise<void>;
}
export class MemoryCache implements CacheStore {
  private data = new Map<string, { expiresAt: number; body: unknown }>();
  constructor(private maxEntries = 1000) {}
  async get(k: string) {
    const v = this.data.get(k);
    if (v && v.expiresAt > Date.now()) return structuredClone(v);
    this.data.delete(k);
    return undefined;
  }
  async set(k: string, v: { expiresAt: number; body: unknown }) {
    if (this.data.size >= this.maxEntries) this.data.delete(this.data.keys().next().value!);
    this.data.set(k, structuredClone(v));
  }
}
/** Explicitly public, anonymous GET endpoint only; never caches authenticated or personalized data. */
export function publicJsonCache(
  store: CacheStore,
  ttlMs: number,
  handler: (req: Request) => Promise<unknown>,
  vary: (req: Request) => string = () => '',
  maxBytes = 65536,
): Middleware {
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 || !Number.isSafeInteger(maxBytes) || maxBytes < 1)
    throw Error('Invalid cache limits');
  return async (req, res, next) => {
    try {
      if (
        req.method !== 'GET' ||
        req.sapling?.userId ||
        req.headers.authorization ||
        req.headers.cookie
      )
        throw new HttpError('CACHE_NOT_PUBLIC', 'Public anonymous GET required', 400);
      const k = createHash('sha256')
        .update(JSON.stringify([req.url, vary(req)]))
        .digest('hex');
      const hit = await store.get(k);
      const value = hit && hit.expiresAt > Date.now() ? hit.body : await handler(req);
      const encoded = JSON.stringify(value);
      if (encoded === undefined || Buffer.byteLength(encoded) > maxBytes)
        throw new HttpError('RESPONSE_TOO_LARGE', 'Cache response too large', 500);
      if (!hit || hit.expiresAt <= Date.now())
        await store.set(k, { expiresAt: Date.now() + ttlMs, body: value });
      json(res, 200, value);
    } catch (e) {
      next(e);
    }
  };
}
export type IdempotencyResult = { fingerprint: string; status: number; body: unknown };
export interface IdempotencyStore {
  /** Must atomically reserve across replicas; pending claims must not be silently stolen. */ claim(
    key: string,
    fingerprint: string,
  ): Promise<
    { state: 'new' | 'pending' | 'conflict' } | { state: 'complete'; result: IdempotencyResult }
  >;
  complete(key: string, result: IdempotencyResult): Promise<void>;
}
export class MemoryIdempotencyStore implements IdempotencyStore {
  private entries = new Map<string, { fingerprint: string; result?: IdempotencyResult }>();
  constructor(private maxEntries = 10000) {}
  async claim(
    k: string,
    fingerprint: string,
  ): Promise<
    { state: 'new' | 'pending' | 'conflict' } | { state: 'complete'; result: IdempotencyResult }
  > {
    const v = this.entries.get(k);
    if (v) {
      if (v.fingerprint !== fingerprint) return { state: 'conflict' };
      return v.result
        ? { state: 'complete', result: structuredClone(v.result) }
        : { state: 'pending' };
    }
    if (this.entries.size >= this.maxEntries) throw Error('Idempotency store full');
    this.entries.set(k, { fingerprint });
    return { state: 'new' };
  }
  async complete(k: string, result: IdempotencyResult) {
    const v = this.entries.get(k);
    if (!v || v.fingerprint !== result.fingerprint || v.result) throw Error('Invalid reservation');
    v.result = structuredClone(result);
  }
}
/** Auth + validation must run first; route must be transactional or reconcile ambiguous failures. */
export function idempotentJson(
  store: IdempotencyStore | ((req: Request) => IdempotencyStore),
  operation: string,
  handler: (req: Request) => Promise<{ status: number; body: unknown }>,
  maxBytes = 65536,
): Middleware {
  return async (req, res, next) => {
    try {
      const p = req.sapling,
        key = req.headers['idempotency-key'];
      if (!p?.tenantId || !p.userId)
        throw new HttpError('UNAUTHENTICATED', 'Authentication required', 401);
      if (typeof key !== 'string' || !/^[\w.:-]{1,128}$/.test(key))
        throw new HttpError('INVALID_IDEMPOTENCY_KEY', 'Valid idempotency key required');
      const k = createHash('sha256')
        .update(JSON.stringify([p.tenantId, p.userId, operation, key]))
        .digest('hex');
      const payload = JSON.stringify([req.method, req.url, req.validated ?? req.body]);
      if (Buffer.byteLength(payload) > maxBytes)
        throw new HttpError('PAYLOAD_TOO_LARGE', 'Idempotent request too large', 413);
      const fingerprint = createHash('sha256').update(payload).digest('hex');
      const backend = typeof store === 'function' ? store(req) : store;
      const claim = await backend.claim(k, fingerprint);
      if (claim.state === 'conflict' || claim.state === 'pending')
        throw new HttpError(
          'IDEMPOTENCY_CONFLICT',
          'Request conflicts with an existing reservation',
          409,
        );
      if (claim.state === 'complete') {
        json(res, claim.result.status, claim.result.body);
        return;
      }
      const result = await handler(req);
      const encoded = JSON.stringify(result.body);
      if (
        !Number.isInteger(result.status) ||
        result.status < 200 ||
        result.status >= 600 ||
        encoded === undefined ||
        Buffer.byteLength(encoded) > maxBytes
      )
        throw Error('Invalid idempotent result');
      await backend.complete(k, { fingerprint, ...result });
      json(res, result.status, result.body);
    } catch (e) {
      next(e);
    }
  };
}
/** Optional standard Express compression. Exclude SSE and sensitive routes from compression. */
export async function compressionMiddleware() {
  const name = 'compression';
  const { default: compression } = await import(name);
  return compression({
    filter: (req: Request, res: ServerResponse) =>
      !String(res.getHeader('Content-Type') ?? '').includes('text/event-stream') &&
      !req.headers.authorization &&
      !req.headers.cookie &&
      compression.filter(req, res),
  });
}
/** Optional Multer multipart parser; use bounded memory, then validate MIME by content before storage. */
export async function uploadSingle(
  field: string,
  options: { maxBytes: number; allowedMimeTypes: string[] },
) {
  if (
    !/^[\w-]{1,64}$/.test(field) ||
    !Number.isSafeInteger(options.maxBytes) ||
    options.maxBytes < 1 ||
    options.maxBytes > 20 * 1024 * 1024 ||
    !options.allowedMimeTypes.length
  )
    throw Error('Invalid upload options');
  const name = 'multer';
  const { default: multer } = await import(name);
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.maxBytes, files: 1, fields: 16, fieldSize: 4096, parts: 17 },
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      cb: (e: Error | null, ok?: boolean) => void,
    ) =>
      options.allowedMimeTypes.includes(file.mimetype)
        ? cb(null, true)
        : cb(new HttpError('UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type', 415)),
  }).single(field);
}
