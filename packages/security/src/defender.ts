import { policySignals, applyHeaders } from './policy.js';
import type { RuntimePolicy } from './policy.js';
import { randomUUID, createHash } from 'node:crypto';

export type ThreatMode = 'monitor' | 'block';
export type ThreatSignal = { id: string; weight: number; evidence: string };
export interface RequestInfo {
  method?: string;
  url?: string;
  path?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  correlationId?: string;
  ip?: string;
  tenantId?: string;
  userId?: string;
}
export interface ThreatEvent {
  id: string;
  at: string;
  correlationId: string;
  fingerprint: string;
  riskScore: number;
  action: 'allow' | 'monitor' | 'block';
  signals: ThreatSignal[];
  method: string;
  path: string;
  tenantId?: string;
  requestKey: string;
}
export interface Rule {
  id: string;
  evaluate(request: RequestInfo): ThreatSignal | undefined;
}
export interface DefenderConfig {
  enabled?: boolean;
  mode?: ThreatMode;
  blockThreshold?: number;
  alertThreshold?: number;
  excludedPaths?: string[];
  protectedPaths?: string[];
  rateLimit?: { enabled?: boolean; maxRequests?: number; windowMs?: number };
  customRules?: Rule[];
  onThreat?: (event: ThreatEvent) => void | Promise<void>;
  onAlert?: (event: ThreatEvent) => void | Promise<void>;
  alertCooldownMs?: number;
  maxIdentities?: number;
  policy?: RuntimePolicy;
  promptPaths?: string[];
}
export interface HttpRequest {
  method?: string;
  url?: string;
  path?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  body?: unknown;
  sapling?: {
    impersonatorId?: string;
    tenantId?: string;
    userId?: string;
    correlationId?: string;
    roles?: string[];
    permissions?: string[];
  };
}
export interface HttpResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
  headersSent?: boolean;
}
export type HttpNext = (err?: unknown) => void;
export const DEFENDER_DEFAULTS: Required<
  Pick<
    DefenderConfig,
    'enabled' | 'mode' | 'blockThreshold' | 'alertThreshold' | 'alertCooldownMs' | 'maxIdentities'
  >
> = {
  enabled: true,
  mode: 'block',
  blockThreshold: 80,
  alertThreshold: 45,
  alertCooldownMs: 300000,
  maxIdentities: 20000,
};
const BLOCKED_ROUTES =
  /(?:^|\/)\.env(?:\.|\/|$)|(?:^|\/)\.git(?:\/|$)|\/wp-admin(?:\/|$)|\/actuator\/env|\/server-status|\/phpmyadmin/i;
const PATH_TRAVERSAL = /(?:\.\.\/|\.\.\\|%2e%2e(?:%2f|%5c)|%252e%252e)/i;
const SQL_PROBE =
  /(?:\bunion\s+(?:all\s+)?select\b|\bor\s+1\s*=\s*1\b|\bsleep\s*\(\s*\d+\s*\)|information_schema)/i;
const SCRIPT_PROBE = /(?:<script\b|javascript\s*:|onerror\s*=|<svg\b[^>]*onload\s*=)/i;
const PROMPT_PROBE =
  /(?:ignore\s+(?:all\s+)?previous\s+instructions|reveal\s+(?:your\s+)?system\s+prompt|developer\s+message\s+is\s+now)/i;
