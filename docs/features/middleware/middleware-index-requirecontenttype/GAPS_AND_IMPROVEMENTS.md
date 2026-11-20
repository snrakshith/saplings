# middleware-index-requirecontenttype — requireContentType (middleware/index)

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Source declaration retained; individual exhaustive production/conformance verification not established. 

## P0 — correctness and security (implementation + verification)
- [ ] Exercise actual Express request lifecycle with valid/invalid requests, malformed input, auth bypass, concurrent execution and cleanup; verify status/headers and next() behavior. For requireContentType, explicitly cover its documented arguments, output, error behavior and boundaries in the source declaration below.
- [ ] Require verified context for protected routes; enforce correct middleware ordering, bounded parsing and redacted errors; no public cache for authenticated requests.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Validate input before mutation, forward errors exactly once, handle timeout/cancellation and avoid duplicate responses; distributed idempotency needs durable store.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Request latency, rejected input, deadline, error forwarding, memory and concurrency.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Add a focused fixture for requireContentType using its actual declaration, then assert success, edge/error cases and the applicable middleware acceptance requirements. Exercise actual Express request lifecycle with valid/invalid requests, malformed input, auth bypass, concurrent execution and cleanup; verify status/headers and next() behavior.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Node/Express developer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
