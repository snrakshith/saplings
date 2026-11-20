# hooks-async-asyncstate — AsyncState (hooks/async)

Release: 0.17.0 · Technical specification

## Implementation status
Exported type contract. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/hooks/src/async.ts:4`
- `packages/hooks/package.json`

## Public contract / current implementation
```typescript
export type AsyncState<T>={status:'idle'|'pending'|'cancelled';data?:T;error?:never}|{status:'success';data:T;error?:never}|{status:'error';data?:T;error:unknown};
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Type-only contract: no runtime side effect by itself; verify implementing code observes the declared shape.

## Security boundary
Do not persist credentials in local/session storage; avoid server rendering access to browser globals and clean up subscriptions.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Render count, memory/listener cleanup, stale update/cancellation and React 18/19 compatibility.

## Verification design
Typecheck valid and invalid uses of AsyncState; verify declaration resolution and assignability in an actual consuming package.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
