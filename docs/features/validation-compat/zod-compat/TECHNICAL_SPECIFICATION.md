# zod-compat — Upstream Zod compatibility

Release: 0.17.0 · Technical specification

## Implementation status
Reference code present; not production validated. Implemented integration path; live verification and remaining feature-specific engineering open.

## Source of truth
- `packages/validations/package.json`

## Public contract / current implementation
See packages/validations/package.json and package exports. Pinned upstream entry points (v3/v4/Mini/Core/locales); native parser preserved.

## Configuration and dependencies
Configure provider credentials or relevant installed dependency/approved test environment.

## Execution, persistence and consistency
Preserve input/output types, parse/safeParse/async semantics and nested issue path; complexity and issue limits; conformance to native contract, not claimed Zod parity.

## Security boundary
Treat untrusted input as bounded; reject unsafe object keys and never confuse validation with authorization; redact sensitive error data.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Validation throughput, error accuracy, type inference and recursion/complexity bounds.

## Verification design
Install pinned dependency and verify every exported entry point, runtime identity, TS inference and locale imports with conformance suite. Record real provider or runtime evidence and failure/recovery behavior.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
