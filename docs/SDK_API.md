> **v0.17.0:** [Harbor/Kingsman architecture](architecture/FEATURE_OWNERSHIP_V017.md) and package migration guide.

> **v0.15.0:** [Flat SDK implementation and critical-code changes](technical-specifications/ENGINEERING_015.md) · [evidence-based production assessment](technical-specifications/PRODUCTION_READINESS_015.md). P0/P1 items below remain open until real accepted evidence; older version claims are historical.

> **v0.13.0:** Two new packages (`@sapling/harbor`, `@sapling/kingsman`) and typed optional `sapling.gateway` / `sapling.identityPlatform` integrations. See [platform specs](platforms/CONFIG_COVERAGE.md) and their detailed product/technical/gap documents. Existing production gates remain open; both platforms require real infrastructure/conformance testing.

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](technical-specifications/SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](technical-specifications/CASHFREE_PAYMENTS.md) and [feature dossiers](features/README.md). Historical sections below may describe previous releases.

> **v0.10.0:** See [flat SDK, hooks and pnpm migration](technical-specifications/ENGINEERING_0100.md) for the current API, workspace and verification. Historical sections below may describe older releases.

> v0.8.0 update: see [technical specifications](technical-specifications/README.md) for current contracts, validation migration, recurring billing, offboarding, acceptance criteria and release blockers. Historical descriptions below may describe prior releases.

> v0.7.0 foundation update: see [FOUNDATION_PACKAGES.md](FOUNDATION_PACKAGES.md) for new packages, configuration, usage and limitations. Existing sections are retained as the baseline.

> v0.6.0 integration update: see [QUALITY_INTEGRATION.md](QUALITY_INTEGRATION.md) for current full-stack configuration, packages, commands and parity. Earlier SDK sections are retained for context.

# SDK API — v0.3

`createSapling(config)` returns one SDK instance. `sdk.capabilities.invoke(ctx,id,action,input)` routes to native/hybrid operation or explicitly configured adapter. `sdk.featureManifest()` exposes per-feature action names; `docs/feature-operations.json` is a generated reference. Per-action permission `capabilities:SAAS-NNN:action`, plus original domain permissions where applicable. Use `getCapability` and `listCapabilities` for catalog descriptions.

| Example | Operation and fields |
|---|---|
| Create account | `SAAS-001/register {email,password}` |
| Issue verification | `SAAS-003/issue {email}` (deliver token out of band; do not return it publicly) |
| Verify challenge | `SAAS-003/consume {secret}` |
| Login | `SAAS-005/login {email,password}` |
| Plan | `SAAS-034/create {name,priceMinor,currency,features}` |
| Invoice | `SAAS-041/create {customerId,currency,lines:[{description,quantity,unitMinor}],taxBps?,discountMinor?}` |
| Wallet | `SAAS-046/post {walletId,deltaMinor,idempotencyKey}` |
| Event | `SAAS-100/track {name,subjectId,groupId?,properties?}` |
| Funnel | `SAAS-103/report {steps,from?,to?}` |
| Job | `SAAS-113/enqueue {type,payload,dueAt?,maxAttempts?,idempotencyKey?}` |
| Approval | `SAAS-118/request {resourceId,approvers}` then `decide {id,decision}` |
| Data import | `SAAS-089/import {collection,rows}` (allowed collections only) |
| Flag | `SAAS-139/set {key,enabled,rollout?,variants?}` then `evaluate {key,subjectId?}` |
| Scanner | `SAAS-051/scan {url?}` (fixed root configured; owned hostname allowlist) |

`sapling.accounts`, `commerce`, `analytics`, `data`, `automation`, `lifecycle`, `metrics` are trusted backend APIs. Existing `identity`, `billing`, `storage`, `audit`, `access`, `projects`, `organizations`, etc. remain available. Direct calls require application-side policy and should not be exposed directly to arbitrary clients.

`CircuitBreaker`, `Bulkhead`, `retry`, `timeout`, `idempotent`, `ValkeyRateState`, `JwksAuthenticationAdapter`, `HttpCapabilityAdapter`, `RazorpayWebhookAdapter`, `EnvelopeCrypto` exported from SDK. `timeout` signals cancellation but cannot force an uncooperative function to stop. `retry` requires explicit retryable predicate; do not retry non-idempotent external operations blindly.


## v0.3 release additions

See [provider matrix](PROVIDER_MATRIX.md), [test plan](TEST_PLAN.md), and [release gates](GAPS_AND_IMPROVEMENTS.md) for current implementation, validation and limitations.

New APIs: `sapling.accounts.enrollMfa/confirmMfa/verifyMfa/revokeMfa`, `sapling.impersonation.start/verify/stop`, `sapling.operations.vault/backup/webhook/domains`, `worker.tick/run`, `defender.preflight`, `readiness`. The exported OIDC, GitHub, Kubernetes, Cloudflare, Stripe, OTLP and media adapters implement fixed provider operations. Use the generated action manifest for exact action names. `listCapabilities().available` only indicates a registered execution path or configured provider, not full functionality or health.

## v0.9.0 additions
See [engineering assessment and APIs](technical-specifications/ENGINEERING_090.md) for provider workflows, domain policies, retention, Stripe reconciliation, realtime ACK and quotas.
