import type { IncomingMessage, ServerResponse } from 'node:http';
export type PluginName =
  | 'correlation-id'
  | 'cors'
  | 'jwt'
  | 'key-auth'
  | 'acl'
  | 'rate-limiting'
  | 'request-size-limiting'
  | 'ip-restriction'
  | 'geo-restriction'
  | 'ddos-protection'
  | 'bot-detection'
  | 'response-transformer'
  | 'proxy-cache'
  | 'request-validator'
  | 'logging-override';
export interface PluginConfig {
  name: PluginName | string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}
export interface Target {
  target: string;
  weight?: number;
  tags?: string[];
}
export interface Upstream {
  name: string;
  algorithm?: 'round-robin' | 'least-connections';
  targets: Target[];
  healthchecks?: Record<string, unknown>;
  circuitBreaker?: { errorThresholdPercent?: number; minRequests?: number; openFor?: string };
}
export interface GatewayRoute {
  name: string;
  hosts?: string[];
  paths: string[];
  pathMatch?: 'prefix' | 'exact';
  methods?: string[];
  stripPath?: boolean;
  version?: {
    value: string;
    strategy: string;
    deprecation?: { deprecated?: boolean; sunset?: string; link?: string };
  };
  plugins?: PluginConfig[];
}
export interface GatewayServiceConfig {
  name: string;
  protocol?: string;
  upstream: string;
  path?: string;
  timeouts?: { connect?: string; read?: string; write?: string };
  retries?: number;
  routes: GatewayRoute[];
  plugins?: PluginConfig[];
}
export interface GatewayConsumer {
  username: string;
  customId?: string;
  clientId?: string;
  realmRef?: string;
  groups?: string[];
  credentials?: { keyAuth?: { key: string; expiresAt?: string }[] };
  plugins?: PluginConfig[];
}
export interface GatewayConfig {
  apiVersion: 'gateway.sapling.dev/v1alpha1';
  kind: 'GatewayConfig';
  metadata: { name: string; workspace?: string; environment?: string };
  spec: {
    secretStoreRefs?: string[];
    certificates?: { name: string; cert: string; key: string; snis?: string[] }[];
    upstreams: Upstream[];
    services: GatewayServiceConfig[];
    plugins?: PluginConfig[];
    consumers?: GatewayConsumer[];
    consumerGroups?: { name: string; plugins?: PluginConfig[] }[];
    observability?: Record<string, unknown>;
  };
}
export interface GatewayPrincipal {
  sub: string;
  tenantId?: string;
  roles?: string[];
  scope?: string;
  aud?: string | string[];
  consumer?: string;
  [key: string]: unknown;
}
export interface GatewayContext {
  request: IncomingMessage;
  response: ServerResponse;
  route: GatewayRoute;
  service: GatewayServiceConfig;
  consumer?: GatewayConsumer;
  principal?: GatewayPrincipal;
  correlationId: string;
  clientIp: string;
  body?: Uint8Array;
  target?: string;
}
/** Distributed ban state: expiry must be enforced in the backend, not in a process-local cache. */
export interface GatewayBanStore {
  isBanned(clientIp: string): Promise<boolean>;
  ban(clientIp: string, ttlMs: number): Promise<void>;
}
/** Application-owned challenge engine. The gateway does not invent CAPTCHA tokens or bypass policies. */
export type BotChallengeDecision =
  | { verdict: 'allow' }
  | { verdict: 'block' }
  | { verdict: 'challenge'; body: string; contentType?: string; status?: 403 | 429 };
export type RateLimitStore = {
  check(
    key: string,
    max: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }>;
};
export interface GatewayDependencies {
  /** Server-owned API key verifier; must derive tenant from trusted route/host mappings. */
  /** Must map verified hostname/route to a tenant without using untrusted user headers. */
  keyTenantForRequest?: (context: GatewayContext) => Promise<string | undefined>;
  verifyApiKey?: (
    key: string,
    context: GatewayContext,
  ) => Promise<{ sub: string; tenantId: string; scopes: string[] } | undefined>;
  verifyJwt?: (
    token: string,
    config: { realmRef: string; audiences: string[]; algorithms?: string[]; clockSkewMs?: number },
  ) => Promise<GatewayPrincipal>;
  resolveSecret?: (ref: string) => Promise<string>;
  validateBody?: (schemaRef: string, body: unknown) => Promise<boolean>;
  rateLimit?: RateLimitStore;
  ddosBans?: GatewayBanStore;
  botChallenge?: (
    request: IncomingMessage,
    context: GatewayContext,
  ) => Promise<BotChallengeDecision>;
  countryForIp?: (ip: string) => Promise<string | undefined>;
  /** Trust-weighted, externally refreshed threat feed decision. */
  threatIp?: (ip: string, feeds: unknown[]) => Promise<boolean>;
  onEvent?: (event: Record<string, unknown>) => Promise<void> | void;
  fetch?: typeof fetch;
  /** Exact internal hostname/port allowlist. Untrusted API requests cannot specify targets. */
  allowedUpstreamHosts?: string[];
  /** Only if a verified edge proxy overwrites forwarding headers. */
  trustProxy?: boolean;
  trustedProxyCidrs?: string[];
  /** Explicit trusted TLS ingress mode; no plaintext production listener otherwise. */
  tlsTerminatedByTrustedProxy?: boolean;
}
