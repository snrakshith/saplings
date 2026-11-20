# Core deployment readiness assessment

The first production profile uses Node.js 26, PostgreSQL, Valkey, Harbor, and
Kingsman. Its [readiness register](readiness/core-register.json) covers all 24
packages, all 182 SaaS feature IDs, and the 45 existing release gates. It maps
80 proposed core feature IDs to acceptance evidence and keeps experimental and
later integrations visible. Package and feature owners in the register are roles
for review assignment.

**Production status is blocked.** This assessment reviewed current source and
ran a frozen install, package build, release tarball checks, 217 unit tests,
and 11 disposable PostgreSQL and Valkey integration tests. One unit test was
skipped. All 24 published packages installed in a clean consumer. For 23
packages, public Node entry points or CLI smoke checks passed. Murph AppUI still
needs a supported native device or emulator run.

## SDK findings

- Direct resource mutations and durable job admission now check tenant state
  inside the write transaction. Two independently pooled SDK instances verified
  that an offboarding tenant cannot start these changes or claim pending work
  while another tenant continues. Pending work can resume if the original
  tenant returns to active status. The change ships through the SDK changeset.
- The direct resource list path reads the full collection before applying
  authorization, filtering, sorting, and pagination. Replace it with a bounded
  path that preserves the existing visibility and ordering contract.
- Durable dispatch remains at least once. Test recovery between delivery and
  completion for supported external effects and require idempotency or
  reconciliation for handlers that perform them.
- The production gateway-to-application trust boundary, application ownership
  checks, and Kingsman conformance, signing rotation, and cross-replica
  revocation need evidence from the deployed topology. Review the supported
  account store before enabling any credential migration.

## Evidence still needed

The local restore recovered 75 records with identical contents. Use the real
staging backup and recovery configuration to verify role grants, point-in-time
recovery, and agreed recovery objectives. Local loopback load is a diagnostic
baseline. Before testing production-equivalent staging, record expected traffic,
safety limits, error and latency targets, and rollback criteria.

The dependency audit passed the high-severity threshold with six moderate
advisories still under review. Independent security, application authorization,
and operations approval remain outstanding. The UI rights record and native
acceptance remain open. AWS and payment sandboxes are follow-on profiles.

The release result remains source-bound. Local results in the readiness register
do not close the official live gates. Follow the [release validation
runbook](RELEASE_VALIDATION.md) for exact-candidate evidence and approval.

# v0.17.0 consolidation open gaps

- **P0:** Real Vitest runtime and V8 coverage not executed due missing installed dependencies; full release regressions cannot be asserted. Registry access/lockfile remain a blocker.
- **P0:** Kingsman's scrypt legacy account engine remains separate from Argon2id realm credential storage. Identity migration, verification, session revocation and role compatibility need approved strategy and live proof.
- **P0:** Harbor forward-principal headers are not signed. Require secure upstream channels and strict trust boundary or signed assertions before relying on identity headers; gateway auth does not replace SDK resource authorization.
- **P0:** Live OIDC conformance, SAML/social federation, hardware device attestation and Bot/WAF/DDoS integration remain unimplemented or configuration-only.
- **P1:** Multi-replica PostgreSQL, Valkey rate state, session invalidation and gateway replay/URL/TLS testing; review provider failure and key rotation.
- **P1:** Verify each ownership delegation from [182-feature map](architecture/FEATURE_OWNERSHIP_V017.md) with per-feature integration/acceptance evidence; 182 IDs exist, not all feature backlogs are closed.
- **P2:** Remove deprecated SDK aliases only after measured consumer adoption and migration notice, with a future major-version or breaking-change plan.

> **v0.17.0:** [Harbor/Kingsman architecture](architecture/FEATURE_OWNERSHIP_V017.md) and package migration guide.

