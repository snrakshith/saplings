# middleware-index-idempotencyresult — IdempotencyResult (middleware/index)

Release: 0.17.0 · Technical specification

## Implementation status
Exported type contract. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/middleware/src/index.ts:28`
- `packages/middleware/package.json`

## Public contract / current implementation
```typescript
export type IdempotencyResult={fingerprint:string;status:number;body:unknown};
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Type-only contract: no runtime side effect by itself; verify implementing code observes the declared shape.

## Security boundary
Require verified context for protected routes; enforce correct middleware ordering, bounded parsing and redacted errors; no public cache for authenticated requests.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Request latency, rejected input, deadline, error forwarding, memory and concurrency.

## Verification design
Typecheck valid and invalid uses of IdempotencyResult; verify declaration resolution and assignability in an actual consuming package.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
