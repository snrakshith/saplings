# SAAS-108 — Scheduled reports

Release: 0.17.0 · Technical specification

## Implementation status
hybrid reference mapping; per-feature production proof not established. Register report worker.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:82`
- `packages/sdk/src/analytics/analytics.ts`
- `packages/sdk/src/feature-flags/flags.ts`
- `packages/sdk/src/tenancy/resources.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-108', 'schedule', input)`. All registered actions: schedule. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-108:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
(107,{report:(c,i)=>n.count(c,i)});bind(108,{schedule:(c,i)=>w.enqueue(c,{type:'report.generate',payload:i,dueAt:i.dueAt,idempotencyKey:i.idempotencyKey})},'hybrid','Register report worker.');bind(109,{report:(c,i)=>n.metric(c,i)});bind(110,{capture:(c,i)=>n.track(c,{name:'error',properties:object(redact(i)),subjectId:c.actorId}),report:(c,i)=>n.count(c,{...i,name:'error'})});bind(111,{report:(c,i)=>n.experiment(c,i)});bind(112,{report:(c,i)=>n.count(c,i)});
```

## Configuration and dependencies
SDK reference path; configure provider, worker or application policy as applicable.

## Execution, persistence and consistency
Versioned event schema, dedup keys, time-window semantics and reproducible query snapshots; bounded indexing and aggregation.

## Security boundary
Consent and tenant/subject authorization; pseudonymize or redact PII; enforce report limits.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Ingestion lag, duplicate/rejected event rate, query duration and aggregation discrepancies.

## Verification design
DST/missed schedule runs once; revoked recipient no longer receives report.

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
