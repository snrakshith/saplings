# SAAS-130 — API filtering

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:84`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-130', 'filter', input)`. All registered actions: filter. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-130:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
fter)}):page(s,c,collection,i);}});bind(130,{filter:async(c,i)=>{const collection=d.collection(i.collection),f=object(i.filter);if(this.domains.hasPolicy(collection)&&Object.keys(f).some(k=>!this.domains.readable(collection,k)))return fail('Filter field not readable','FORBIDDEN',403);const r=this.domains.hasPolicy(collection)?await this.domains.list(c,collection,{limit:i.limit===undefined?undefined:integer(i.limit,'limit',1,500),after:i.after===undefined?undefined:text(i.after)}):await page(s,c,collection,i);return {...r,items:r.items.filter(x=>Object.entries(f).every(([k,v])=>x[k]===v))};}});bind(131,{headers:(_c,i)=>sdk.httpPolicies.rateLimitHeaders(i)});crud(132,'developer-apps',required('name'));bind(133,{check:async(c,i)=>({allowed:await sdk.access.has(c,text(i.scope))})});bind(134,{sign:(_c,i)=>sdk.webhooks.sign(text(i.payload,'payload',1000000),text(i.secret)),verify:(_c,i)=>sdk.webhooks.verify(text(i.payload,'payload',1000000),text(i.secret),integer(i.timestamp),text(i.signature))});bind(135,{enqueue:async(c,i)=>{await sdk.access.requireService(c,`webhooks:deliver:${text(i.destination,'destination',100)}`);return w.enqueue(c,{type:'webhook.deliver',payload:i, …
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
Unknown operator/SQL payload rejected; tenant filter cannot be overridden.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

Related shared implementation path hardened; feature-specific acceptance still open.

- The direct SDK `exportTenantData` now uses scoped domain policies, explicit collection allowlists, cursor pagination, field projection and a 5,000-row bounded synchronous limit. Production fails closed without policies and a paged store. Other exports and imported resource routes still need their own acceptance tests (`tests/v015.test.mjs`).

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK local binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- **domains:** Domain row/field policies now apply to bounded data imports, exports, streaming, search, pagination and filters; destructive paths respect legal hold.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
