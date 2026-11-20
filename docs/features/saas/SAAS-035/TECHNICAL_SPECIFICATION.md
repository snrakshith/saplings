# SAAS-035 — Subscriptions

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/registry.ts:70`
- `packages/sdk/src/billing.ts`
- `packages/sdk/src/commerce.ts`
- `packages/sdk/src/recurring.ts`
- `packages/sdk/src/business-workflows.ts`
- `packages/sdk/src/billing-policy.ts`
- `packages/sdk/src/stripe-recurring.ts`
- `packages/sdk/src/razorpay-webhook.ts`
- `packages/sdk/src/cashfree.ts`
- `packages/sdk/src/stripe-payment.ts`
- `packages/sdk/src/integrations.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-035', 'create', input)`. All registered actions: create, list. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-035:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind(35,{create:(c,i)=>b.subscribe(c,i),list:(c,i)=>page(s,c,'subscriptions',i)});bind(36,{transition:(c,i)=>b.transition(c,i.id,i.status),schedule:(c,i)=>this.recurring.schedule(c,i),issueDue:(c,i)=>this.recurring.issueDue(c,i.id),cancelSchedule:(c,i)=>this.recurring.cancel(c,i.id),quoteChange:(_c,i)=>quotePlanChange({oldMinor:integer(i.oldMinor),newMinor:integer(i.newMinor),periodStart:integer(i.periodStart),periodEnd:integer(i.periodEnd),effectiveAt:integer(i.effectiveAt),taxBps:i.taxBps===undefined?undefined:integer(i.taxBps,'taxBps',0,10000)})},'hybrid','Fixed-day recurring invoice scheduling; application scheduler and verified payment gateway required; proration quote available; actual plan-change posting and jurisdiction tax rules require application policy.');bind(37,{start:(c,i)=>b.subscribe(c,{...i,trialDays:integer(i.trialDays,'trialDays',1,365)})});
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Integer minor units, stable business keys, immutable finance ledger/transaction boundaries and provider reconciliation; external effects outside DB transactions.

## Security boundary
Verified server-calculated prices; billing authorization, currency and captured-payment ownership; no card data or checkout secrets in logs.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Duplicate charges, mismatch, pending operation age, refund reservation, settlement delta and reconciliation failures.

## Verification design
Duplicate create under retry; cross-tenant plan reference denied; no double subscription.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK local binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- **billing:** Atomic usage event deduplication, quota/audit consistency, one active subscription per plan/customer, invoice deduplication and coupon limits.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
