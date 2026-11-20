# harbor-types-gatewaycontext — GatewayContext (harbor/types)

Release: 0.17.0 · Product specification

## Purpose and users
Reusable type-level contract exported by harbor/types.ts.

**Primary consumer:** Gateway / infrastructure engineer.

## Functional contract
Use GatewayContext through its public package entry point. The declaration in the technical specification is the current contract.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Validate GatewayContext contract by compile-time positive and negative type fixtures, compatibility with consumers and declaration emit; ensure it accurately describes runtime constraints.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Typecheck valid and invalid uses of GatewayContext; verify declaration resolution and assignability in an actual consuming package.

## Scope and non-goals
Source declaration retained; individual exhaustive production/conformance verification not established. 

## Status
Exported type contract. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
