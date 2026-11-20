import type { HttpRequest, HttpResponse, ThreatSignal } from './defender.js';
export interface RateState {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  claimAlert?(key: string, ttlMs: number): Promise<boolean>;
}
export interface RuntimePolicy {
  allowedOrigins?: string[];
  allowCredentials?: boolean;
  csrf?: {
    enabled: boolean;
    cookieName?: string;
    headerName?: string;
    trustedOrigins?: string[];
    verifyToken?: (req: HttpRequest, token: string) => boolean;
  };
  denyIPs?: string[];
  allowIPs?: string[];
  maxContentLength?: number;
  requireTLS?: boolean;
  trustedTLS?: (req: HttpRequest) => boolean;
  headers?: Record<string, string>;
  resolveIP?: (req: HttpRequest) => string | undefined;
  rateState?: RateState;
  failureMode?: 'block' | 'monitor';
  onError?: (error: unknown) => void;
}
const unsafe = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const h = (req: HttpRequest, key: string) => {
  const v = req.headers[key];
  return typeof v === 'string' ? v : undefined;
};
export function policySignals(req: HttpRequest, policy: RuntimePolicy, ip: string): ThreatSignal[] {
  const out: ThreatSignal[] = [];
  const add = (id: string, evidence: string) => out.push({ id, weight: 100, evidence });
  if (policy.denyIPs?.includes(ip)) add('ip-denied', 'IP denied by policy');
  if (policy.allowIPs?.length && !policy.allowIPs.includes(ip))
    add('ip-not-allowed', 'IP not allowlisted');
  if (policy.requireTLS && !policy.trustedTLS?.(req)) add('tls-required', 'Verified TLS required');
  const length = h(req, 'content-length');
  if (
    length !== undefined &&
    (!/^\d+$/.test(length) || Number(length) > (policy.maxContentLength ?? 1048576))
  )
    add('body-length', 'Invalid or excessive content length');
  if (
    Array.isArray(req.headers['content-length']) ||
    Array.isArray(req.headers.authorization) ||
    Array.isArray(req.headers.host) ||
    Array.isArray(req.headers.origin) ||
    Array.isArray(req.headers['transfer-encoding']) ||
    Array.isArray(req.headers.cookie)
  )
    add('duplicate-header', 'Ambiguous singleton request header');
  if (req.headers['content-length'] && req.headers['transfer-encoding'])
    add('ambiguous-framing', 'Ambiguous request framing');
  const origin = h(req, 'origin');
  if (origin && policy.allowedOrigins && !policy.allowedOrigins.includes(origin))
    add('cors-origin', 'Origin not permitted');
  if (policy.csrf?.enabled && unsafe.has((req.method ?? 'GET').toUpperCase())) {
    const cookie = h(req, 'cookie') ?? '';
    if (cookie) {
      const header = h(req, policy.csrf.headerName ?? 'x-csrf-token');
      const cookieName = policy.csrf.cookieName ?? '__Host-csrf';
      const value = cookie
        .split(';')
        .map((s) => s.trim())
        .find((x) => x.startsWith(cookieName + '='))
        ?.slice(cookieName.length + 1);
      if (
        !origin ||
        !(policy.csrf.trustedOrigins ?? policy.allowedOrigins ?? []).includes(origin) ||
        !header ||
        !value ||
        header.length < 32 ||
        header !== value ||
        (policy.csrf.verifyToken && !policy.csrf.verifyToken(req, header))
      )
        add('csrf', 'Cookie-authenticated unsafe request missing trusted origin or CSRF token');
    }
  }
  return out;
}
export function applyHeaders(req: HttpRequest, res: HttpResponse, policy: RuntimePolicy) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  if (policy.requireTLS) res.setHeader('strict-transport-security', 'max-age=31536000');
  for (const [k, v] of Object.entries(policy.headers ?? {})) res.setHeader(k, v);
  const origin = h(req, 'origin');
  if (origin && policy.allowedOrigins?.includes(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
    if (policy.allowCredentials) res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('access-control-allow-headers', 'authorization, content-type, x-csrf-token');
  }
}
