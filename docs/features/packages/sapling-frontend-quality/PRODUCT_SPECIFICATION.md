# sapling-frontend-quality — @sapling/frontend-quality

Release: 0.17.0 · Product specification

## Purpose and users
Maintain @sapling/frontend-quality as an independently consumable workspace package in the unified platform.

**Primary consumer:** SDK/platform maintainer.

## Functional contract
Package entry points: ., ./browser, ./react, ./register.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Validate package exports, type declarations, dependency and peer boundaries, runtime/dev separation, clean install and actual consumer example.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Build and pack @sapling/frontend-quality from a clean frozen pnpm install; run import/type checks for supported entry points and a consumer integration test. Verify no production bundle accidentally includes dev engines or incompatible browser/Node code.

## Scope and non-goals
Package-level compilation or registration is not per-feature functional completeness; see feature dossiers and release blockers.

## Status
Workspace package retained; full installed-workspace release gate open. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
