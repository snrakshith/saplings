# SAAS-038 — Usage metering

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:71`
- `packages/sdk/src/billing/billing.ts`
- `packages/sdk/src/billing/commerce.ts`
- `packages/sdk/src/billing/recurring.ts`
- `packages/sdk/src/workflows/business-workflows.ts`
- `packages/sdk/src/billing/billing-policy.ts`
- `packages/sdk/src/billing/stripe-recurring.ts`
- `packages/sdk/src/payments/razorpay-webhook.ts`
- `packages/sdk/src/payments/cashfree.ts`
- `packages/sdk/src/payments/stripe-payment.ts`
- `packages/sdk/src/integrations/integrations.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-038', 'meter', input)`. All registered actions: meter, get. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-038:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind(38,{meter:(c,i)=>{if(sdk.config.app.environment==='production'&&!i.eventId)return fail('Usage event ID required in production','IDEMPOTENCY_REQUIRED',400);return sdk.billing.meter(c,text(i.metric),integer(i.quantity??1,'quantity',1),String(i.period??'monthly'),i.eventId===undefined?undefined:text(i.eventId,'eventId',200));},get:(c,i)=>sdk.billing.getUsage(c,text(i.metric),String(i.period??'monthly'))});bind(39,{set:(c,i)=>sdk.billing.setQuota(c,text(i.metric),integer(i.limit),String(i.period??'monthly')),get:(c,i)=>sdk.billing.getUsage(c,text(i.metric),String(i.period??'monthly'))});bind(40,{set:(c,i)=>{if(typeof i.enabled!=='boolean')return fail('enabled must be boolean');return sdk.billing.setEntitlement(c,text(i.feature),i.enabled);},check:(c,i)=>sdk.billing.hasEntitlement(c,text(i.feature))});
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
Replay metering event and submit around billing boundary; totals stable.

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

- **billing:** Atomic usage event deduplication, quota/audit consistency, one active subscription per plan/customer, invoice deduplication and coupon limits.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
