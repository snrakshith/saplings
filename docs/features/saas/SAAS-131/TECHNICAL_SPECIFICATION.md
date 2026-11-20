# SAAS-131 — API rate-limit headers

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/registry.ts:84`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-131', 'headers', input)`. All registered actions: headers. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-131:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
(f).every(([k,v])=>x[k]===v))};}});bind(131,{headers:(_c,i)=>sdk.httpPolicies.rateLimitHeaders(i)});crud(132,'developer-apps',required('name'));bind(133,{check:async(c,i)=>({allowed:await sdk.access.has(c,text(i.scope))})});bind(134,{sign:(_c,i)=>sdk.webhooks.sign(text(i.payload,'payload',1000000),text(i.secret)),verify:(_c,i)=>sdk.webhooks.verify(text(i.payload,'payload',1000000),text(i.secret),integer(i.timestamp),text(i.signature))});bind(135,{enqueue:async(c,i)=>{await sdk.access.requireService(c,`webhooks:deliver:${text(i.destination,'destination',100)}`);return w.enqueue(c,{type:'webhook.deliver',payload:i,idempotencyKey:i.idempotencyKey});}},'hybrid','Configure outbound destinations and signed delivery worker.');bind(136,{emit:(c,i)=>sdk.events.emit(c,text(i.type),object(i.data))},'hybrid','Local event bus; durable broker external.');bind(137,{get:c=>sdk.httpPolicies.correlation(c)});bind(138,{envelope:(c,i)=>sdk.httpPolicies.errorEnvelope(c,i)});
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Versioned typed contract, bounded request/response handling, idempotency and observability where applicable.

## Security boundary
Authorize each route and action, validate schema, redact errors; enforce tenant and client scope.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Contract failures, request duration, rate-limit rejection, invalid DTOs and trace correlation.

## Verification design
429 carries correct retry time; multiple replicas return consistent headers.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

Related shared implementation path hardened; feature-specific acceptance still open.

- The **separate** `@saplings/harbor` now has distributed transactional rate/ban store adapters, API-key authentication, optional bot challenge driver and actual verified TLS-proxy ingress checks. This does **not** automatically protect application routes: configure the gateway/plugins, durable storage, upstream scopes and driver integrations (`tests/v015.test.mjs`).

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/harbor`. **Implementation path:** GatewayHttpPolicies SDK binding. **Status:** implemented-delegate; live validation pending.

Harbor authenticates/limits ingress; SDK does not drop application-level RBAC, CSRF, business quotas or authorization.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