> **v0.16.0 testing gaps:** Full frozen pnpm dependency install, actual Vitest 5 core and integration suite execution, V8 coverage baseline and thresholds, browser/native coverage, and independent release evidence remain OPEN. See [TESTING_V016](technical-specifications/TESTING_V016.md).

> **v0.15.0:** [Flat SDK implementation and critical-code changes](technical-specifications/ENGINEERING_015.md) · [evidence-based production assessment](technical-specifications/PRODUCTION_READINESS_015.md). P0/P1 items below remain open until real accepted evidence; older version claims are historical.

> **v0.14.0 current:** See [UI platform P0/P1/P2 backlog](ui-platforms/GAPS_AND_IMPROVEMENTS.md), [source rights](ui-platforms/PROVENANCE.md) and [component matrix](ui-platforms/COMPONENT_PARITY.md). Existing SaaS/payment/gateway/identity gaps remain open.

> **v0.13.0:** Two new packages (`@saplings/harbor`, `@saplings/kingsman`) and typed optional `sapling.gateway` / `sapling.identityPlatform` integrations. See [platform specs](platforms/CONFIG_COVERAGE.md) and their detailed product/technical/gap documents. Existing production gates remain open; both platforms require real infrastructure/conformance testing.

# v0.12.0 — reviewed 182 SaaS dossiers, not gap-free production

The [source audit](technical-specifications/SAAS_GAP_CLOSURE_012.md) and [182-row matrix](evidence/SAAS_182_GAP_AUDIT.md) distinguish 39 directly hardened feature paths from 143 reference-only paths with shared checks. All 182 receive explicit action schema/policy hooks and catalog contract tests. Remaining provider and application-dependent requirements are deliberately open, not checked off without evidence.

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](technical-specifications/SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](technical-specifications/CASHFREE_PAYMENTS.md) and [feature dossiers](features/README.md). Historical sections below may describe previous releases.

## Current engineering backlog — v0.11.0

Use [feature dossiers](features/README.md) as the primary detailed backlog. 783 dossiers with 2,349 documents cover the catalog, scanner, defender, quality, public foundation declarations and packages. Each dossier lists implementation work, tests, ownership and closure criteria. Cashfree live integration, subscriptions, refund webhook automation, merchant-account binding and legacy payment migration remain open; prior release blockers remain open. The registry count is not a measure of complete functionality.

# v0.10.0 — current assessment

Flat typed SDK, React hooks and pnpm migration implemented in source. Existing engineering gaps in v0.9.0 remain. `workspace-install` and `react-hooks` gates added; registry unavailable, no verified lockfile, React type/runtime validation pending. See [migration specification](technical-specifications/ENGINEERING_0100.md) and [current blockers](technical-specifications/RELEASE_BLOCKERS.md).

# v0.9.0 — current engineering assessment

See [engineering closure assessment](technical-specifications/ENGINEERING_090.md) for delivered code and remaining work. Existing release gates remain authoritative. Prior sections are historical; code and verification gaps are not equivalent.

# v0.8.4 — current status

See [three-patch engineering plan](technical-specifications/ENGINEERING_CLOSURE_PLAN.md) and [v0.8.4](technical-specifications/PATCH_084.md). 104 local tests passed. Transactional HTTP mutations, server-side consumer cursors, and legal-hold checks implemented. 19 release gates remain open. Previous sections are historical.

# v0.8.3 — current status

See [realtime and scanner hardening](technical-specifications/PATCH_083.md). 97 local tests passed. Tenant-wide admission and periodic session revocation hooks are implemented; live Redis, transport failover, external scanner and other release gates remain open. Prior sections are historical.

# v0.8.2 — current status

Three-iteration provider/workflow, realtime/scanner, and verification hardening is documented in [PATCH_082.md](technical-specifications/PATCH_082.md). No packages added. 92 regression tests pass. Remaining engineering work and all 19 outstanding release gates are explicitly retained. Previous sections below are historical.

# v0.8.1 — current status

