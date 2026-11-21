# DEF-body-length — body length

Release: 0.17.0 · Technical specification

## Implementation status
Current control path present; effectiveness not certified. Bounded runtime heuristics and policy checks do not replace secure application code or edge protection. External WAF/DDoS, route-specific policy and independent validation remain required.

## Source of truth
- `packages/security/src/defender.ts`
- `packages/security/src/policy.ts`
- `packages/sdk/src/index.ts`
- `packages/sdk/src/security/security-state.ts`

## Public contract / current implementation
`security.defender` in sapling.config.ts; `Defender.assess`, `Defender.preflight`, and middleware. ```typescript
export function policySignals(req:HttpRequest,policy:RuntimePolicy,ip:string):ThreatSignal[]{const out:ThreatSignal[]=[];const add=(id:string,evidence:string)=>out.push({id,weight:100,evidence});if(policy.denyIPs?.includes(ip))add('ip-denied','IP denied by policy');if(policy.allowIPs?.length&&!policy.allowIPs.includes(ip))add('ip-not-allowed','IP not allowlisted');if(policy.requireTLS&&!policy.trustedTLS?.(req))add('tls-required','Verified TLS required');const length=h(req,'content-length');if(length!==undefined&&(!/^\d+$/.test(length)||Number(length)>(policy.maxContentLength??1048576)))add('body-length','Invalid or excessive content length');if(Array.isArray(req.headers['content-length'])||Array.isArray(req.headers.authorization)||Array.isArray(req.headers.host)||Array.isArray(req.headers.origin)||Array.isArray(req.headers['transfer-encoding'])||Array.isArray(req.headers.cookie))add('duplicate-header','Ambiguous singleton request header');if(req.headers['content-length']&&req.headers['transfer-encoding'])add('ambiguous-framing','Ambiguous request framing');const origin=h(req,'origin');if(origin&&policy.allowedOrigins&&!policy.allowedOrigins.includes(origin))add('cors-origin','Orig
```

## Configuration and dependencies
Verified request context, trusted proxy policy, shared rate-state and configured alert sink where applicable.

## Execution, persistence and consistency
Preflight -> verified tenant context -> bounded assessment -> configured decision -> durable/redacted evidence and response; enforce failure policy and avoid unbounded per-client state.

## Security boundary
Default deny where authorization is required, no untrusted tenant/IP claims, no sensitive request body in logs, independent review of false-positive and bypass risk.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Blocked/monitored/allowed counts, decision latency, signal precision, rate-state errors and incident delivery.

## Verification design
Enforce actual streamed and decompressed body limits before parsing, not only Content-Length. Verify allow/monitor/block or configured outcome, redacted event, correct tenant and response status; test safe normal traffic and dependency failures.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
