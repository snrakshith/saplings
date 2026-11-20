# SAAS-043 — Payment methods

Release: 0.17.0 · Technical specification

## Implementation status
provider reference mapping; per-feature production proof not established. Provider tokenized payment methods; never store raw cards.

## Source of truth
- `packages/sdk/src/registry.ts:73`
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
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-043', 'attach', input)`. All registered actions: attach, list, detach. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-043:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
t or verified provider callback.');provider(43,['attach','list','detach'],'Provider tokenized payment methods; never store raw cards.');
```

## Configuration and dependencies
StripePaymentMethodsAdapter; must configure a real capability adapter; provider registration is not execution.

## Execution, persistence and consistency
Integer minor units, stable business keys, immutable finance ledger/transaction boundaries and provider reconciliation; external effects outside DB transactions.

## Security boundary
Verified server-calculated prices; billing authorization, currency and captured-payment ownership; no card data or checkout secrets in logs.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Duplicate charges, mismatch, pending operation age, refund reservation, settlement delta and reconciliation failures.

## Verification design
Attempt another customer token, revoke method and verify recurring mandate status against sandbox.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@sapling/sdk`. **Implementation path:** SDK capability adapter or provider placeholder. **Status:** provider-needed.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