See [patch execution and hardening](technical-specifications/PATCH_081.md) and [release blockers](technical-specifications/RELEASE_BLOCKERS.md). The 19 outstanding gates remain open; the patch fixes billing lease fencing, transaction handle lifetime and pre-aborted lifecycle claims, and provides executable preflight/check collection. Older sections are historical.

# v0.8.0 — current gap register

See [technical specifications](technical-specifications/README.md) and [release blockers](technical-specifications/RELEASE_BLOCKERS.md) for the current detailed inventory. This release adds pinned upstream Zod compatibility wrappers, retains independent native validator, implements recurring invoice and dunning state machine, and implements approved tenant offboarding with evidence checkpoints. Memory transactions now stage writes. All remaining external and deployment-specific gates are open; registry access unavailable. No gap-free claim. Historical register follows; newer implementations supersede old descriptions where noted, not evidence requirements.

# v0.4.0 — gap closure register (open items are release blockers)

This is the incremental upgrade of v0.3.0. The original 182 SaaS features and 41 scanner categories are preserved, not certified as complete products. The purpose of this release is concrete hardening and a repeatable verification path. Local tests and mock transports are not external validation. **Production release is blocked.**

| v0.3 gap | Implemented in v0.4.0 | What remains to close / evidence required |
|---|---|---|
| Identity and access | Production challenge issue uses configured out-of-band delivery; generic result; OIDC/JWKS bounded reads; queue authorization and post-update authorization | Actual public auth routes and challenge delivery, broker setup and end-to-end MFA/SAML/social/recovery review; test account abuse and role grants. |
| DB persistence | Additional JSON body/id invariant and lease index; role/RLS readiness check; bounded SQL search; live tests for rollback, isolation, quotas, pagination, lease fencing; CI service | Install adapter dependencies; run PostgreSQL and verify migration/role on staging. Generic JSONB store remains; domain-specific constraints, query tuning and full text indexes not complete. |
| Billing | Exact integer tax rounding; bounded provider response parsing; overflow checks | Recurring payment/dunning business rules, actual charge reconciliation, tax jurisdictions and finance review; sandbox orders/refunds. Current configurable dunning callback is not recurring billing implementation. |
| Worker | Bounded concurrency across tenants, round-robin start, per-tenant failure isolation, deadlines, generic enqueue authorization, standalone worker entrypoint | Configure tenant registry, service grants, external handlers with idempotency and observability; load, crash, lease and retry drills. Timed-out operations may continue if handler ignores abort; use idempotency/fencing. |
| Data | Cursor-based export and search, per-object authorization hook, bounded S3 download, DNS activation with trusted control and verified certificate response | Configure actual storage ACL, signed-URL ACL, KMS and data residency, complete offboarding and deletion orchestration; DB search uses substring predicate, not a full text index. Physical/PITR backup and object restore drill still required. |
| Scanner | Passive failures recorded; scanner version corrected; actual source report included; existing 41 categories retained | External scanner evidence, rule accuracy review, SCA, false-positive triage, independent assessment. No 200+ vendor parity. |
| Defender | Threshold validation, duplicate-header handling, non-finite custom-rule guard, production exclusions rejected; load tenant denial evidence | Edge WAF/DDOS, trusted proxy/IP/TLS and SIEM configuration; test actual abuse paths in authorized staging. Pattern detection not a substitute for safe code. |
| Platform ops | Verified domain/TLS provider hook; CI DB+Valkey, standalone worker, backup/restore scripts, release gate, staging k6 load/soak/spike profiles | Actual workflows and completion correlation, scoped cloud accounts, container build, provision/rollback/drill, physical backup/PITR and object recovery, SLO alerting. Backup scripts are logical DB dump/restore, not physical/PITR. |
| App extensions | Existing GraphQL/OpenAPI, plugin registry; bounded JSON ingress; object ACL hook | Real schemas/resolvers, field/row authorization, plugins, domain/route providers, app-specific permissions. |
| Quality | 38 local tests (including 16 added); local loopback benchmark; live PostgreSQL/Valkey/AWS checks; gate requires immutable-source hash + evidence file hash | Run adapter build with package registry, lock dependencies, live integrations, production-equivalent load/soak, independent audit, all enabled operation tests. |

