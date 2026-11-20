# middleware-index-correlationid — correlationId (middleware/index)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/middleware/src/index.ts:10`
- `packages/middleware/package.json`

## Public contract / current implementation
```typescript
export function correlationId():Middleware
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Validate input before mutation, forward errors exactly once, handle timeout/cancellation and avoid duplicate responses; distributed idempotency needs durable store.

## Security boundary
Require verified context for protected routes; enforce correct middleware ordering, bounded parsing and redacted errors; no public cache for authenticated requests.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Request latency, rejected input, deadline, error forwarding, memory and concurrency.

## Verification design
Add a focused fixture for correlationId using its actual declaration, then assert success, edge/error cases and the applicable middleware acceptance requirements. Exercise actual Express request lifecycle with valid/invalid requests, malformed input, auth bypass, concurrent execution and cleanup; verify status/headers and next() behavior.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
