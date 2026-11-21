# SAAS-050 — Webhooks for billing

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Cashfree signed webhook built in when configured; Razorpay webhook retained; Stripe recurring callback separate.

## P0 — correctness and security (implementation + verification)
- [ ] Cashfree verifies timestamp+raw HMAC and reads provider capture; add refund event processing, tenant routing, key rotation and dead-letter recovery; Stripe one-time webhook separate.
- [ ] Verified server-calculated prices; billing authorization, currency and captured-payment ownership; no card data or checkout secrets in logs.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Integer minor units, stable business keys, immutable finance ledger/transaction boundaries and provider reconciliation; external effects outside DB transactions.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Duplicate charges, mismatch, pending operation age, refund reservation, settlement delta and reconciliation failures.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Tampered raw JSON, stale signature, wrong tenant, duplicate/out-of-order event, pending refund and provider outage.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. CashfreeWebhookAdapter (default) / RazorpayWebhookAdapter; must configure a real capability adapter; provider registration is not execution.
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Billing / finance engineer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK capability adapter or provider placeholder. **Status:** provider-needed.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 source-based engineering review

**State:** baseline-reference. **Production-ready:** no; relevant live-provider, deployment and application-specific acceptance evidence remains outstanding.

### Implemented and verified shared controls
- Feature enable/disable, permission denial, unknown action and tenant offboarding freeze, tested against the complete 182-feature inventory. Optional per-action input/output schemas and resource authorization hooks are also tested; actual application policies are not generated automatically.
- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

**Source references:** `packages/sdk/src/billing/billing.ts`, `packages/sdk/src/billing/commerce.ts`, `packages/sdk/src/billing/recurring.ts`, `packages/sdk/src/workflows/business-workflows.ts`, `packages/sdk/src/billing/billing-policy.ts`, `packages/sdk/src/billing/stripe-recurring.ts`, `packages/sdk/src/payments/razorpay-webhook.ts`, `packages/sdk/src/payments/cashfree.ts`, `packages/sdk/src/payments/stripe-payment.ts`, `packages/sdk/src/integrations/integrations.ts`. **Tests:** `tests/v012.test.mjs` for shared controls and listed enhancements. Per-feature end-to-end verification is still required.

**What remains:** The original P0/P1/P2 checklist above stays open until the feature's exact acceptance scenario and independent evidence are validated. Catalog registration, generated documentation and local mock tests are not closure.
