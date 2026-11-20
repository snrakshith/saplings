# SCAN-06 — CORS Misconfiguration Scanner

Release: 0.17.0 · Product specification

## Purpose and users
Detect and review CORS risk or quality indicators on approved application assets.

**Primary consumer:** Security engineer / authorized application owner.

## Functional contract
Current execution classification: static + passive-http. Report findings with check ID, severity, evidence and remediation, and keep failed/skipped categories distinct.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Exercise allowed/disallowed origins, credentials and preflight for configured routes; verify actual response Vary and reject unsafe wildcard combinations.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Seed one vulnerable/misconfigured CORS fixture and one compliant negative control; verify rule/report accuracy, severity, safe bounded execution, explicit unavailable/failed state, source hash and reviewed triage. Run configured engine against authorized fixture; assess misses and false positives.

## Scope and non-goals
Not a complete category or verified vendor parity. Static pattern hits are review candidates, not exploit proof. 

## Status
heuristic-or-passive; static + passive-http; independent efficacy pending. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
