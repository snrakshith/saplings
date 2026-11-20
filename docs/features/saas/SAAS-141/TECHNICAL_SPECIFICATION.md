# SAAS-141 — A/B experiments

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/registry.ts:85`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-141', 'set', input)`. All registered actions: set, evaluate. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-141:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind([139,140,141],{set:(c,i)=>sdk.flags.set(c,{key:text(i.key),enabled:i.enabled===true,rollout:i.rollout===undefined?undefined:integer(i.rollout,'rollout',0,100),variants:i.variants as Record<string,number>}),evaluate:(c,i)=>sdk.flags.evaluate(c,text(i.key),i.subjectId===undefined?undefined:text(i.subjectId))});bind(142,{get:()=>({environment:sdk.config.app.environment,app:sdk.config.app.id})});for(const [num,collection] of [[143,'tenant-settings'],[144,'remote-config'],[147,'white-label'],[151,'themes'],[152,'branding'],[153,'maintenance-settings']] as const)crud(num,collection);bind(145,Object.fromEntries(['install','uninstall','list'].map(action=>[action,(c:ActorContext,i:JsonRecord)=>this.operations.plugins(c,action,i)])),'hybrid','Trusted catalog activation metadata; plugin runtime is application registered.');crud(146,'integration-settings',required('name'));bind(148,Object.fromEntries(['request','verify','activate','remove'].map(action=>[action,(c:ActorContext,i:JsonRecord)=>this.operations.domains(c,action,i)])),'hybrid','DNS TXT challenge and verified activation/removal through configured routing/TLS control plane.');bind …
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Schema and revision version, atomic updates, audit and rollback; distributed cache invalidation.

## Security boundary
Restrict config changes and isolate tenant settings; validate allowlists, never expose secret values.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Config validation failures, drift, cache propagation delay and revision conflicts.

## Verification design
Variant assignment stable; duplicate exposure dedup; paused experiment stops new assignments.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK local binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
