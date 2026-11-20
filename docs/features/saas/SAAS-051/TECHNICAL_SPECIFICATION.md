# SAAS-051 — Security scanner

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/registry.ts:75`
- `packages/sdk/src/operations.ts`
- `packages/sdk/src/audit.ts`
- `packages/sdk/src/data.ts`
- `packages/sdk/src/security-state.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-051', 'scan', input)`. All registered actions: scan. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-051:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind(51,{scan:(_c,i)=>{const root=sdk.config.security.scanner.root;if(!root)return fail('Configure fixed scanner root','CONFIG_REQUIRED',503);return sdk.scan(root,i.url===undefined?undefined:text(i.url));}});bind(52,{assess:(c,i)=>sdk.defender.assess({method:typeof i.method==='string'?i.method:undefined,url:typeof i.url==='string'?i.url:undefined,body:i.body,tenantId:c.tenantId,userId:c.actorId})});
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Versioned policy and source-bound evidence; immutable audit where required; bounded retention and legal hold coordination.

## Security boundary
Restrict configuration and evidence to authorized operators; redact secrets/PII; audit changes and keep policy fail closed.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Denials, error classifications, coverage/skip rate, stale evidence and alert delivery latency.

## Verification design
Run seeded safe/vulnerable fixtures across 41 categories; skipped/failed never treated as clean.

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

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
