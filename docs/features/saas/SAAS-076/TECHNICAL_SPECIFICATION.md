# SAAS-076 — Notification templates

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/registry.ts:80`
- `packages/sdk/src/integrations.ts`
- `packages/sdk/src/worker.ts`
- `packages/sdk/src/registry.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-076', 'create', input)`. All registered actions: create, get, list, update, delete. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-076:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
tifications',r.id,{read:true});}});crud(76,'notification-templates',required('name','body'));bind(77,{set:(c,i)=>this.preference(c,i),get:(c,i)=>read(s,c,'notification-preferences',hash(`${c.actorId}:${text(i.channel)}`))});bind(78,{list:(c,i)=>page(s,c,'notification-deliveries',i)});bind(79,{enqueue:(c,i)=>w.enqueue(c,{type:'notification.retry',payload:i,idempotencyKey:i.idempotencyKey})},'hybrid','Register delivery handler.');bind(80,{optOut:(c,i)=>this.preference(c,{...i,enabled:false})});bind(81,{verify:(c,i)=>this.operations.webhook(c,'verify',i,true),reconcile:(c,i)=>this.operations.webhook(c,'reconcile',i,true)},'hybrid','Signed Sapling callback envelope; vendor-specific adapters can override.');bind(82,{render:async(c,i)=>{const r=await read(s,c,'notification-templates',i.id);const translations=object(r.translations??{});const lang=text(i.locale);return {body:this.render(typeof translations[lang]==='string'?String(translations[lang]):String(r.body),object(i.variables??{}))};}});
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
Missing/unsafe variables and invalid locale rejected; published revision immutable.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@sapling/sdk`. **Implementation path:** SDK local binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
