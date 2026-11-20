# SAAS-013 — Device trust

Release: 0.17.0 · Technical specification

## Implementation status
hybrid reference mapping; per-feature production proof not established. Device records only; hardware attestation requires provider.

## Source of truth
- `packages/sdk/src/registry.ts:57`
- `packages/sdk/src/accounts.ts`
- `packages/sdk/src/identity.ts`
- `packages/sdk/src/federation.ts`
- `packages/sdk/src/totp.ts`
- `packages/sdk/src/access.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-013', 'register', input)`. All registered actions: register, revoke. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-013:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind(13,{register:(c,i)=>insert(s,c,'trusted-devices',{userId:c.actorId,deviceId:text(i.deviceId),status:'pending'}),revoke:(c,i)=>update(s,c,'trusted-devices',i.id,{status:'revoked'})},'hybrid','Device records only; hardware attestation requires provider.');
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
Unattested device remains pending; copied device ID fails trust decision.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

Related shared implementation path hardened; feature-specific acceptance still open.

- The **separate** `@saplings/kingsman` now has confidential client introspection/revocation, refresh replay session invalidation, constrained client-credentials scopes, MFA replay fencing and remember-me expiry fixes. This does **not** automatically upgrade the old SaaS identity route or complete federation/WebAuthn; integrate and test the realm explicitly (`tests/v015.test.mjs`).

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/kingsman`. **Implementation path:** SDK device record (hardware attestation missing). **Status:** partial/provider-needed.

No migration of existing user or session records. Old SDK public classes remain compatibility re-exports.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
