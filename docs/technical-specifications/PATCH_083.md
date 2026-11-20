# v0.8.3 — realtime admission and scanner evidence hardening

Second patch in the 0.8.2–0.8.4 engineering sequence. No new workspace or external dependency. The entire 18-package v0.8.2 codebase and 182/41/32 inventories are preserved.

## Implementation

- `@sapling/realtime`: `ConnectionAdmission`, `MemoryConnectionAdmission` and `RedisConnectionAdmission` implement a tenant-wide concurrent connection cap. Redis uses atomic single-key sorted-set leases and server time; expiration frees crashed connections. `RealtimeHub.open()` is asynchronous, acquires a slot, checks session validity and releases the slot on close. SSE, WebSocket and Socket.IO route through `open()`. Legacy `connect()` is available when no admission or session validation is configured; it rejects instead of bypassing configured admission. Memory admission is rejected by SDK production config.
- Optional `validateSession` checks a trusted session/identity source before subscription, publish, connection opening and periodic revalidation. Both ephemeral and durable subscribers recheck channel authorization periodically. Failures close sessions. Existing journal replay remains intact. Revocation is bounded by recheck interval plus dependency latency, not instantaneous; shared identity revocation policy must be configured and tested.
- Scanner evidence import rejects empty Trivy results, malformed target sections, non-object npm audit vulnerability maps and missing or failed Lighthouse audits. It no longer silently treats these examples as empty success. A report is still only a trusted assessment input and cannot prove vendor parity.

## Configuration

```ts
realtime: {
  enabled: true,
  journal: new RedisStreamJournal(redis),
  admission: new RedisConnectionAdmission(redis, 100),
  authenticate: verifyRequest,
  authorize: authorizeChannel,
  validateSession: verifyCurrentSession,
  recheckMs: 1000,
  allowedOrigins: ['https://app.example.com']
}
```

The sample functions and Redis client must be supplied by the host. Use `await hub.open(...)` for programmatic connections when an admission or validation policy is configured. Redis leases use the configured session lifetime plus authorization timeout; reconnect before expiration. Admission availability is required to open a new connection. Network partitions can delay revocation until the next check and leases are not a substitute for capacity planning. This implements per-tenant global caps, not per-user quotas or a hard global cap for all tenants. Live Redis/Valkey, WS/Socket.IO and multi-replica failover tests remain release requirements.

## Verification

Core and dependency-free quality builds passed. 97 local regression tests passed, five new in `tests/v083.test.mjs`. Redis protocol is mocked, not live. The evidence gate remains blocked; see RELEASE_BLOCKERS.md. Remaining durable acknowledgments, app-specific authorization, legal hold and transactional HTTP business effects are targeted in the next patch; external service verification is not implied.