const BOT_UA = /(?:sqlmap|nikto|acunetix|masscan|nessus)/i;
const nowIso = () => new Date().toISOString();
const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const bounded = (v: unknown, max = 4096) => {
  let out = '',
    nodes = 0;
  const seen = new Set<object>();
  const visit = (x: unknown, depth: number) => {
    if (out.length >= max || ++nodes > 500 || depth > 8) return;
    if (typeof x === 'string') {
      out += x.slice(0, max - out.length) + ' ';
      return;
    }
    if (typeof x === 'number' || typeof x === 'boolean') {
      out += String(x) + ' ';
      return;
    }
    if (!x || typeof x !== 'object' || seen.has(x)) return;
    seen.add(x);
    for (const k of Object.keys(x).slice(0, 100)) {
      out += JSON.stringify(k) + ':';
      visit((x as Record<string, unknown>)[k], depth + 1);
      if (out.length >= max) break;
    }
  };
  visit(v, 0);
  return out.slice(0, max);
};
const decoded = (value: string) => {
  let v = value;
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(v);
      if (next === v) break;
      v = next;
    } catch {
      break;
    }
  }
  return v.slice(0, 8192);
};
const normalizePath = (req: RequestInfo) => (req.path ?? req.url ?? '/').split('?')[0] || '/';
const matches = (path: string, paths: string[] | undefined) =>
  paths?.some((v) => path === v || (v.endsWith('/*') && path.startsWith(v.slice(0, -1)))) ?? false;

