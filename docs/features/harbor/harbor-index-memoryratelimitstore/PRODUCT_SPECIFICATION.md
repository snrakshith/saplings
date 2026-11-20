# harbor-index-memoryratelimitstore — MemoryRateLimitStore (harbor/index)

Release: 0.17.0 · Product specification

## Purpose and users
Reusable public implementation exported by harbor/index.ts.

**Primary consumer:** Gateway / infrastructure engineer.

## Functional contract
Use MemoryRateLimitStore through its public package entry point. The declaration in the technical specification is the current contract.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Test declared gateway operation with full and YAML fixtures, prefix/method/host, invalid request/auth, upstream failure and production TLS behavior; run live ingress/Redis fixture. For MemoryRateLimitStore, explicitly cover its documented arguments, output, error behavior and boundaries in the source declaration below.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Add a focused fixture for MemoryRateLimitStore using its actual declaration, then assert success, edge/error cases and the applicable harbor acceptance requirements. Test declared gateway operation with full and YAML fixtures, prefix/method/host, invalid request/auth, upstream failure and production TLS behavior; run live ingress/Redis fixture.

## Scope and non-goals
Source declaration retained; individual exhaustive production/conformance verification not established. 

## Status
Source implementation exists; dedicated parity proof pending. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
