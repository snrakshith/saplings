# SAAS-052 — Runtime threat defender

Release: 0.17.0 · Technical specification

## Implementation status
local reference mapping; per-feature production proof not established. Reference implementation; production validation and app-specific authorization pending.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:75`
- `packages/sdk/src/platform/operations.ts`
- `packages/sdk/src/audit/audit.ts`
- `packages/sdk/src/data/data.ts`
- `packages/sdk/src/security/security-state.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-052', 'assess', input)`. All registered actions: assess. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-052:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
defined?undefined:text(i.url));}});bind(52,{assess:(c,i)=>sdk.defender.assess({method:typeof i.method==='string'?i.method:undefined,url:typeof i.url==='string'?i.url:undefined,body:i.body,tenantId:c.tenantId,userId:c.actorId})});
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
Exercise legitimate and malicious staging fixtures, proxy trust, rate limit multi-replica and alert delivery.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

Related shared implementation path hardened; feature-specific acceptance still open.

- The **separate** `@saplings/harbor` now has distributed transactional rate/ban store adapters, API-key authentication, optional bot challenge driver and actual verified TLS-proxy ingress checks. This does **not** automatically protect application routes: configure the gateway/plugins, durable storage, upstream scopes and driver integrations (`tests/v015.test.mjs`).

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/sdk`. **Implementation path:** SDK local binding. **Status:** existing-implementation; feature-specific acceptance pending.

Security defender detection lives @saplings/security; Harbor applies edge plugins

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 implementation cross-check

- No new feature-specific implementation in this patch; original gap checklist remains authoritative.

See the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.
