# zod-compat — Upstream Zod compatibility

Release: 0.17.0 · Product specification

## Purpose and users
Upstream Zod compatibility

**Primary consumer:** TypeScript API developer.

## Functional contract
Pinned upstream entry points (v3/v4/Mini/Core/locales); native parser preserved.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Install pinned dependency and verify every exported entry point, runtime identity, TS inference and locale imports with conformance suite.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Install pinned dependency and verify every exported entry point, runtime identity, TS inference and locale imports with conformance suite. Record real provider or runtime evidence and failure/recovery behavior.

## Scope and non-goals
Implemented integration path; live verification and remaining feature-specific engineering open.

## Status
Reference code present; not production validated. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
