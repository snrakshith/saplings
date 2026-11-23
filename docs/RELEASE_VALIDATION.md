> **v0.16.0:** Added `vitest-migration` (static review), `vitest-runtime` (actual installed Vitest execution), and `vitest-coverage` (real V8 instrumentation/report) evidence gates. No Vitest runtime evidence exists in the offline packaging environment. [Testing specification](technical-specifications/TESTING_V016.md).

> **v0.15.0:** current release gate result is BLOCKED (12/40 local passed). 28 gates remain pending. See `evidence/gate-result.json` and [production-readiness assessment](technical-specifications/PRODUCTION_READINESS_015.md).

> **v0.15.0:** [Flat SDK implementation and critical-code changes](technical-specifications/ENGINEERING_015.md) · [evidence-based production assessment](technical-specifications/PRODUCTION_READINESS_015.md). P0/P1 items below remain open until real accepted evidence; older version claims are historical.

> **Current v0.14.0:** 36 required release gates. New `ui-core-build`, `ui-web-build`, `ui-native-build`, `ui-native-live`, `ui-accessibility-live` distinguish local builds from actual RN and browser/device acceptance. See [UI gap checklist](ui-platforms/GAPS_AND_IMPROVEMENTS.md). Previous release evidence is not automatically valid for new source.

> **v0.13.0:** Two new packages (`@saplings/harbor`, `@saplings/kingsman`) and typed optional `sapling.gateway` / `sapling.identityPlatform` integrations. See [platform specs](platforms/CONFIG_COVERAGE.md) and their detailed product/technical/gap documents. Existing production gates remain open; both platforms require real infrastructure/conformance testing.

> **v0.12.0:** 28 release gates, including local `saas-gap-audit` and external `saas-feature-acceptance-live`. Per-feature source review does not replace live acceptance. See [closure assessment](technical-specifications/SAAS_GAP_CLOSURE_012.md).

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](technical-specifications/SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

> **Current v0.11.0 status:** 26 release gates, 4 passed locally, 22 outstanding. New `cashfree-live` gate requires approved merchant sandbox checkout, capture, duplicate/invalid signature rejection, lost-response recovery and refund reconciliation; no mock evidence accepted. All previous gates remain applicable. Use feature-specific gap dossiers for engineering backlog.

> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](technical-specifications/CASHFREE_PAYMENTS.md) and [feature dossiers](features/README.md). Historical sections below may describe previous releases.

> v0.10.0: 25 gates; add workspace-install and react-hooks. `pnpm-lock.yaml` is mandatory for locked install/dependency review. CI bootstraps an absent lockfile for review, but production Docker builds require the committed lock. Use `pnpm run release:preflight`, `pnpm run release:checks`, and `pnpm run release:gate`.

> v0.8.2: run `pnpm run release:preflight` and `pnpm run release:checks` to collect actual outcomes. See [PATCH_081](technical-specifications/PATCH_081.md). Evidence still requires review.

> v0.8.0 update: see [technical specifications](technical-specifications/README.md) for current contracts, validation migration, recurring billing, offboarding, acceptance criteria and release blockers. Historical descriptions below may describe prior releases.

# v0.6.0 release verification runbook

## 1. Build and live PostgreSQL/Valkey

Use Node 22, npm registry access and a disposable database. `pnpm install` then commit the generated lockfile after review. `pnpm run verify:build`, `pnpm run build:adapters`, `pnpm test`. `docker compose up -d postgres valkey` uses the included local-only credentials. Run:

```sh
TEST_ADMIN_DATABASE_URL=postgres://sapling_dev:local_only_change_me@localhost:5432/sapling_dev node scripts/setup-test-postgres.mjs
TEST_DATABASE_URL=postgres://sapling_test_app:sapling_ci_only@localhost:5432/sapling_dev TEST_VALKEY_URL=redis://localhost:6379 pnpm run test:integration
```

Never use the setup script against production. Apply the three SQL migrations through reviewed migration infrastructure; grant only SELECT/INSERT/UPDATE/DELETE to a non-owner non-BYPASSRLS role. A user able to run arbitrary SQL can change tenant context; never expose database access to application callers. Verify application role readiness.

## 2. Provider sandbox validation

