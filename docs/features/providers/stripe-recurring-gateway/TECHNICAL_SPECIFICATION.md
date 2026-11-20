# stripe-recurring-gateway — Stripe recurring gateway

Release: 0.17.0 · Technical specification

## Implementation status
Reference code present; not production validated. Implemented integration path; live verification and remaining feature-specific engineering open.

## Source of truth
- `packages/sdk/src/stripe-recurring.ts`

## Public contract / current implementation
See packages/sdk/src/stripe-recurring.ts and package exports. Mandate lookup, recurring intent recovery and webhook wake-up.

## Configuration and dependencies
Configure provider credentials or relevant installed dependency/approved test environment.

## Execution, persistence and consistency
Use bounded provider I/O, durable operation identity, reconcile ambiguous outcomes, atomic local state and explicit rollback where supported.

## Security boundary
Use least-privilege scoped credentials, trusted tenant mapping and fixed approved endpoints; never log secrets or perform destructive action without approval.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Provider latency/error, pending reconciliation age, rate limits, timeout and external-vs-local mismatch.

## Verification design
Validate real mandate consent, off-session charge, requires-action recovery and settlement; avoid duplicate invoice payment. Record real provider or runtime evidence and failure/recovery behavior.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
