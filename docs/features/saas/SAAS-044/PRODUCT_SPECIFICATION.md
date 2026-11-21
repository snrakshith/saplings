# SAAS-044 — Tax calculation

Release: 0.17.0 · Product specification

## Purpose and users
Provide tax calculation as a reusable billing & monetization capability for SaaS applications.

**Primary consumer:** Billing administrator / finance operator.

## Functional contract
Registered actions: **calculate**. Supplied rate calculation, not jurisdiction tax determination.. The target product contract requires the feature-specific acceptance tests below.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Implement jurisdiction-specific GST/VAT determination, rounding, place of supply and invoice evidence; calculation alone is insufficient.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Test inclusive/exclusive tax, discounts, exemptions and tax-rate transitions with finance-approved fixtures.

## Scope and non-goals
Supplied rate calculation, not jurisdiction tax determination.

## Status
hybrid reference mapping; per-feature production proof not established. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK hybrid binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 acceptance update

New common acceptance requirements: denied feature calls, unauthorized actors, unknown operations, and offboarded tenant operations must all fail without side effects. For configured domain policies, unauthorized fields and rows must not be disclosed. This feature retains its prior reference implementation and still requires its feature-specific functional acceptance.
