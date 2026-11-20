# SAAS-017 — Permission policies

Release: 0.17.0 · Technical specification

## Implementation status
hybrid reference mapping; per-feature production proof not established. Rules registered in trusted application code; policy authoring external.

## Source of truth
- `packages/sdk/src/registry.ts:60`
- `packages/sdk/src/accounts.ts`
- `packages/sdk/src/identity.ts`
- `packages/sdk/src/federation.ts`
- `packages/sdk/src/totp.ts`
- `packages/sdk/src/access.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-017', 'check', input)`. All registered actions: check. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-017:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind([16,17],{check:(c,i)=>sdk.access.has(c,text(i.permission),object(i.resource??{}))},'hybrid','Rules registered in trusted application code; policy authoring external.');
```

## Configuration and dependencies
SDK reference path; configure provider, worker or application policy as applicable.

## Execution, persistence and consistency
Account/session state and credential hashes must be tenant scoped; unique constraints, atomic credential changes and revocation propagation across replicas.

## Security boundary
Treat all credential/token input as sensitive; no token or password in logs; verify identity, actor, tenant and least-privilege permissions before action.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Authentication success/failure by reason, challenge expiry, lockout and session revocation lag; no email/token in metric labels.

## Verification design
Conflicting allow/deny and malformed policies evaluated deterministically; default deny.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@sapling/kingsman`. **Implementation path:** Kingsman legacy account/role/MFA lifecycle. **Status:** implemented-delegate; live validation pending.

No migration of existing user or session records. Old SDK public classes remain compatibility re-exports.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- **access:** Authorization checks and system-field immutability for resource mutations, role and impersonation boundaries.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
