# DEF-csrf — csrf

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Bounded runtime heuristics and policy checks do not replace secure application code or edge protection. External WAF/DDoS, route-specific policy and independent validation remain required.

## P0 — correctness and security (implementation + verification)
- [ ] Use per-session token verifier and trusted origin for unsafe cookie requests; test replay, session rotation and bearer-only route.
- [ ] Default deny where authorization is required, no untrusted tenant/IP claims, no sensitive request body in logs, independent review of false-positive and bypass risk.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Preflight -> verified tenant context -> bounded assessment -> configured decision -> durable/redacted evidence and response; enforce failure policy and avoid unbounded per-client state.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Blocked/monitored/allowed counts, decision latency, signal precision, rate-state errors and incident delivery.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Use per-session token verifier and trusted origin for unsafe cookie requests; test replay, session rotation and bearer-only route. Verify allow/monitor/block or configured outcome, redacted event, correct tenant and response status; test safe normal traffic and dependency failures.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Verified request context, trusted proxy policy, shared rate-state and configured alert sink where applicable.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Security / platform engineer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
