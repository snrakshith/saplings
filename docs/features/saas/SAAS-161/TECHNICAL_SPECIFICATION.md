# SAAS-161 — Timeouts

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Executable typed utilities exported; do not expose callbacks over HTTP.

## Source of truth
- `packages/sdk/src/registry.ts:86`
- `packages/sdk/src/providers.ts`
- `packages/sdk/src/provider-operations.ts`
- `packages/sdk/src/provider-workflow.ts`
- `packages/sdk/src/control-plane.ts`
- `packages/sdk/src/reliability.ts`
- `packages/sdk/src/operations.ts`
- `packages/sdk/src/worker.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-161', 'describe', input)`. All registered actions: describe. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-161:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
ind(158,{get:()=>sdk.readiness()});bind([159,160,161,162],{describe:()=>({available:'Use exported CircuitBreaker, retry, timeout, Bulkhead around trusted service functions'})},'local','Executable typed utilities exported; do not expose callbacks over HTTP.');bind(163,{report:()=>this.metrics.snapshot()});bind(164,{record:(c,i)=>insert(s,c,'operational-alerts',{message:text(i.message),severity:text(i.severity),status:'open'}),list:(c,i)=>page(s,c,'operational-alerts',i)},'hybrid','Alert routing external.');provider(165,['deploy','status','rollback'],'CI/CD control plane.');provider(166,['plan','apply','destroy'],'Infrastructure provisioning control plane.');provider(167,['scale','status'],'Kubernetes autoscaler/control plane.');provider(168,['backup','restore','drill'],'Disaster recovery provider and operational drills.');bind(169,{status:()=>({acceptingWork:this.lifecycle.ready})},'local','Lifecycle.close() explicitly called by application shutdown hook.');bind(170,{validate:()=>({valid:true,app:sdk.config.app.id})});
```

## Configuration and dependencies
SDK reference path; transactional/persistent infrastructure where state is written.

## Execution, persistence and consistency
Bounded deadlines and retries, durable operation state and reconciled external effects; rollback and recovery runbooks.

## Security boundary
Scoped service accounts, approved environment and explicit authorization for destructive operations; redact secrets.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Operation duration/errors, dependency readiness, saturation, alert delivery and recovery time.

## Verification design
Timeout returns bounded response; ignored cancellation cannot commit stale lease.

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

Harbor request timeout; SDK job/business deadline

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
