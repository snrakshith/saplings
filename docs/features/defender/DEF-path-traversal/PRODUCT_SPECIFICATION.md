# DEF-path-traversal — path traversal

Release: 0.17.0 · Product specification

## Purpose and users
Provide runtime control for path traversal in authorized SaaS HTTP traffic.

**Primary consumer:** Security / platform operator.

## Functional contract
Use configured defender signal or policy path; score/decision and event/alert behavior depend on configuration. The current implementation contains the matching signal/control.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Canonicalize paths before authorization and reject escape from allowed roots; test encoded traversal and safe relative paths.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Canonicalize paths before authorization and reject escape from allowed roots; test encoded traversal and safe relative paths. Verify allow/monitor/block or configured outcome, redacted event, correct tenant and response status; test safe normal traffic and dependency failures.

## Scope and non-goals
Bounded runtime heuristics and policy checks do not replace secure application code or edge protection. External WAF/DDoS, route-specific policy and independent validation remain required.

## Status
Current control path present; effectiveness not certified. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
