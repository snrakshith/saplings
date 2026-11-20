# harbor-types-gatewaydependencies — GatewayDependencies (harbor/types)

Release: 0.17.0 · Technical specification

## Implementation status
Exported type contract. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/harbor/src/types.ts:17`
- `packages/harbor/package.json`

## Public contract / current implementation
```typescript
export interface GatewayDependencies {
 /** Server-owned API key verifier; must derive tenant from trusted route/host mappings. */
 /** Must map verified hostname/route to a tenant without using untrusted user headers. */
 keyTenantForRequest?:(context:GatewayContext)=>Promise<string|undefined>;
 verifyApiKey?:(key:string,context:GatewayContext)=>Promise<{sub:string;tenantId:string;scopes:string[]}|undefined>;
 verifyJwt?:(token:string,config:{realmRef:string;audiences:string[];algorithms?:string[];clockSkewMs?:number})=>Promise<GatewayPrincipal>;
 resolveSecret?:(ref:string)=>Promise<string>;
 validateBody?:(schemaRef:string,body:unknown)=>Promise<boolean>;
 rateLimit?:RateLimitStore;
 ddosBans?:GatewayBanStore;
 botChallenge?:(request:IncomingMessage,context:GatewayContext)=>Promise<BotChallengeDecision>;
 countryForIp?:(ip:string)=>Promise<string|undefined>;
 /** Trust-weighted, externally refreshed threat feed decision. */
 threatIp?:(ip:string,feeds:unknown[])=>Promise<boolean>;
 onEvent?:(event:Record<string,unknown>)=>Promise<void>|void;
 fetch?:typeof fetch;
 /** Exact internal hostname/port allowlist. Untrusted API requests cannot specify targets. */
 allowedUpstreamHosts?:string[];
 /** Only if a verified edge proxy overwrites forwarding headers. */
 trustProxy?:boolean;
 trustedProxyCidrs?:string[];
 /** Explicit trusted TLS ingress mode; no plaintext production listener otherwise. */
 tlsTerminatedByTrustedProxy?:boolean;
}
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
Typecheck valid and invalid uses of GatewayDependencies; verify declaration resolution and assignability in an actual consuming package.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
