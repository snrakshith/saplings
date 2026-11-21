# SAAS-083 — Object storage

Release: 0.17.0 · Technical specification

## Implementation status
hybrid reference mapping; per-feature production proof not established. Storage adapter required in production.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:81`
- `packages/sdk/src/storage/storage.ts`
- `packages/sdk/src/data/data.ts`
- `packages/sdk/src/storage/media.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-083', 'upload', input)`. All registered actions: upload, download, list, delete. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-083:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind([83,84],{upload:(c,i)=>sdk.storage.upload(c,{key:text(i.key),data:Buffer.from(text(i.base64,'base64',15000000),'base64'),metadata:i.metadata as Record<string,string>}),download:(c,i)=>sdk.storage.download(c,text(i.key),i.version===undefined?undefined:text(i.version)),list:(c,i)=>sdk.storage.list(c,String(i.prefix??'')),delete:(c,i)=>sdk.storage.delete(c,text(i.key))},'hybrid','Storage adapter required in production.');provider(85,['sign'],'Presigned URL provider; use tenant-scoped object key.');bind(86,{get:async(c,i)=>{const r=await sdk.storage.download(c,text(i.key));return r?{metadata:r.metadata,version:r.version,bytes:r.data.byteLength}:undefined;}});bind(87,{get:(c,i)=>sdk.storage.download(c,text(i.key),text(i.version))});crud(88,'documents',required('title','objectKey'));bind(89,{import:(c,i)=>d.import(c,i)});bind(90,{export:(c,i)=>d.export(c,i)});bind(91,Object.fromEntries(['backup','restore','status'].map(action=>[action,(c:ActorContext,i:JsonRecord)=>this.operations.backup(c,action,i)])),'hybrid','Bounded encrypted tenant logical backup; physical DB and object-store backup still external.');provider(92,['plan','apply', …
```

## Configuration and dependencies
SDK reference path; configure provider, worker or application policy as applicable.

## Execution, persistence and consistency
Durable version/checksum, bounded streaming, atomic metadata/state transitions and external storage lifecycle reconciliation.

## Security boundary
Object/row ACL and tenant prefixes; validate sizes and types, redact private metadata; no public access by default.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Storage failures, transfer sizes, restore integrity, rejected uploads and retention lag.

## Verification design
Cross-tenant keys and oversized files denied; version restore and delete semantics verified.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK hybrid binding. **Status:** existing-implementation; feature-specific acceptance pending.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
