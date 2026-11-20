# harbor-state-gatewaytransactionalbanstore — GatewayTransactionalBanStore (harbor/state)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/harbor/src/state.ts:31`
- `packages/harbor/package.json`

## Public contract / current implementation
```typescript
export class GatewayTransactionalBanStore implements GatewayBanStore {
constructor(private store:GatewayStateStore,private now:()=>number=Date.now,private namespace='sapling-gateway-control')
async isBanned(ip:string)
async ban(ip:string,ttlMs:number)
}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Route matching then ordered plugin policy, bounded buffering, stable target choice, safe retries, health/circuit recovery and explicit shutdown.

## Security boundary
Trust only configured upstreams and verified principals, require TLS and distributed security policy in production; never forward untrusted identity headers.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Route latency/status, upstream error and health, ACL/rate denials, per-tenant connection quota and bypass/false-positive review.

## Verification design
Add a focused fixture for GatewayTransactionalBanStore using its actual declaration, then assert success, edge/error cases and the applicable harbor acceptance requirements. Test declared gateway operation with full and YAML fixtures, prefix/method/host, invalid request/auth, upstream failure and production TLS behavior; run live ingress/Redis fixture.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
