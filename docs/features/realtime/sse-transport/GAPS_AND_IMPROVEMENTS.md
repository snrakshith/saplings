# sse-transport — SSE connection lifecycle

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Implemented integration path; live verification and remaining feature-specific engineering open.

## P0 — correctness and security (implementation + verification)
- [ ] Test proxy buffering, reconnect, authorization/revocation, expired cursor and multireplica durability.
- [ ] Authenticate and authorize channels with server-resolved tenant/user identity; validate replay cursor and enforce quotas; never trust client identity.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Bound connection state, payload, backlog, ACK window and leases; durable journal/replay, shared fan-out and session revocation; define reconnect and slow-consumer semantics.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Connections, publish/receive lag, replay gaps, ACK backlog, dropped consumers and distributed admission failure.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Test proxy buffering, reconnect, authorization/revocation, expired cursor and multireplica durability. Record real provider or runtime evidence and failure/recovery behavior.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Configure provider credentials or relevant installed dependency/approved test environment.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Realtime application developer / platform engineer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