## Four user-requested gates

1. **Independent security audit:** checklist and evidence policy supplied, self-review only. Requires an actual independent reviewer, remediation and signoff.
2. **Production load testing:** actual local HTTP load completed. Staging k6 scripts included; execute representative traffic and soak using real PostgreSQL, Valkey, providers and deployment topology. Do not extrapolate local throughput.
3. **External provider validation:** mock tests and real AWS sandbox tests included; provider harness requires an explicit operator-supplied sandbox module and verified evidence IDs. No live credentials available. The example module fails intentionally until real checks are implemented. Some provider-specific end-to-end checks still need to be authored against the chosen infrastructure.
4. **Live PostgreSQL:** real integration tests and migrations provided; not executed here because no database/server or npm registry access. CI service configuration is not a CI run.

Run `pnpm run release:gate`. Default evidence records intentionally block production. Evidence must match current source hash and be reviewed in an approval-controlled environment. This check verifies evidence metadata, hashes and freshness; it cannot prove an independent auditor's identity or correctness. No generic capability HTTP router should be deployed. Review routes and every enabled feature. Production readiness is a deployment-specific property.

## v0.5.0 backend quality integration

All 15 recovered categories have executable orchestration paths and example profiles. Standalone original source ZIP unavailable; reconstruction cannot be certified file-identical. Native HTTP and Node test paths have local regression evidence. External k6, Autocannon, Toxiproxy, ZAP, Schemathesis, Testcontainers, Chaos Mesh, kubectl, Helm and Docker builds have not been run. Engine installation/version pinning, per-app workloads, advanced profiling, real scalability/soak, network policy and tenant isolation assertions, independent audit and live provider/database verification remain open. Existing v0.4 gaps above remain unless independently closed. Current evidence is source-bound to v0.5.0, not proof of production approval. No frontend package included.

## v0.6.0 full-stack merge

Original ZIP recovered; the 16 backend and 16 frontend source suites have been integrated. The v0.5 entry above is historical and superseded by the source parity report. Dependency registry DNS remains unavailable; full browser/telemetry typecheck and live engines remain blocked. New production gates for full quality build, backend live and frontend live are pending. No previous SaaS/security/provider/recovery audit gap is implicitly closed. Original quality gaps and exact source mappings are in QUALITY_INTEGRATION.md and quality/IMPLEMENTATION_MATRIX.md.

## v0.7.0 foundation additions

- Original 10 toolkit modules integrated; 6 are byte-identical, modifications recorded in hash manifest. Helpers are reference implementations, not independently audited. Browser storage/Intl behavior and original utility edge cases need wider tests.
- New validator is an independent Zod-inspired subset; exact Zod API, error format, JSON Schema generation, integration ecosystem and comprehensive conformance/property tests are not provided. Use only the documented API.
- SSE, hub and middleware paths tested locally; real WebSocket/Socket.IO, multipart and compression integrations require optional packages and execution of `test:foundation:live`. Redis-compatible broker tested with an injected fake, not a live cluster. Transport authentication, CORS/proxy, revocation, distributed capacity and reconnect/slow-consumer validation remain release gates. No durable event replay.
- Public cache is anonymous only; transactional idempotency reserves/completes separately from handler side effects; reconcile pending claims and enforce retention. Upload content inspection, request deadlines/cancellation and application authorization require application-specific work.
- Existing provider, database, browser quality, load/soak, disaster recovery, security audit and deployment gates remain open. The new `foundation-live` gate must be reviewed in a real target environment. Do not deploy as production approved on local evidence alone.