export class Defender {
  private windows = new Map<string, { started: number; count: number }>();
  private cooldown = new Map<string, number>();
  readonly config: DefenderConfig;
  constructor(config: DefenderConfig = {}) {
    this.config = {
      ...DEFENDER_DEFAULTS,
      ...config,
      rateLimit: { enabled: true, maxRequests: 120, windowMs: 60000, ...config.rateLimit },
    };
    if (
      (this.config.rateLimit?.maxRequests ?? 1) < 1 ||
      (this.config.rateLimit?.windowMs ?? 1) < 1000
    )
      throw new Error('Invalid security rate limit');
  }
  private bucket(key: string, timestamp: number) {
    const { maxIdentities = 20000, rateLimit = {} } = this.config;
    if (this.windows.size >= maxIdentities && !this.windows.has(key)) {
      for (const [k, v] of this.windows)
        if (timestamp - v.started > (rateLimit.windowMs ?? 60000)) this.windows.delete(k);
      if (this.windows.size >= maxIdentities)
        this.windows.delete(this.windows.keys().next().value!);
    }
    let b = this.windows.get(key);
    if (!b || timestamp - b.started >= (rateLimit.windowMs ?? 60000)) {
      b = { started: timestamp, count: 0 };
      this.windows.set(key, b);
    }
    b.count++;
    return b.count;
  }
  assess(req: RequestInfo, externalSignals: ThreatSignal[] = [], skipRate = false): ThreatEvent {
    const path = normalizePath(req);
    const method = (req.method ?? 'GET').toUpperCase();
    const ip = req.ip ?? 'unknown';
    const key = hash(`${req.tenantId ?? 'unverified'}:${req.userId ?? ip}`);
    const signals: ThreatSignal[] = [...externalSignals];
    const add = (id: string, weight: number, evidence: string) =>
      signals.push({ id, weight, evidence });
    const raw = String(req.url ?? path).slice(0, 8192);
    const combined = `${raw} ${decoded(raw)} ${bounded(req.body)}`;
    if (/(?:\$where|\$ne|\$regex)\s*[\"']?\s*:/i.test(combined))
      add('nosql-probe', 55, 'NoSQL operator indicator');
    if (/(?:\b(?:169\.254\.169\.254|metadata\.google\.internal)\b)/i.test(combined))
      add('metadata-probe', 85, 'Cloud metadata target indicator');
    if (/(?:\b__proto__\b|\bconstructor\s*:\s*prototype\b)/i.test(combined))
      add('prototype-pollution', 90, 'Potential prototype pollution key');
    if (PATH_TRAVERSAL.test(combined)) add('path-traversal', 95, 'Traversal-like input');
    if (BLOCKED_ROUTES.test(decoded(path)))
      add('sensitive-path-probe', 90, 'Sensitive endpoint probe');
    if (SQL_PROBE.test(combined))
      add('sql-probe', 65, 'SQL injection indicator; not proof of exploit');
    if (SCRIPT_PROBE.test(combined))
      add('script-probe', 65, 'Script injection indicator; not proof of exploit');
    if (matches(path, this.config.promptPaths) && PROMPT_PROBE.test(combined))
      add('prompt-probe', 40, 'Prompt manipulation indicator; apply only to AI-bound endpoints');
    const ua = req.headers?.['user-agent'];
    if (BOT_UA.test(Array.isArray(ua) ? ua.join(' ') : (ua ?? '')))
      add('scanner-agent', 35, 'Known scanning user-agent');
    if (!skipRate && this.config.rateLimit?.enabled !== false) {
      const hits = this.bucket(key, Date.now());
      if (hits > (this.config.rateLimit?.maxRequests ?? 120))
        add('rate-exceeded', 100, 'Request window exceeded');
    }
    for (const rule of this.config.customRules ?? []) {
      try {
        const s = rule.evaluate(req);
        if (s) {
          if (!Number.isFinite(s.weight)) throw Error('Invalid rule weight');
          add(s.id, Math.max(0, Math.min(100, s.weight)), s.evidence.slice(0, 200));
        }
      } catch {
        add('custom-rule-error', 10, `Custom rule ${rule.id} threw`);
      }
    }
    const score = Math.min(
      100,
      signals.reduce((n, s) => n + s.weight, 0),
    );
    const action =
      score >= (this.config.blockThreshold ?? 80) && this.config.mode === 'block'
        ? 'block'
        : score > 0
          ? 'monitor'
          : 'allow';
    const fingerprint = hash(
      signals
        .map((s) => s.id)
        .sort()
        .join(',') +
        ':' +
        key,
    );
    return {
      id: randomUUID(),
      at: nowIso(),
      correlationId: req.correlationId ?? randomUUID(),
      fingerprint,
      riskScore: score,
      action,
      signals,
      method,
      path,
      tenantId: req.tenantId,
      requestKey: key,
    };
  }
  evaluate(req: RequestInfo): ThreatEvent {
    const path = normalizePath(req);
    if (!this.config.enabled || matches(path, this.config.excludedPaths))
      return {
        id: randomUUID(),
        at: nowIso(),
        correlationId: randomUUID(),
        fingerprint: 'none',
        riskScore: 0,
        action: 'allow',
        signals: [],
        method: req.method ?? 'GET',
        path,
        tenantId: req.tenantId,
        requestKey: 'excluded',
      };
    const event = this.assess(req);
    if (event.riskScore > 0) {
      void Promise.resolve()
        .then(() => this.config.onThreat?.(event))
        .catch((e) => this.config.policy?.onError?.(e));
      if (event.riskScore >= (this.config.alertThreshold ?? 45)) {
        const last = this.cooldown.get(event.fingerprint) ?? 0;
        if (Date.now() - last > (this.config.alertCooldownMs ?? 300000)) {
          if (this.cooldown.size > 10000) this.cooldown.clear();
          this.cooldown.set(event.fingerprint, Date.now());
          void Promise.resolve()
            .then(() => this.config.onAlert?.(event))
            .catch((e) => this.config.policy?.onError?.(e));
        }
      }
    }
    return event;
  }
  preflight() {
    return async (req: HttpRequest, res: HttpResponse, next: HttpNext) => {
      try {
        const policy = this.config.policy ?? {},
          ip = policy.resolveIP?.(req) ?? req.socket?.remoteAddress ?? 'unknown';
        const signals = policySignals(req, { ...policy, csrf: undefined }, ip);
        let rate = false;
        if (this.config.enabled && policy.rateState && this.config.rateLimit?.enabled !== false) {
          try {
            const state = await policy.rateState.increment(
              hash(`preflight:${ip}`),
              this.config.rateLimit?.windowMs ?? 60000,
            );
            rate = state.count > (this.config.rateLimit?.maxRequests ?? 120);
          } catch (e) {
            policy.onError?.(e);
            if (policy.failureMode !== 'monitor') {
              res.statusCode = 503;
              res.end();
              return;
            }
          }
        }
        if (signals.length || rate) {
          applyHeaders(req, res, policy);
          res.statusCode = rate ? 429 : 403;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: { code: rate ? 'RATE_LIMITED' : 'REQUEST_BLOCKED' } }));
          return;
        }
        next();
      } catch (e) {
        next(e);
      }
    };
  }
  middleware(
    resolveContext?: (req: HttpRequest) => {
      tenantId?: string;
      userId?: string;
      correlationId?: string;
    },
  ) {
    return async (req: HttpRequest, res: HttpResponse, next: HttpNext) => {
      try {
        const context = resolveContext?.(req) ?? req.sapling ?? {},
          policy = this.config.policy ?? {};
        const ip = policy.resolveIP?.(req) ?? req.socket?.remoteAddress ?? 'unknown';
        const correlationId = context.correlationId ?? randomUUID();
        const request: RequestInfo = {
          method: req.method,
          url: req.url,
          path: req.path,
          headers: req.headers,
          body: req.body,
          ip,
          tenantId: context.tenantId,
          userId: context.userId,
          correlationId,
        };
        applyHeaders(req, res, policy);
        res.setHeader('x-correlation-id', correlationId);
        const signals = policySignals(req, policy, ip);
        let resetAt: number | undefined;
        if (this.config.rateLimit?.enabled !== false && policy.rateState) {
          try {
            const windowMs = this.config.rateLimit?.windowMs ?? 60000,
              limit = this.config.rateLimit?.maxRequests ?? 120;
            const keys = [
              hash(`ip:${ip}`),
              ...(context.userId ? [hash(`user:${context.tenantId}:${context.userId}`)] : []),
            ];
            for (const key of keys) {
              const state = await policy.rateState.increment(key, windowMs);
              resetAt = state.resetAt;
              res.setHeader('ratelimit-limit', String(limit));
              res.setHeader('ratelimit-remaining', String(Math.max(0, limit - state.count)));
              res.setHeader(
                'ratelimit-reset',
                String(Math.max(0, Math.ceil((state.resetAt - Date.now()) / 1000))),
              );
              if (state.count > limit)
                signals.push({
                  id: 'rate-exceeded',
                  weight: 100,
                  evidence: 'Distributed request window exceeded',
                });
            }
          } catch (e) {
            policy.onError?.(e);
            if (policy.failureMode !== 'monitor') {
              res.statusCode = 503;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: { code: 'SECURITY_UNAVAILABLE', correlationId } }));
              return;
            }
          }
        }
        const decision = this.config.enabled
          ? this.assess(request, signals, !!policy.rateState)
          : this.evaluate(request);
        if (decision.riskScore > 0) {
          try {
            await this.config.onThreat?.(decision);
            if (decision.riskScore >= (this.config.alertThreshold ?? 45)) {
              const ttl = this.config.alertCooldownMs ?? 300000;
              const eligible = policy.rateState?.claimAlert
                ? await policy.rateState.claimAlert(decision.fingerprint, ttl)
                : Date.now() - (this.cooldown.get(decision.fingerprint) ?? 0) > ttl;
              if (eligible) {
                if (this.cooldown.size > 10000) this.cooldown.clear();
                this.cooldown.set(decision.fingerprint, Date.now());
                await this.config.onAlert?.(decision);
              }
            }
          } catch (e) {
            policy.onError?.(e);
          }
        }
        if (decision.action === 'block' || signals.some((s) => s.id !== 'rate-exceeded')) {
          res.statusCode = decision.signals.some((s) => s.id === 'rate-exceeded') ? 429 : 403;
          if (res.statusCode === 429 && resetAt)
            res.setHeader(
              'retry-after',
              String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
            );
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(
            JSON.stringify({
              error: {
                code: res.statusCode === 429 ? 'RATE_LIMITED' : 'REQUEST_BLOCKED',
                message: 'Request denied by security policy',
                correlationId,
              },
            }),
          );
          return;
        }
        if (
          req.method === 'OPTIONS' &&
          req.headers.origin &&
          policy.allowedOrigins?.includes(String(req.headers.origin))
        ) {
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
