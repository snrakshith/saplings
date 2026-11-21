# SAAS-053 — Secrets management

Release: 0.17.0 · Technical specification

## Implementation status
hybrid reference mapping; per-feature production proof not established. Encrypted local vault; external KMS and key rotation policy required.

## Source of truth
- `packages/sdk/src/capabilities/registry.ts:76`
- `packages/sdk/src/platform/operations.ts`
- `packages/sdk/src/audit/audit.ts`
- `packages/sdk/src/data/data.ts`
- `packages/sdk/src/security/security-state.ts`

## Public contract / current implementation
Typed registry call: `sapling.invokeCapability(ctx, 'SAAS-053', 'get', input)`. All registered actions: get, put, rotate. Context: `ActorContext`; generic payload: `JsonRecord`; result currently `unknown` through the generic registry. Require `capabilities:SAAS-053:<action>` permission plus service/domain checks.

Current binding excerpt (may include adjacent registrations):
```typescript
bind(53,Object.fromEntries(['get','put','rotate'].map(action=>[action,(c:ActorContext,i:JsonRecord)=>this.operations.vault(c,action,i)])),'hybrid','Encrypted local vault; external KMS and key rotation policy required.');bind(54,{encrypt:(c,i)=>this.crypto().encrypt(c,text(i.plain,'plain',1000000)),decrypt:(c,i)=>this.crypto().decrypt(c,i)},'hybrid','Configure encryption key; storage-wide encryption is infrastructure policy.');bind(55,{verify:(_c,i)=>this.operations.tls('verify',i),configure:(_c,i)=>this.operations.tls('configure',i)},'hybrid','Fixed HTTPS verification and configured certificate control; certificate control plane adapter required for configuration.');bind([56,57,58,59,60,66,67],{policy:()=>sdk.httpPolicies.edgePolicy(sdk.config.security.defender)},'hybrid','Enforced by configured runtime middleware; do not expose policy to clients.');bind(61,{run:(c,i)=>sdk.config.app.environment==='production'||sdk.config.services?.retentionPolicies?this.governance.sweep(c,text(i.collection),{after:i.after===undefined?undefined:text(i.after),limit:i.limit===undefined?undefined:integer(i.limit,'limit',1,500),confirm:i.confirm===true} …
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
Rotate keys and recover old ciphertext; unauthorized read and log leakage denied.

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