`pnpm run test:aws` requires sandbox approval, bucket and region, AWS credential chain, and approved test recipients with explicit send confirmation. The S3 test roundtrips, checks tenant denial, uses a presigned GET and deletes the created version; use disposable buckets. SES/SNS sends can incur cost. Confirm actual delivery independently. For remaining providers, create a trusted module based on `scripts/release/provider-checks.example.mjs`, run real sandbox assertions and return evidence IDs. `SAPLING_PROVIDER_TEST_MODULE=/approved/path/checks.mjs SAPLING_SANDBOX_CONFIRM=yes SAPLING_PROVIDER_OUTPUT=docs/evidence/providers.json pnpm run test:providers:live`. The supplied example intentionally fails; the harness is not an implementation of those live provider tests. Use the provider matrix to configure actual adapter instances, verify success, rejection, authorization, duplicate requests, and recovery.

## 3. Production-equivalent performance

`pnpm run test:load:local` measures HTTP loopback with an in-memory store. Set `LOAD_REQUESTS`, `LOAD_CONCURRENCY`, `LOAD_OUTPUT` to change local run. For staging, seed two isolated tenants and use the dedicated read-only routes. Install k6 and run `SAPLING_STAGING_CONFIRM=yes STAGING_BASE_URL=https://<approved-host> STAGING_TOKEN=<test-token> STAGING_RESOURCE_PATH=/... STAGING_OTHER_TENANT_PATH=/... LOAD_PROFILE=load k6 run --summary-export=load.json tests/load/staging.k6.js`. Repeat with `spike` and `soak`. The default latency thresholds are proposed (p95 250 ms/p99 1 s), not measured production SLOs. Adapt targets and request mix to approved capacity; test writes/jobs, DB locks, provider timeouts, pool saturation, CPU/memory, recovery separately. Stop tests if safety budgets exceeded. Store deployment topology, versions, DB statistics and observations with results. Never run against a third-party or production target without explicit authorization.

## 4. Recovery / audit / release

Use `deploy/operations/postgres-backup.sh` and `postgres-restore-drill.sh` for disposable logical restore exercises, plus managed physical backups/PITR and versioned object recovery. Measure RPO/RTO and business invariants. Follow `INDEPENDENT_SECURITY_AUDIT.md`; record actual audit evidence and remediation. Run npm audit and approved SAST/SCA/container/DAST tools, triage all findings. Obtain independent approval and application authorization review.

Generate source hash: `pnpm run release:gate -- --print-source-hash`. Use `scripts/release/gate.mjs` and `docs/evidence/release-gates.json` for the current required gates. The [core readiness register](readiness/core-register.json) reconciles their status and local evidence. For each verified gate record `status: passed`, sourceHash, reviewer, environment, evidence path relative to repo, SHA-256 of evidence bytes, ISO timestamp. Audit also needs `independent: true`, `unresolvedCriticalHigh: 0`. No secrets in evidence. `pnpm run release:gate` exits nonzero for missing or stale gates. An evidence-complete outcome still requires human approval. Protect manifest and CI environment from unreviewed changes; don't fabricate evidence or use local results to close live gates. No automatic deployment is configured.

## v0.6 quality runner

Use `pnpm run quality -- run --scope fullstack --profile release --config sapling.config.ts` for dedicated staging. Retain raw external evidence, environment details and results. This does not automatically close release gates. See `BACKEND_QUALITY.md`.

Full quality build, live backend and live frontend gate evidence are separately required. See QUALITY_INTEGRATION.md. Legacy profiles use `pnpm run quality:legacy -- run --config examples/configs/legacy-backend-quality.ts`.

## v0.7.0 update

There are now 19 evidence gates. `foundation-live` requires real target-environment verification of the new realtime transports, Redis/Valkey broker, Express compression/upload adapters and authenticated middleware under representative traffic. Run the optional transport integration suite and provide approved deployment-specific evidence; local mocks do not close the gate. Only the current core-build, regression and catalog gates have local passing evidence. All earlier release evidence is archived.

## v0.8.0 current gates

There are 23 required gates. Run `pnpm run test:validation:compat`, `pnpm run typecheck:validation:compat` and `pnpm run technical:evaluate`. For recurring payment and tenant offboarding use approved disposable sandbox and data governance procedures in `technical-specifications/LIFECYCLE_AND_BILLING.md`. Technical evaluation gate validates inventory completeness only. Independent audit, deployment, actual application authorization and live evidence remain separate.
