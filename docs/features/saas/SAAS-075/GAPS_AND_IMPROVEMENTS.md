# SAAS-075 — In-app notifications

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Reference implementation; production validation and app-specific authorization pending.

## P0 — correctness and security (implementation + verification)
- [ ] Add per-user ownership, read/unread counter and pagination with realtime updates.
- [ ] Validate recipient ownership and purpose consent; redact recipient and message content; enforce channel opt-out.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Durable delivery intent, unique delivery ID, retries/DLQ and provider-specific callback idempotency.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Delivery/queue latency, bounce, suppression, retry count and provider error rate.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Other user cannot read/mark notification; repeated mark read is idempotent.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. SDK reference path; transactional/persistent infrastructure where state is written.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Integration engineer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK local binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 source-based engineering review

**State:** baseline-reference. **Production-ready:** no; relevant live-provider, deployment and application-specific acceptance evidence remains outstanding.

### Implemented and verified shared controls
- Feature enable/disable, permission denial, unknown action and tenant offboarding freeze, tested against the complete 182-feature inventory. Optional per-action input/output schemas and resource authorization hooks are also tested; actual application policies are not generated automatically.
- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

**Source references:** `packages/sdk/src/integrations/integrations.ts`, `packages/sdk/src/workflows/worker.ts`, `packages/sdk/src/capabilities/registry.ts`. **Tests:** `tests/v012.test.mjs` for shared controls and listed enhancements. Per-feature end-to-end verification is still required.

**What remains:** The original P0/P1/P2 checklist above stays open until the feature's exact acceptance scenario and independent evidence are validated. Catalog registration, generated documentation and local mock tests are not closure.
