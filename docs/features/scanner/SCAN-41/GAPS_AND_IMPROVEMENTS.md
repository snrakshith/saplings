# SCAN-41 — Domain Watchtower

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Not a complete category or verified vendor parity.  Requires configured external data/target.

## P0 — correctness and security (implementation + verification)
- [ ] Track DNS, expiry, certificate transparency and ownership changes with verified snapshots and notifications; avoid claiming domains.
- [ ] Read-only approved scope, no exploitation of third-party assets, redacted evidence, verified report digest and strict path/host validation.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Bound file count/size, elapsed time, output and external host scope; preserve original source-bound findings and expiring review decisions. Do not treat import or skipped coverage as a pass.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Executed/failed/skipped count, rule fixture recall/precision, severity distribution, scan duration and triage age.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Seed one vulnerable/misconfigured Domain monitoring fixture and one compliant negative control; verify rule/report accuracy, severity, safe bounded execution, explicit unavailable/failed state, source hash and reviewed triage. Run configured engine against authorized fixture; assess misses and false positives.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Scan root, approved host allowlist, configured DNS/IOC feed or external report engine as applicable; current mode: dns (configured).
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Security engineer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
