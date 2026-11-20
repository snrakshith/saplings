# backend-performance — backend performance

Release: 0.17.0 · Product specification

## Purpose and users
Measure performance behavior of the backend application against approved acceptance thresholds.

**Primary consumer:** Quality engineer / application owner.

## Functional contract
Engine: Autocannon; run this suite independently or through a configured full-stack quality profile; record explicit pass/fail/skipped.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Baseline realistic route mix and payloads; compare p95/p99, throughput and errors to approved budget across replicas.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Baseline realistic route mix and payloads; compare p95/p99, throughput and errors to approved budget across replicas. Capture raw engine artifact, thresholds, environment and source revision; fail on missing evidence, unexpected skip or threshold violation.

## Scope and non-goals
Original source retained or adapted; live validation pending or configuration dependent. See original IMPLEMENTATION_MATRIX.md for current assertion coverage.

## Status
Suite registered; engine-specific production validation incomplete. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
