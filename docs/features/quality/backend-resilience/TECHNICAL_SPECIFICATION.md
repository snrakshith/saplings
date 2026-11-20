# backend-resilience — backend resilience

Release: 0.17.0 · Technical specification

## Implementation status
Suite registered; engine-specific production validation incomplete. Original source retained or adapted; live validation pending or configuration dependent. See original IMPLEMENTATION_MATRIX.md for current assertion coverage.

## Source of truth
- `packages/backend-quality/src/index.ts`
- `packages/backend-quality/src/toxiproxy.ts`
- `packages/quality-core/src`
- `docs/quality/IMPLEMENTATION_MATRIX.md`

## Public contract / current implementation
`pnpm run quality -- run --scope backend` with a profile selecting `backend:resilience`. Inspect the suite runner and QualityConfig contracts for targets and thresholds.

## Configuration and dependencies
Toxiproxy latency and cleanup; reviewed quality profile, approved target, fixture data, engine version and test account where needed.

## Execution, persistence and consistency
Execute a bounded run, collect structured results and artifacts, compare to approved thresholds; always clean up browser/process/toxic/chaos resources; report skipped or failed runs explicitly.

## Security boundary
Allowlisted isolated targets, no destructive tests without explicit non-production approval, least-privilege fixture credentials, redact traces/screenshots.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Suite duration, pass/fail/skip, engine-specific measurements and threshold/baseline drift.

## Verification design
Inject controlled latency/disconnect with Toxiproxy; assert circuit breaker, bounded errors, recovery and cleanup in finally. Capture raw engine artifact, thresholds, environment and source revision; fail on missing evidence, unexpected skip or threshold violation.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
