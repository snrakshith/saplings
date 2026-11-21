# SAAS-176 — Contacts and accounts

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:87`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-176', 'create', input)`. All registered actions: create, get, list, update, delete. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-176:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
equired('resourceId','granteeId'));crud(176,'contacts',required('name'));bind(177,{list:c=>a.directory(c)});bind(178,{create:(c,i)=>this.businessWorkflows.ticket(c,'create',i),update:(c,i)=>this.businessWorkflows.ticket(c,'update',i),list:async(c,i)=>{const result=await page(s,c,'tickets',i);const elevated=await sdk.access.has(c,'tickets:manage');return {...result,items:result.items.filter(r=>elevated||r.requester===c.actorId)};}});crud(179,'feedback',required('body'));bind(180,{overview:async(c)=>{await sdk.access.require(c,'admin:overview');return {tenantId:c.tenantId,hasProjects:(await page(s,c,'projects',{limit:1})).items.length>0,health:sdk.health()};}},'hybrid','Backend overview; admin UI not part of backend SDK.');crud(181,'usage-policies',required('name'));bind(182,{transfer:(c,i)=>this.businessWorkflows.transfer(c,i)},'hybrid','App must validate target ownership and resource-specific permissions.');
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Domain constraints, parent references, explicit state machine and immutable audit; stable pagination and concurrency protection.

## Security boundary
Row and field authorization, verified tenant and actor, input sanitization and least privilege.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Authorization denial, validation failure, conflict rate and state-transition latency.

## Verification design
Duplicate normalized contact handled; cross-tenant and unauthorized field read denied.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK local binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- **crud:** Configured domain policy now governs catalog-backed generic CRUD; production use without a matching policy fails closed; partial updates no longer require creation-only fields.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
