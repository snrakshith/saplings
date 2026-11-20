# zod-compat — Upstream Zod compatibility

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Implemented integration path; live verification and remaining feature-specific engineering open.

## P0 — correctness and security (implementation + verification)
- [ ] Install pinned dependency and verify every exported entry point, runtime identity, TS inference and locale imports with conformance suite.
- [ ] Treat untrusted input as bounded; reject unsafe object keys and never confuse validation with authorization; redact sensitive error data.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Preserve input/output types, parse/safeParse/async semantics and nested issue path; complexity and issue limits; conformance to native contract, not claimed Zod parity.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Validation throughput, error accuracy, type inference and recursion/complexity bounds.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Install pinned dependency and verify every exported entry point, runtime identity, TS inference and locale imports with conformance suite. Record real provider or runtime evidence and failure/recovery behavior.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Configure provider credentials or relevant installed dependency/approved test environment.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** TypeScript API developer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
