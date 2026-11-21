# SAAS-042 — Payment collection

Release: 0.17.0 · Technical specification

## Implementation status
hybrid reference mapping; per-feature production proof not established. Cashfree preferred; Razorpay or Stripe selectable. Order is not confirmation; use payments.reconcilePayment or verified provider callback.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:73`
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
- `packages/sdk/src/payments/cashfree.ts`
- `packages/sdk/src/integrations/integrations.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-042', 'order', input)`. All registered actions: order. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-042:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind(42,{order:(c,i)=>sdk.payments.createOrder(c,{amountMinor:integer(i.amountMinor,'amount',1),currency:text(i.currency),reference:text(i.reference),invoiceId:i.invoiceId===undefined?undefined:text(i.invoiceId),idempotencyKey:i.idempotencyKey===undefined?undefined:text(i.idempotencyKey)})},'hybrid','Cashfree preferred; Razorpay or Stripe selectable. Order is not confirmation; use payments.reconcilePayment or verified provider callback.');provider(43,['attach','list','detach'],'Provider tokenized payment methods; never store raw cards.');
```

See direct typed `sapling.payments` APIs and `CASHFREE_PAYMENTS.md` for exact payment contracts.

## Configuration and dependencies
SDK reference path; configure provider, worker or application policy as applicable.

## Execution, persistence and consistency
Integer minor units, stable business keys, immutable finance ledger/transaction boundaries and provider reconciliation; external effects outside DB transactions.

## Security boundary
Verified server-calculated prices; billing authorization, currency and captured-payment ownership; no card data or checkout secrets in logs.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Duplicate charges, mismatch, pending operation age, refund reservation, settlement delta and reconciliation failures.

## Verification design
Sandbox hosted checkout with success/failure/timeout, signature and amount mismatch, duplicate order; ensure invoice paid only after verified capture.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK hybrid binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
