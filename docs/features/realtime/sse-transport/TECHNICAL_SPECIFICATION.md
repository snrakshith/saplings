# sse-transport — SSE connection lifecycle

Release: 0.17.0 · Technical specification

## Implementation status
Reference code present; not production validated. Implemented integration path; live verification and remaining feature-specific engineering open.

## Source of truth
- `packages/realtime/src/index.ts`

## Public contract / current implementation
See packages/realtime/src/index.ts and package exports. Native server-sent events, reconnect cursor and bounded connection admission.

## Configuration and dependencies
Configure provider credentials or relevant installed dependency/approved test environment.

## Execution, persistence and consistency
Bound connection state, payload, backlog, ACK window and leases; durable journal/replay, shared fan-out and session revocation; define reconnect and slow-consumer semantics.

## Security boundary
Authenticate and authorize channels with server-resolved tenant/user identity; validate replay cursor and enforce quotas; never trust client identity.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Connections, publish/receive lag, replay gaps, ACK backlog, dropped consumers and distributed admission failure.

## Verification design
Test proxy buffering, reconnect, authorization/revocation, expired cursor and multireplica durability. Record real provider or runtime evidence and failure/recovery behavior.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
