# SAAS-075 — In-app notifications

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:80`
- `packages/sdk/src/integrations/integrations.ts`
- `packages/sdk/src/workflows/worker.ts`
- `packages/sdk/src/capabilities/registry.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-075', 'send', input)`. All registered actions: send, list, read. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-075:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind(75,{send:(c,i)=>insert(s,c,'inapp-notifications',{to:text(i.to),body:text(i.body),read:false}),list:async(c,i)=>{const p=await page(s,c,'inapp-notifications',i);return {...p,items:p.items.filter(r=>r.to===c.actorId)};},read:async(c,i)=>{const r=await read(s,c,'inapp-notifications',i.id);if(r.to!==c.actorId)return fail('Not recipient','FORBIDDEN',403);return update(s,c,'inapp-notifications',r.id,{read:true});}});crud(76,'notification-templates',required('name','body'));bind(77,{set:(c,i)=>this.preference(c,i),get:(c,i)=>read(s,c,'notification-preferences',hash(`${c.actorId}:${text(i.channel)}`))});bind(78,{list:(c,i)=>page(s,c,'notification-deliveries',i)});bind(79,{enqueue:(c,i)=>w.enqueue(c,{type:'notification.retry',payload:i,idempotencyKey:i.idempotencyKey})},'hybrid','Register delivery handler.');bind(80,{optOut:(c,i)=>this.preference(c,{...i,enabled:false})});bind(81,{verify:(c,i)=>this.operations.webhook(c,'verify',i,true),reconcile:(c,i)=>this.operations.webhook(c,'reconcile',i,true)},'hybrid','Signed Sapling callback envelope; vendor-specific adapters can override.');bind(82,{render:async(c,i)=>{const r=await read(s,c,' …
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Durable delivery intent, unique delivery ID, retries/DLQ and provider-specific callback idempotency.

## Security boundary
Validate recipient ownership and purpose consent; redact recipient and message content; enforce channel opt-out.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Delivery/queue latency, bounce, suppression, retry count and provider error rate.

## Verification design
Other user cannot read/mark notification; repeated mark read is idempotent.

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

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
