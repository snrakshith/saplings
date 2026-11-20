# adapter-app-index-sharptransformer — SharpTransformer (adapter-app/index)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/adapter-app/src/index.ts:4`
- `packages/adapter-app/package.json`

## Public contract / current implementation
```typescript
export class SharpTransformer implements ImageTransformer {
async transform(input:Uint8Array,settings:{width:number;height:number;format:'webp'|'png'|'jpeg'})
}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Use bounded provider I/O, durable operation identity, reconcile ambiguous outcomes, atomic local state and explicit rollback where supported.

## Security boundary
Use least-privilege scoped credentials, trusted tenant mapping and fixed approved endpoints; never log secrets or perform destructive action without approval.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Provider latency/error, pending reconciliation age, rate limits, timeout and external-vs-local mismatch.

## Verification design
Add a focused fixture for SharpTransformer using its actual declaration, then assert success, edge/error cases and the applicable providers acceptance requirements. Execute against approved sandbox/read-only fixture, validate ownership, success/error/timeout, idempotency, response contract and recovery; keep mock evidence separate.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
