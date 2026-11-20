# SAAS-087 — File versions

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/registry.ts:81`
- `packages/sdk/src/storage.ts`
- `packages/sdk/src/data.ts`
- `packages/sdk/src/media.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-087', 'get', input)`. All registered actions: get. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-087:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
s:r.data.byteLength}:undefined;}});bind(87,{get:(c,i)=>sdk.storage.download(c,text(i.key),text(i.version))});crud(88,'documents',required('title','objectKey'));bind(89,{import:(c,i)=>d.import(c,i)});bind(90,{export:(c,i)=>d.export(c,i)});bind(91,Object.fromEntries(['backup','restore','status'].map(action=>[action,(c:ActorContext,i:JsonRecord)=>this.operations.backup(c,action,i)])),'hybrid','Bounded encrypted tenant logical backup; physical DB and object-store backup still external.');provider(92,['plan','apply','status'],'Migration runner executes reviewed migrations outside requests.');bind(93,{search:(c,i)=>d.search(c,i)},'hybrid','Bounded cursor-based search and optional database search; dedicated full-text index for scale.');provider(94,['purge','configure'],'CDN provider.');provider(95,['transform','status'],'Media processing worker.');bind(96,{validate:(_c,i)=>validateRecord(object(i.data),object(i.schema))});bind(97,{delete:(c,i)=>d.softDelete(c,i)});bind(98,{archive:(c,i)=>d.archive(c,i)});bind(99,{mask:(_c,i)=>redact(i.data)});
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Durable version/checksum, bounded streaming, atomic metadata/state transitions and external storage lifecycle reconciliation.

## Security boundary
Object/row ACL and tenant prefixes; validate sizes and types, redact private metadata; no public access by default.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Storage failures, transfer sizes, restore integrity, rejected uploads and retention lag.

## Verification design
Concurrent writes retain versions; deleted/held version remains according to policy.

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
