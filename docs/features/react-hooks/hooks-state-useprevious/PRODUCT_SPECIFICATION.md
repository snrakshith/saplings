# hooks-state-useprevious — usePrevious (hooks/state)

Release: 0.17.0 · Product specification

## Purpose and users
Reusable public implementation exported by hooks/state.ts.

**Primary consumer:** React frontend developer.

## Functional contract
Use usePrevious through its public package entry point. The declaration in the technical specification is the current contract.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Exercise React 18 and 19 real renderer with state changes, unmount, dependency changes and server rendering; assert no stale update or resource leak. For usePrevious, explicitly cover its documented arguments, output, error behavior and boundaries in the source declaration below.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Add a focused fixture for usePrevious using its actual declaration, then assert success, edge/error cases and the applicable react-hooks acceptance requirements. Exercise React 18 and 19 real renderer with state changes, unmount, dependency changes and server rendering; assert no stale update or resource leak.

## Scope and non-goals
Source declaration retained; individual exhaustive production/conformance verification not established. 

## Status
Source implementation exists; dedicated parity proof pending. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
