# SAAS-165 — Deployment pipelines

Release: 0.17.0 · Technical specification

## Implementation status
provider reference mapping; per-feature production proof not established. CI/CD control plane.

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
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-165', 'deploy', input)`. All registered actions: deploy, status, rollback. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-165:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
hybrid','Alert routing external.');provider(165,['deploy','status','rollback'],'CI/CD control plane.');provider(166,['plan','apply','destroy'],'Infrastructure provisioning control plane.');provider(167,['scale','status'],'Kubernetes autoscaler/control plane.');provider(168,['backup','restore','drill'],'Disaster recovery provider and operational drills.');bind(169,{status:()=>({acceptingWork:this.lifecycle.ready})},'local','Lifecycle.close() explicitly called by application shutdown hook.');bind(170,{validate:()=>({valid:true,app:sdk.config.app.id})});
```

## Configuration and dependencies
GitHubWorkflowAdapter; must configure a real capability adapter; provider registration is not execution.

## Execution, persistence and consistency
Bounded deadlines and retries, durable operation state and reconciled external effects; rollback and recovery runbooks.

## Security boundary
Scoped service accounts, approved environment and explicit authorization for destructive operations; redact secrets.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Operation duration/errors, dependency readiness, saturation, alert delivery and recovery time.

## Verification design
Failed rollout restores previous revision; stale callback cannot mark newer release ready.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.

- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@sapling/sdk`. **Implementation path:** SDK capability adapter or provider placeholder. **Status:** provider-needed.

No ownership relocation; application/provider contracts and production evidence remain required.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
