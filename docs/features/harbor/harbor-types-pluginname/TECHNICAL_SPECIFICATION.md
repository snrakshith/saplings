# harbor-types-pluginname — PluginName (harbor/types)

Release: 0.17.0 · Technical specification

## Implementation status
Exported type contract. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/harbor/src/types.ts:2`
- `packages/harbor/package.json`

## Public contract / current implementation
```typescript
export type PluginName = 'correlation-id'|'cors'|'jwt'|'key-auth'|'acl'|'rate-limiting'|'request-size-limiting'|'ip-restriction'|'geo-restriction'|'ddos-protection'|'bot-detection'|'response-transformer'|'proxy-cache'|'request-validator'|'logging-override';
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Type-only contract: no runtime side effect by itself; verify implementing code observes the declared shape.

## Security boundary
Trust only configured upstreams and verified principals, require TLS and distributed security policy in production; never forward untrusted identity headers.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Route latency/status, upstream error and health, ACL/rate denials, per-tenant connection quota and bypass/false-positive review.

## Verification design
Typecheck valid and invalid uses of PluginName; verify declaration resolution and assignability in an actual consuming package.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
