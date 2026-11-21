# SAAS-133 — API key scopes

Release: 0.17.0 · Product specification

## Purpose and users
Provide api key scopes as a reusable apis & developer tools capability for SaaS applications.

**Primary consumer:** API developer / service owner.

## Functional contract
Registered actions: **check**. Reference implementation; production validation and app-specific authorization pending.. The target product contract requires the feature-specific acceptance tests below.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Enforce API key scopes at each endpoint and worker; revoke cached grants and prevent wildcard elevation.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Key with read scope cannot mutate; revoked key rejected across replicas.

## Scope and non-goals
Reference implementation; production validation and app-specific authorization pending.

## Status
local reference mapping; per-feature production proof not established. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)

## v0.15.0 — root refactor and critical-code review

**Source location:** `packages/sdk/src/capabilities/registry.ts` and adjacent root modules, not `packages/sdk/src/expanded/`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.

Related shared implementation path hardened; feature-specific acceptance still open.

- The **separate** `@saplings/harbor` now has distributed transactional rate/ban store adapters, API-key authentication, optional bot challenge driver and actual verified TLS-proxy ingress checks. This does **not** automatically protect application routes: configure the gateway/plugins, durable storage, upstream scopes and driver integrations (`tests/v015.test.mjs`).

**Evidence:** `scripts/verify-sdk-root-refactor.mjs` checks all 31 moved modules; `tests/v015.test.mjs` covers direct platform and tenant-export hardening; `docs/technical-specifications/PRODUCTION_READINESS_015.md` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.
## v0.17.0 architectural ownership

**Authoritative package:** `@saplings/harbor`. **Implementation path:** Kingsman AccessService authorization consumed at HTTP boundary. **Status:** partial/shared enforcement.

Harbor authenticates/limits ingress; SDK does not drop application-level RBAC, CSRF, business quotas or authorization.

**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.


## v0.17.0 acceptance update

New common acceptance requirements: denied feature calls, unauthorized actors, unknown operations, and offboarded tenant operations must all fail without side effects. For configured domain policies, unauthorized fields and rows must not be disclosed. This feature retains its prior reference implementation and still requires its feature-specific functional acceptance.
