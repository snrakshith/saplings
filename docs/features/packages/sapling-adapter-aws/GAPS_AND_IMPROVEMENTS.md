# sapling-adapter-aws — @saplings/adapter-aws

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Package-level compilation or registration is not per-feature functional completeness; see feature dossiers and release blockers.

## P0 — correctness and security (implementation + verification)
- [ ] Validate package exports, type declarations, dependency and peer boundaries, runtime/dev separation, clean install and actual consumer example.
- [ ] Review dependency/SBOM, supply-chain integrity, public exports, secret handling and independent security audit where applicable.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Compile types and code, enforce package export map, verify dependency graph and clean consuming application; keep dev-only quality out of runtime.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Build/typecheck results, package/bundle size, dependency audit, consumer test results.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Build and pack @saplings/adapter-aws from a clean frozen pnpm install; run import/type checks for supported entry points and a consumer integration test. Verify no production bundle accidentally includes dev engines or incompatible browser/Node code.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Dependencies: @saplings/sdk, @aws-sdk/client-s3, @aws-sdk/client-sesv2, @aws-sdk/client-sns, @aws-sdk/s3-request-presigner. Peer dependencies: none.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Package maintainer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
