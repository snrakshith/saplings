# SAAS-014 — Service accounts

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/registry.ts:58`
- `packages/sdk/src/accounts.ts`
- `packages/sdk/src/identity.ts`
- `packages/sdk/src/federation.ts`
- `packages/sdk/src/totp.ts`
- `packages/sdk/src/access.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-014', 'create', input)`. All registered actions: create, revoke. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-014:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind(14,{create:(c,i)=>sdk.identity.createApiKey(c,{name:text(i.name),scopes:strings(i.scopes)}),revoke:(c,i)=>sdk.identity.revokeApiKey(c,text(i.id))});
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Account/session state and credential hashes must be tenant scoped; unique constraints, atomic credential changes and revocation propagation across replicas.

## Security boundary
Treat all credential/token input as sensitive; no token or password in logs; verify identity, actor, tenant and least-privilege permissions before action.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Authentication success/failure by reason, challenge expiry, lockout and session revocation lag; no email/token in metric labels.

## Verification design
Revoke service credential; verify old token cannot access tenant or broader scope.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

Related shared implementation path hardened; feature-specific acceptance still open.

- The **separate** `@sapling/kingsman` now has confidential client introspection/revocation, refresh replay session invalidation, constrained client-credentials scopes, MFA replay fencing and remember-me expiry fixes. This does **not** automatically upgrade the old SaaS identity route or complete federation/WebAuthn; integrate and test the realm explicitly (`tests/v015.test.mjs`).

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@sapling/kingsman`. **Implementation path:** Kingsman API-key service. **Status:** implemented-delegate; live validation pending.

No migration of existing user or session records. Old SDK public classes remain compatibility re-exports.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
