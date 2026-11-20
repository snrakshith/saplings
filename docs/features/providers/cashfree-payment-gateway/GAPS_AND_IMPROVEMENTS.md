# cashfree-payment-gateway — Cashfree payment gateway

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Implemented integration path; live verification and remaining feature-specific engineering open.

## P0 — correctness and security (implementation + verification)
- [ ] Complete sandbox checkout and refund state matrix, reconciliation worker and merchant-account binding; add Cashfree subscriptions separately.
- [ ] Use least-privilege scoped credentials, trusted tenant mapping and fixed approved endpoints; never log secrets or perform destructive action without approval.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Use bounded provider I/O, durable operation identity, reconcile ambiguous outcomes, atomic local state and explicit rollback where supported.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Provider latency/error, pending reconciliation age, rate limits, timeout and external-vs-local mismatch.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Complete sandbox checkout and refund state matrix, reconciliation worker and merchant-account binding; add Cashfree subscriptions separately. Record real provider or runtime evidence and failure/recovery behavior.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Configure provider credentials or relevant installed dependency/approved test environment.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Integration / platform engineer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
