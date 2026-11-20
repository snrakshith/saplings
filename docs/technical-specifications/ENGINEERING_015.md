# Sapling Unified SDK — v0.15.0 technical engineering specification

## Release contract

This is a cumulative source upgrade of v0.14.0. All 24 workspace packages, 182 SaaS feature IDs, 41 scanner categories, 32 quality suites, Cashfree preferred payments, gateway, realm identity and three Murphi UI packages remain. **No package was added.** `packageManager` remains pnpm 10.11.0. No production-quality score is inferred from a local test count.

## SDK source refactor — 31 real modules moved

`packages/sdk/src/expanded/` was removed. All 31 implementation modules are directly under `packages/sdk/src/`: `accounts.ts`, `analytics.ts`, `automation.ts`, `billing-policy.ts`, `business-workflows.ts`, `cashfree.ts`, `commerce.ts`, `control-plane.ts`, `data.ts`, `domain-policy.ts`, `federation.ts`, `governance.ts`, `http.ts`, `impersonation.ts`, `media.ts`, `offboarding.ts`, `operations.ts`, `primitives.ts`, `provider-operations.ts`, `provider-workflow.ts`, `providers.ts`, `razorpay-webhook.ts`, `recurring.ts`, `registry.ts`, `reliability.ts`, `security-state.ts`, `stripe-payment.ts`, `stripe-recurring.ts`, `totp.ts`, `valkey.ts` and `worker.ts`.

The private `ExpandedServices` class was renamed `SaasServicesRegistry`; all relative references, emitted SDK type declarations, internal module imports and examples were updated. Public accessors stay flat, e.g. `sapling.domains`, `sapling.providerWorkflows`, `sapling.governance`, `sapling.recurring`, and `sapling.identityPlatform`. No public `sapling.expanded` property exists. **Configuration** can still accept deprecated `config.expanded`; migrate inputs to `config.services`. Avoid direct imports of private implementation subpaths; use `@saplings/sdk` exports. `scripts/verify-sdk-root-refactor.mjs` enforces the directory and module inventory. The source move itself does not add feature functionality.

## API gateway — new security controls

`packages/harbor/src/state.ts` implements `GatewayTransactionalRateLimitStore`, `GatewayTransactionalBanStore` and `GatewayStateMaintenance` using an injected atomic transactional persistent store. Rate counters use hashed identity, threshold and window in their key: combined policies such as **20/min plus 1,000/day** remain independent. A time-bounded ban is shared through the durable store, not an in-memory JS map. Cleanup is explicit/bounded. Shared DB transactions are a correctness-oriented fallback; high-rate edge traffic should use a tested Redis/Valkey atomic implementation.

`@saplings/harbor` adds an explicit `key-auth` plugin with configured consumer identity, optional allowed consumer group and constant-time key comparison, and optional injected bot challenge and DDoS ban drivers. Missing required production drivers fail closed. Bot policy is a driver contract, **not a built-in CAPTCHA or an edge WAF**. Gateway paths reject suspicious encodings and traversal; invalid JSON returns a client error; decompressed responses cannot retain stale `content-length`/`content-encoding` metadata. A production HTTP listener behind TLS termination verifies the actual direct client is in an explicitly trusted proxy CIDR **per request** and confirms `x-forwarded-proto=https`, not merely a startup flag. Direct plaintext access is rejected. The core SDK can auto-wire the persistent rate/ban store to the gateway.

**Still open:** real deployed ingress verification, cross-replica and Redis throughput, bot challenge implementation, real WAF and DDoS edge provider, audit/trace sinks, protected config rollout, streaming bodies, 14 original uploaded plugin behaviors and full gateway failure injection. Do not claim Kong parity.

## Identity platform — improved protocol correctness

`@saplings/kingsman` now exposes confidential-client-only `/protocol/openid-connect/revoke` and `/introspect` handlers with bounded form parsing. Access-token revocation is stored by token digest. Refresh replay revokes the entire associated session/family; issued access token verification checks the session, revocation and client/realm activation state. Refresh family absolute expiration prevents unlimited lifespan extension. Client Credentials scope requests are validated against permitted scopes. Remember-me retains configured longer idle policies; password lockout counters use transactional updates; conditional TOTP enforces digit/window and step replay protection. Registration strips system-managed profile attributes. Introspection and revocation are implemented endpoints but **not independently certified RFC/OIDC conformance**.

**Still open:** real Argon2id installation, persistent multi-replica session tests, non-exportable signing keys/HSM and rotation, identity broker (Google), SAML/LDAP, WebAuthn, complete PKCE/browser logout and OIDC conformance suite, genuine TOTP enrollment/recovery and operational identity-admin lifecycle. The uploaded full production realm has enabled Google federation and must fail closed until a real broker is integrated. Do not claim Keycloak parity.

## SaaS domain/export hardening

`sapling.exportTenantData` requires an explicit collection allowlist, validated actor/tenant, `data:export` permission, and authorized field/row projection through configured domain policies where available. Production fails closed without policies or paginated store support. A 250-row pagination loop is cursor protected; the synchronous export enforces a 5,000-visible-row ceiling and must be replaced with a durable background export for large datasets. Audit tracks the aggregate export count. Other feature-specific exports, downloads, provider purges and long-running streams require independent integration coverage.

Each of 182 SaaS dossiers has a v0.15.0 addendum distinguishing moved source from related hardening. No dossier was automatically marked production complete. These changes improve shared correctness; they do not prove the 143 previously reference-only feature paths.

## Verification

Run `pnpm run verify:sdk-layout`, `pnpm run test:critical:local`, `pnpm test`, `pnpm run docs:verify`, `pnpm run saas:audit`. In the supplied offline environment the core packages, gateway, realm, UI tokens and web UI compile directly using global TypeScript; the official native toolchain, full frozen pnpm install and live infrastructure remain unavailable. `tests/v015.test.mjs` uses a **non-production scrypt fixture** in place of a real Argon2id provider. All real-provider and cross-replica claims require separate evidence.

**Production outcome:** development hardening, not a measured 75% production certification. See [production-readiness assessment](PRODUCTION_READINESS_015.md), [gateway gaps](../platforms/gateway/GAPS_AND_IMPROVEMENTS.md), [realm gaps](../platforms/identity/GAPS_AND_IMPROVEMENTS.md) and [feature dossiers](../features/README.md).
