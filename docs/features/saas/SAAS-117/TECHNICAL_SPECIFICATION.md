# SAAS-117 — Workflow orchestration

Release: 0.17.0 · Technical specification

## Implementation status
hybrid reference mapping; per-feature production proof not established. Workflow worker required; no arbitrary code evaluation.

## Source of truth
- `packages/sdk/src/registry.ts:83`
- `packages/sdk/src/automation.ts`
- `packages/sdk/src/governance.ts`
- `packages/sdk/src/worker.ts`
- `packages/sdk/src/jobs.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-117', 'start', input)`. All registered actions: start. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-117:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
requeue:(c,i)=>w.requeue(c,i.id)});bind(117,{start:async(c,i)=>{await sdk.access.requireService(c,`workflows:execute:${text(i.workflow,'workflow',100)}`);return w.enqueue(c,{type:'workflow.execute',payload:i,idempotencyKey:i.idempotencyKey});}},'hybrid','Workflow worker required; no arbitrary code evaluation.');bind(118,{request:(c,i)=>w.approval(c,i),decide:(c,i)=>w.decide(c,i)});bind(119,{evaluate:(c,i)=>w.rule(c,i)});bind(120,{enqueue:async(c,i)=>{await sdk.access.requireService(c,`events:dispatch:${text(i.type,'event type',100)}`);return w.enqueue(c,{type:'event.dispatch',payload:i,idempotencyKey:i.idempotencyKey});}},'hybrid','Register event worker.');bind(121,{verify:(c,i)=>this.operations.webhook(c,'verify',i),dispatch:(c,i)=>this.operations.webhook(c,'dispatch',i)},'hybrid','Timestamp signature, replay inbox and atomic outbox; configure trusted secrets.');bind(122,{record:(c,i)=>idempotent(s,c,text(i.key),object(i.data),async tx=>insert(tx,c,'idempotent-records',object(i.data)))});bind(123,{append:async(c,i)=>{await sdk.access.requireService(c,`events:dispatch:${text(i.type,'event type',100)}`);return w.outbox(c,i);}},'hybrid','Atomic local append; delivery r …
```

## Configuration and dependencies
SDK reference path; configure provider, worker or application policy as applicable.

## Execution, persistence and consistency
Durable lease/attempt/checkpoint, atomic state/outbox, stable idempotency keys and explicit compensation for external effects.

## Security boundary
Authorize workflow type and target, least-privileged worker identity; never execute user-supplied code; validate payload.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Queue lag, expired leases, retry/DLQ count, workflow age and duplicate effects.

## Verification design
Fail after external effect; reconcile rather than duplicate; terminal and compensation states audited.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

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
