# SAAS-028 — Teams

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/registry.ts:67`
- `packages/sdk/src/offboarding.ts`
- `packages/sdk/src/governance.ts`
- `packages/sdk/src/domain-policy.ts`
- `packages/sdk/src/resources.ts`
- `packages/sdk/src/store.ts`
- `packages/sdk/src/access.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-028', 'create', input)`. All registered actions: create, get, list, update, delete. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-028:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
kspaces);resource(27,sdk.projects);resource(28,sdk.teams);resource(29,sdk.memberships);
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Tenant-scoped transaction, RLS and parent/unique constraints; explicit lifecycle/cascade semantics and cache partitioning.

## Security boundary
Verified tenant context and explicit parent/resource permissions; never trust tenant identifiers from arbitrary headers.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Cross-tenant denials, policy failures, transaction conflicts and tenant provisioning/offboarding age.

## Verification design
Remove team with assigned permissions; stale authorization no longer grants access.

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

SDK owns teams; Kingsman verifies memberships

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- **access:** Authorization checks and system-field immutability for resource mutations, role and impersonation boundaries.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
