# SAAS-099 — Data masking

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Reference implementation; production validation and app-specific authorization pending.

## P0 — correctness and security (implementation + verification)
- [ ] Define field sensitivity classification and context-aware masking; ensure export/log paths obey it.
- [ ] Object/row ACL and tenant prefixes; validate sizes and types, redact private metadata; no public access by default.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Durable version/checksum, bounded streaming, atomic metadata/state transitions and external storage lifecycle reconciliation.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Storage failures, transfer sizes, restore integrity, rejected uploads and retention lag.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Privileged role sees approved field; default views and errors contain no sensitive values.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. SDK reference path; transactional/persistent infrastructure where state is written.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Storage / database engineer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

Related shared implementation path hardened; feature-specific acceptance still open.

- The direct SDK `exportTenantData` now uses scoped domain policies, explicit collection allowlists, cursor pagination, field projection and a 5,000-row bounded synchronous limit. Production fails closed without policies and a paged store. Other exports and imported resource routes still need their own acceptance tests (`tests/v015.test.mjs`).

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@sapling/sdk`. **Implementation path:** SDK local binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 source-based engineering review

**State:** baseline-reference. **Production-ready:** no; relevant live-provider, deployment and application-specific acceptance evidence remains outstanding.

### Implemented and verified shared controls
- Feature enable/disable, permission denial, unknown action and tenant offboarding freeze, tested against the complete 182-feature inventory. Optional per-action input/output schemas and resource authorization hooks are also tested; actual application policies are not generated automatically.
- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

**Source references:** `packages/sdk/src/storage.ts`, `packages/sdk/src/data.ts`, `packages/sdk/src/media.ts`. **Tests:** `tests/v012.test.mjs` for shared controls and listed enhancements. Per-feature end-to-end verification is still required.

**What remains:** The original P0/P1/P2 checklist above stays open until the feature's exact acceptance scenario and independent evidence are validated. Catalog registration, generated documentation and local mock tests are not closure.
