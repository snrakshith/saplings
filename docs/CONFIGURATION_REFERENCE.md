> **v0.17.0:** [Harbor/Kingsman architecture](architecture/FEATURE_OWNERSHIP_V017.md) and package migration guide.

> **v0.15.0:** [Flat SDK implementation and critical-code changes](technical-specifications/ENGINEERING_015.md) · [evidence-based production assessment](technical-specifications/PRODUCTION_READINESS_015.md). P0/P1 items below remain open until real accepted evidence; older version claims are historical.

> **v0.13.0:** Two new packages (`@sapling/harbor`, `@sapling/kingsman`) and typed optional `sapling.gateway` / `sapling.identityPlatform` integrations. See [platform specs](platforms/CONFIG_COVERAGE.md) and their detailed product/technical/gap documents. Existing production gates remain open; both platforms require real infrastructure/conformance testing.

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](technical-specifications/SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](technical-specifications/CASHFREE_PAYMENTS.md) and [feature dossiers](features/README.md). Historical sections below may describe previous releases.

> **v0.10.0:** See [flat SDK, hooks and pnpm migration](technical-specifications/ENGINEERING_0100.md) for the current API, workspace and verification. Historical sections below may describe older releases.

> v0.8.0 update: see [technical specifications](technical-specifications/README.md) for current contracts, validation migration, recurring billing, offboarding, acceptance criteria and release blockers. Historical descriptions below may describe prior releases.

> v0.7.0 foundation update: see [FOUNDATION_PACKAGES.md](FOUNDATION_PACKAGES.md) for new packages, configuration, usage and limitations. Existing sections are retained as the baseline.

> v0.6.0 integration update: see [QUALITY_INTEGRATION.md](QUALITY_INTEGRATION.md) for current full-stack configuration, packages, commands and parity. Earlier SDK sections are retained for context.

# Unified configuration reference

Single trusted TypeScript config (`defineSaplingConfig`). It can construct provider instances and callbacks from environment secrets. No remote config execution.

| Section | Controls |
|---|---|
| app | ID, environment, name |
| runtime | Upload max, legacy insecure development override (never enable in production) |
| services (legacy `expanded` input deprecated) | `dataCollections` allowlist for generic data operations, optional 32-byte `encryptionKey` |
| tenancy/auth/access | Context enforcement, auth, API key TTL, default deny and service authorization |
| features | `SAAS-NNN: {enabled, provider, options}`; per-ID action invocation gate. Provider name descriptive; configure actual adapter. |
| security.scanner | enabled, fixed root, allowedHosts, enabledScannerIds, adapters by SCAN-ID |
| security.defender | enabled, mode, thresholds, rateLimit, promptPaths, policy, customRules, onThreat/onAlert |
| security.defender.policy | allowedOrigins, allowCredentials, CSRF, exact IP lists, maxContentLength, trusted TLS/IP resolver, rateState, failureMode, headers |
| billing/storage/notifications/payments/audit/analytics/featureFlags/workflows/observability | Module settings and defaults |
| providers | store, storage, notifications, payments, authentication, telemetry, capabilities |
| hooks | trusted request context resolver, app error hook |

Feature settings are checked by `capabilities.invoke`. Selected module-level toggles additionally disable corresponding catalog invocation groups. Direct original and expanded service calls remain trusted APIs, not uniformly gated. `options` passed to configured capability adapters; built-in operations use their explicit input and module configuration. Some options are descriptive or reserved. No false claim that every option controls all paths.

Production resolver refuses missing store, missing transaction contract, missing configured storage (if enabled), missing trusted auth resolver/provider, and insecure access/defender policy ; volatile overrides are rejected in production. A supplied adapter must actually be durable; mere presence is not proof. Default rate state uses shared transaction store when present; prefer ValkeyRateState for high request volume.


## v0.3 release additions

See [provider matrix](PROVIDER_MATRIX.md), [test plan](TEST_PLAN.md), and [release gates](GAPS_AND_IMPROVEMENTS.md) for current implementation, validation and limitations.

New settings: `services.impersonationScopes` (explicit read-only scopes), `services.worker` (trusted workflow/event handlers, destinations, dunning hook, per-tenant bound), `services.operations` (backup allowlist, webhook secrets, DNS suffixes/resolver, GraphQL executor, OpenAPI, TLS targets and readiness probes). `security.scanner.reports` maps IDs to trusted evidence paths/formats; `security.scanner.dns` is an explicit owned hostname baseline. Production cookie CSRF requires session-bound `verifyToken`.

## v0.4 additions

- `storage.authorizeObject(ctx, action, key)` — trusted same-tenant object authorization. Set corresponding policy for S3 presigning separately.
- `services.challengeDelivery(message)` — required for production challenge issue operations; send secret out of band.
- `services.worker.tenantConcurrency`, `maxPerTenant`, `deadlineMs` — bounded per-tenant dispatch. Handlers must be idempotent and respect abort.
- `services.operations.domainControl` and `certificateControl` — trusted control-plane callbacks; success must reflect verified routing and certificate readiness.
- Production defender rejects excluded paths and invalid thresholds. Generic queue, workflow, event and webhook capability operations need specific grants.

## Backend quality (v0.5.0)

Optional `quality` section is typed in `packages/sdk/src/quality-config.ts`. It is consumed only by the separate dev package, not initialized in runtime. All categories and examples: `BACKEND_QUALITY.md`.

## v0.9.0 additions
See [engineering assessment and APIs](technical-specifications/ENGINEERING_090.md) for provider workflows, domain policies, retention, Stripe reconciliation, realtime ACK and quotas.
