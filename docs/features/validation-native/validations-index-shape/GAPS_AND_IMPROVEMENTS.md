# validations-index-shape — Shape (validations/index)

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Source declaration retained; individual exhaustive production/conformance verification not established. Independent native parser, not upstream Zod API parity.

## P0 — correctness and security (implementation + verification)
- [ ] Validate Shape contract by compile-time positive and negative type fixtures, compatibility with consumers and declaration emit; ensure it accurately describes runtime constraints.
- [ ] Treat untrusted input as bounded; reject unsafe object keys and never confuse validation with authorization; redact sensitive error data.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Type-only contract: no runtime side effect by itself; verify implementing code observes the declared shape.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Validation throughput, error accuracy, type inference and recursion/complexity bounds.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Typecheck valid and invalid uses of Shape; verify declaration resolution and assignability in an actual consuming package.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. Native export: @saplings/validations/native.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** TypeScript API developer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
