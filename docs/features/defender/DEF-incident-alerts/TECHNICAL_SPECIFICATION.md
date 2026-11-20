# DEF-incident-alerts — incident alerts

Release: 0.17.0 · Technical specification

## Implementation status
Cross-cutting integration / policy; production closure pending. Bounded runtime heuristics and policy checks do not replace secure application code or edge protection. External WAF/DDoS, route-specific policy and independent validation remain required.

## Source of truth
- `packages/security/src/defender.ts`
- `packages/security/src/policy.ts`
- `packages/sdk/src/index.ts`
- `packages/sdk/src/security-state.ts`

## Public contract / current implementation
`security.defender` in sapling.config.ts; `Defender.assess`, `Defender.preflight`, and middleware. Inspect source and runtime security specification for exact configuration.

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
Use distributed alert cooldown, durable routing, escalation and acknowledgement; test sink outage and duplicate alert. Verify allow/monitor/block or configured outcome, redacted event, correct tenant and response status; test safe normal traffic and dependency failures.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
