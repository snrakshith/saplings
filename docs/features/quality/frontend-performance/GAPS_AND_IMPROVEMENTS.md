# frontend-performance — frontend performance

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Original source retained or adapted; live validation pending or configuration dependent. See original IMPLEMENTATION_MATRIX.md for current assertion coverage.

## P0 — correctness and security (implementation + verification)
- [ ] Measure route LCP/CLS/INP with lab and field profiles; budget and device/network sample required.
- [ ] Allowlisted isolated targets, no destructive tests without explicit non-production approval, least-privilege fixture credentials, redact traces/screenshots.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Execute a bounded run, collect structured results and artifacts, compare to approved thresholds; always clean up browser/process/toxic/chaos resources; report skipped or failed runs explicitly.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Suite duration, pass/fail/skip, engine-specific measurements and threshold/baseline drift.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Measure route LCP/CLS/INP with lab and field profiles; budget and device/network sample required. Capture raw engine artifact, thresholds, environment and source revision; fail on missing evidence, unexpected skip or threshold violation.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Playwright / LHCI; reviewed quality profile, approved target, fixture data, engine version and test account where needed.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Quality engineer / SRE.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
