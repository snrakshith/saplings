# DEF-rate-state — rate state

Release: 0.17.0 · Product specification

## Purpose and users
Provide runtime control for rate state in authorized SaaS HTTP traffic.

**Primary consumer:** Security / platform operator.

## Functional contract
Use configured defender signal or policy path; score/decision and event/alert behavior depend on configuration. This is a cross-cutting control or integration target, not a standalone signal.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Use persistent Valkey/Postgres rate state with atomic windows and expiry; verify fail-closed and multi-replica behavior.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Use persistent Valkey/Postgres rate state with atomic windows and expiry; verify fail-closed and multi-replica behavior. Verify allow/monitor/block or configured outcome, redacted event, correct tenant and response status; test safe normal traffic and dependency failures.

## Scope and non-goals
Bounded runtime heuristics and policy checks do not replace secure application code or edge protection. External WAF/DDoS, route-specific policy and independent validation remain required.

## Status
Cross-cutting integration / policy; production closure pending. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
