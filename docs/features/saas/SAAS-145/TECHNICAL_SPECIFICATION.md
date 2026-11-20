# SAAS-145 — Plugins

Release: 0.17.0 · Technical specification

## Implementation status
hybrid reference mapping; per-feature production proof not established. Trusted catalog activation metadata; plugin runtime is application registered.

## Source of truth
- `packages/sdk/src/registry.ts:85`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-145', 'install', input)`. All registered actions: install, uninstall, list. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-145:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
s']] as const)crud(num,collection);bind(145,Object.fromEntries(['install','uninstall','list'].map(action=>[action,(c:ActorContext,i:JsonRecord)=>this.operations.plugins(c,action,i)])),'hybrid','Trusted catalog activation metadata; plugin runtime is application registered.');crud(146,'integration-settings',required('name'));bind(148,Object.fromEntries(['request','verify','activate','remove'].map(action=>[action,(c:ActorContext,i:JsonRecord)=>this.operations.domains(c,action,i)])),'hybrid','DNS TXT challenge and verified activation/removal through configured routing/TLS control plane.');bind(149,{format:(_c,i)=>new Intl.NumberFormat(text(i.locale),i.options as Intl.NumberFormatOptions).format(Number(i.value))});bind(150,{format:(_c,i)=>new Intl.DateTimeFormat(text(i.locale??'en'),{timeZone:text(i.timeZone),dateStyle:'medium',timeStyle:'short'}).format(new Date(text(i.date)))});
```

## Configuration and dependencies
SDK reference path; configure provider, worker or application policy as applicable.

## Execution, persistence and consistency
Schema and revision version, atomic updates, audit and rollback; distributed cache invalidation.

## Security boundary
Restrict config changes and isolate tenant settings; validate allowlists, never expose secret values.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Config validation failures, drift, cache propagation delay and revision conflicts.

## Verification design
Untrusted plugin cannot execute; failed activation rollback preserves configuration.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@sapling/sdk`. **Implementation path:** SDK hybrid binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
