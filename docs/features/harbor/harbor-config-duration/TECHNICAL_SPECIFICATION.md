# harbor-config-duration — duration (harbor/config)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/harbor/src/config.ts:4`
- `packages/harbor/package.json`

## Public contract / current implementation
```typescript
duration=(v:unknown,defaultMs:number,maxMs=600000)=>{if(v===undefined)return defaultMs;if(typeof v!=='string'||!/^(?:0|[1-9]\d{0,7})(?:ms|s|m|h|d)$/.test(v))throw new GatewayError('INVALID_DURATION','Invalid duration');const unit=v.match(/(ms|s|m|h|d)$/)![1];const out=Number(v.slice(0,-unit.length))*({ms:1,s:1000,m:60000,h:3600000,d:86400000}[unit as 'ms'|'s'|'m'|'h'|'d']);if(!Number.isSafeInteger(out)||out<1||out>maxMs)throw new GatewayError('INVALID_DURATION','Duration out of bounds');return out;}
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
Add a focused fixture for duration using its actual declaration, then assert success, edge/error cases and the applicable harbor acceptance requirements. Test declared gateway operation with full and YAML fixtures, prefix/method/host, invalid request/auth, upstream failure and production TLS behavior; run live ingress/Redis fixture.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
