import { randomUUID } from 'node:crypto';
import { GatewayError } from './config.js';
/** Canonical transport-layer response primitives for SAAS-124/128/131/137/138.
 * These helpers are pure; authentication and data/resource authorization still occur elsewhere.
 */
export class GatewayHttpPolicies {
  private string(value: unknown, name: string, max = 256) {
    if (typeof value !== 'string' || !value || value.length > max)
      throw new GatewayError('INVALID_INPUT', `Invalid ${name}`, 400);
    return value;
  }
  private integer(value: unknown, name: string) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
      throw new GatewayError('INVALID_INPUT', `Invalid ${name}`, 400);
    return value;
  }
  edgePolicy(defender: { enabled?: boolean; mode?: string; blockThreshold?: number }) {
    return {
      enabled: defender.enabled,
      mode: defender.mode,
      blockThreshold: defender.blockThreshold,
    };
  }
  correlation(ctx: { correlationId?: string }) {
    const id = ctx.correlationId;
    return {
      correlationId:
        typeof id === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(id) ? id : randomUUID(),
    };
  }
  envelope(ctx: { correlationId?: string }, input: Record<string, unknown>) {
    return { data: input.data ?? null, meta: this.correlation(ctx) };
  }
  resolveVersion(input: Record<string, unknown>) {
    const version = this.string(input.version, 'version', 80);
    if (
      !Array.isArray(input.supported) ||
      input.supported.length > 100 ||
      !input.supported.every((v) => typeof v === 'string' && v.length < 81) ||
      !input.supported.includes(version)
    )
      throw new GatewayError('VERSION_UNSUPPORTED', 'Unsupported API version', 400);
    return { version };
  }
  rateLimitHeaders(input: Record<string, unknown>) {
    const limit = this.integer(input.limit, 'limit'),
      remaining = this.integer(input.remaining, 'remaining'),
      reset = this.integer(input.resetSeconds, 'resetSeconds');
    if (remaining > limit) throw new GatewayError('INVALID_INPUT', 'Remaining exceeds limit', 400);
    return {
      'ratelimit-limit': String(limit),
      'ratelimit-remaining': String(remaining),
      'ratelimit-reset': String(reset),
    };
  }
  errorEnvelope(ctx: { correlationId?: string }, input: Record<string, unknown>) {
    return {
      error: {
        code: this.string(input.code, 'code', 100),
        message: this.string(input.message, 'message', 1000),
        ...this.correlation(ctx),
      },
    };
  }
}
/** Transport owner for SAAS-055. All probe targets come from server-owned configuration. */
export class GatewayTlsPolicy {
  constructor(
    private config: {
      targets?: Record<string, string>;
      certificateControl?: (target: string, url: string) => Promise<{ ready: boolean }>;
    },
    private http: typeof fetch = fetch,
  ) {}
  async execute(action: 'verify' | 'configure', input: Record<string, unknown>) {
    const target = String(input.target ?? '');
    const targets = this.config.targets ?? {};
    if (!Object.hasOwn(targets, target))
      throw new GatewayError('FORBIDDEN', 'TLS target not configured', 403);
    const location = new URL(targets[target]);
    if (location.protocol !== 'https:' || location.username || location.password || location.hash)
      throw new GatewayError('INVALID_TLS_TARGET', 'HTTPS target required', 400);
    if (action === 'configure') {
      if (!this.config.certificateControl || input.confirm !== true)
        throw new GatewayError(
          'PROVIDER_REQUIRED',
          'Certificate control and confirmation required',
          503,
        );
      const outcome = await this.config.certificateControl(target, location.href);
      if (!outcome.ready) throw new GatewayError('PROVIDER_FAILED', 'Certificate not ready', 502);
      return outcome;
    }
    const res = await this.http(location, {
      method: 'HEAD',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    await res.body?.cancel();
    return {
      tlsVerified: true,
      status: res.status,
      hsts: res.headers.has('strict-transport-security'),
    };
  }
}
