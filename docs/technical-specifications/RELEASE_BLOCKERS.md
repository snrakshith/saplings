> **v0.17.0 current release:** 45 evidence gates (43 previous + architecture-consolidation-local + architecture-consolidation-live). Direct build/ownership verification and Node smoke can support local evidence, but Vitest runtime/V8 coverage, live IAM/gateway/tenant migration proof and independent security review remain open. See [ownership map](../architecture/FEATURE_OWNERSHIP_V017.md) and [migration guide](../architecture/HARBOR_KINGSMAN_MIGRATION.md).

> **v0.17.0:** [Harbor/Kingsman architecture](../architecture/FEATURE_OWNERSHIP_V017.md) and package migration guide.

> **v0.16.0:** Add `vitest-migration`, `vitest-runtime` and `vitest-coverage` to the previous 40 release gates (43 total). Static migration checks are executable without dependencies, while the runtime and coverage gates require a real installed Vitest 5 and V8 provider. The other production blockers remain unchanged.

> **v0.15.0 release evidence:** 40 gates, **12 passed locally, 28 pending**, production **BLOCKED**. Existing critical live/independent gates are retained; additional local gates verify root SDK refactor, gateway security, identity security and tenant export. This is NOT a measured 75% production-readiness score. See [rubric and blockers](PRODUCTION_READINESS_015.md) and `../evidence/gate-result.json`.

> **v0.15.0:** [Flat SDK implementation and critical-code changes](ENGINEERING_015.md) · [evidence-based production assessment](PRODUCTION_READINESS_015.md). P0/P1 items below remain open until real accepted evidence; older version claims are historical.

> **v0.14.0:** 36 source-bound release gates; shared UI and web builds pass locally, native real dependency and device/accessible-browser testing remain blocked. See [v0.14.0 build verification](../BUILD_VERIFICATION.md) for direct execution results.

> **v0.14.0:** Web UI shared-token build and SSR smoke checks passed locally. Native official RN0.88/React19.3 compile, Metro, Android/iOS device acceptance, browser accessibility and source-licensing approvals are still pending. See [detailed UI gaps](../ui-platforms/GAPS_AND_IMPROVEMENTS.md). No previous release gate is considered passed solely due to this version bump.

> **v0.13.0:** Two new packages (`@sapling/harbor`, `@sapling/kingsman`) and typed optional `sapling.gateway` / `sapling.identityPlatform` integrations. See [platform specs](../platforms/CONFIG_COVERAGE.md) and their detailed product/technical/gap documents. Existing production gates remain open; both platforms require real infrastructure/conformance testing.

# v0.12.0 — release blockers

**28 required gates** after adding `saas-gap-audit` (local inventory/source/dossier verification) and `saas-feature-acceptance-live` (actual feature-specific verification and approved exceptions). Local audit is not an external acceptance test. Production release remains **BLOCKED**; see [SAAS gap closure assessment](SAAS_GAP_CLOSURE_012.md).

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

> **Current v0.11.0 status:** 26 release gates, 4 passed locally, 22 outstanding. New `cashfree-live` gate requires approved merchant sandbox checkout, capture, duplicate/invalid signature rejection, lost-response recovery and refund reconciliation; no mock evidence accepted. All previous gates remain applicable. Use feature-specific gap dossiers for engineering backlog.

> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](CASHFREE_PAYMENTS.md) and [feature dossiers](../features/README.md). Historical sections below may describe previous releases.

# v0.10.0 — current release gates

25 gates: all 23 previous gates plus `workspace-install` (generate and review real pnpm lockfile, run frozen install, full build and verify runtime-only deploy) and `react-hooks` (install React types/runtime; compile and exercise SSR, state, async cancellation, browser and storage behavior). Both new gates remain open. Existing v0.9.0 engineering backlog remains unchanged. Local verification is not production approval.

# v0.9.0 note

See [ENGINEERING_090.md](ENGINEERING_090.md) for current code-specific gaps and new implementation. All release gates below still apply.

# Remaining work and evidence — v0.8.4

Production is BLOCKED. See [three-iteration hardening](PATCH_082.md) and `../evidence/checks/report.json` for exact missing prerequisites and executed checks. Four local gates pass; 19 gates remain outstanding. Do not mark feature registration, reference behavior, mock tests, callbacks or generated manifests as live implementation proof. Owner labels are roles, not assigned people.

| Gate / pending area | Completion criterion | Owner |
|---|---|---|
| validation-compat | Install pinned Zod, run runtime and type conformance including locale paths and external resolver integrations | SDK engineer |
| adapter-build | Install and compile AWS, Drizzle, GraphQL/media adapters; pin reviewed lockfile | SDK engineer |
| postgres-live | Run migrations and restricted role integration, rollback, concurrency, lease and isolation tests | DBA/backend |
| valkey-live | Run independent clients, rate state and actual Pub/Sub cross-replica test | Platform |
| provider-live | Run configured provider sandbox checks and real payment/reconciliation, notifications, SSO and cloud lifecycle evidence | Integration owner |
| staging-load / staging-soak | Approved production-equivalent topology, workload mix, SLOs, spike/soak, capacity and recovery evidence | SRE |
| restore-drill | Logical and physical PITR, versioned object restore, RTO/RPO and application invariants | DBA/SRE |
| dependency-audit | Lockfile, dependency/SBOM/container audit; resolve severe findings | Security/platform |
| scanner-triage | Run all enabled engines, validate fixtures and triage heuristics; no claim of vendor 200+ check parity | Security |
| independent-security-audit | Independent reviewer, zero unresolved critical/high findings, signed evidence | Independent auditor |
| application-authorization | Every exposed route and typed service, public auth flows, resource/field policies, tenant freeze, legal retention | App owner |
| operations-review | TLS/WAF/DDoS, SIEM, secrets, alerting, deployment and rollback, observability and on-call runbooks | SRE/security |
| quality-build | Full browser and adapter typecheck with dependencies | Quality engineer |
| backend-quality-live / frontend-quality-live | Real suite engine execution against approved fixtures; record all 32 suite outcomes | Quality engineer |
| foundation-live | WebSocket, Socket.IO, Redis, upload/compression, browser utility paths and middleware live tests | Platform |
| recurring-payment-live | Stripe gateway reference implemented; real sandbox validation, mandates, idempotent payment recovery/refund, finance/tax/proration policy | Billing owner |
| tenant-offboarding-drill | Real legal-hold policy, all callbacks, quiescence, token revocation, storage/backup purge and evidence | Data governance |

Additional implementation limitations: generic JSONB domain model and full-text indexing; application-specific route authorization; full independent Zod clone (upstream compatibility chosen); durable realtime replay now has a journal implementation; live persistence/failover, transactional server-side consumer checkpoints implemented; client wire ACKs remain; tenant-wide quota and session revocation hooks are implemented but require live multi-replica validation; transactional local HTTP mutations implemented; external HTTP side effects remain; content inspection; physical DR orchestration and provider workflows; full security scanner check parity; per-feature and per-suite end-to-end proof. See detailed SaaS/security/quality evaluations. Tests that require external dependencies cannot be marked as passed in this environment. Review the evidence manifest and run `pnpm run release:gate`.

See [PATCH_083.md](PATCH_083.md) for the admission and scanner changes.

See [PATCH_084.md](PATCH_084.md) and [ENGINEERING_CLOSURE_PLAN.md](ENGINEERING_CLOSURE_PLAN.md) for remaining engineering tasks versus live checks.
