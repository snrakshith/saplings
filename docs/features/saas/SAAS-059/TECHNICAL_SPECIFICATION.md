# SAAS-059 — Rate limiting

Release: 0.17.0 · Technical specification

## Implementation status
hybrid reference mapping; per-feature production proof not established. Enforced by configured runtime middleware; do not expose policy to clients.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:76`
- `packages/sdk/src/platform/operations.ts`
- `packages/sdk/src/audit/audit.ts`
- `packages/sdk/src/data/data.ts`
- `packages/sdk/src/security/security-state.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-059', 'policy', input)`. All registered actions: policy. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-059:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
pter required for configuration.');bind([56,57,58,59,60,66,67],{policy:()=>sdk.httpPolicies.edgePolicy(sdk.config.security.defender)},'hybrid','Enforced by configured runtime middleware; do not expose policy to clients.');bind(61,{run:(c,i)=>sdk.config.app.environment==='production'||sdk.config.services?.retentionPolicies?this.governance.sweep(c,text(i.collection),{after:i.after===undefined?undefined:text(i.after),limit:i.limit===undefined?undefined:integer(i.limit,'limit',1,500),confirm:i.confirm===true}):d.retention(c,i)});bind(62,{delete:(c,i)=>d.remove(c,i)});bind(63,{record:(c,i)=>d.consent(c,i),history:(c,i)=>page(s,c,'consent-history',i)});bind(64,{export:(c,i)=>sdk.exportTenantData(c,i.collections===undefined?undefined:strings(i.collections))});bind(65,{list:(c,i)=>sdk.audit.list(c,integer(i.limit??100,'limit',1,500)),record:(c,i)=>sdk.audit.record(c,text(i.action),text(i.resourceType),i.resourceId===undefined?undefined:text(i.resourceId),object(redact(i.detail??{})))});
```

## Configuration and dependencies
SDK reference path; configure provider, worker or application policy as applicable.

## Execution, persistence and consistency
Versioned policy and source-bound evidence; immutable audit where required; bounded retention and legal hold coordination.

## Security boundary
Restrict configuration and evidence to authorized operators; redact secrets/PII; audit changes and keep policy fail closed.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Denials, error classifications, coverage/skip rate, stale evidence and alert delivery latency.

## Verification design
Burst across replicas enforces limits; dependency outage fails closed; reset tested.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

Related shared implementation path hardened; feature-specific acceptance still open.

- The **separate** `@saplings/harbor` now has distributed transactional rate/ban store adapters, API-key authentication, optional bot challenge driver and actual verified TLS-proxy ingress checks. This does **not** automatically protect application routes: configure the gateway/plugins, durable storage, upstream scopes and driver integrations (`tests/v015.test.mjs`).

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/harbor`. **Implementation path:** Harbor edge plugin and SDK defender policy view. **Status:** partial/shared enforcement.

Harbor authenticates/limits ingress; SDK does not drop application-level RBAC, CSRF, business quotas or authorization.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
