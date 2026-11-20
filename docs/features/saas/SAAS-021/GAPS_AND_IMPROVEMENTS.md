# SAAS-021 — Tenant isolation

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Tenant-scoped storage; database RLS and app authorization still required.

## P0 — correctness and security (implementation + verification)
- [ ] Apply RLS to every protected table and role; enforce app row policy and verify cache/queue/blob isolation.
- [ ] Verified tenant context and explicit parent/resource permissions; never trust tenant identifiers from arbitrary headers.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Tenant-scoped transaction, RLS and parent/unique constraints; explicit lifecycle/cascade semantics and cache partitioning.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Cross-tenant denials, policy failures, transaction conflicts and tenant provisioning/offboarding age.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Two tenant sessions attempt same ID, join, export, and raw SQL; none leaks data.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. SDK reference path; configure provider, worker or application policy as applicable.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Backend / data engineer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@sapling/sdk`. **Implementation path:** SDK hybrid binding. **Status:** existing-implementation; feature-specific acceptance pending.

SDK RLS and field/row policy remain authoritative, not Harbor

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 source-based engineering review

**State:** baseline-reference. **Production-ready:** no; relevant live-provider, deployment and application-specific acceptance evidence remains outstanding.

### Implemented and verified shared controls
- Feature enable/disable, permission denial, unknown action and tenant offboarding freeze, tested against the complete 182-feature inventory. Optional per-action input/output schemas and resource authorization hooks are also tested; actual application policies are not generated automatically.
- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

**Source references:** `packages/sdk/src/offboarding.ts`, `packages/sdk/src/governance.ts`, `packages/sdk/src/domain-policy.ts`, `packages/sdk/src/resources.ts`, `packages/sdk/src/store.ts`, `packages/sdk/src/access.ts`. **Tests:** `tests/v012.test.mjs` for shared controls and listed enhancements. Per-feature end-to-end verification is still required.

**What remains:** The original P0/P1/P2 checklist above stays open until the feature's exact acceptance scenario and independent evidence are validated. Catalog registration, generated documentation and local mock tests are not closure.
