> **v0.15.0:** [Flat SDK implementation and critical-code changes](../technical-specifications/ENGINEERING_015.md) · [evidence-based production assessment](../technical-specifications/PRODUCTION_READINESS_015.md). P0/P1 items below remain open until real accepted evidence; older version claims are historical.

**Delta:** persistent transactional rate/ban stores, multi-window independent quotas, optional real challenge/ban drivers, scoped key-auth and per-request verified production TLS proxy boundary are implemented. Still open: real bot/WAF/edge drivers, Redis throughput, production deployment, config governance and all listed acceptance work.

# API Gateway — Detailed Engineering and Release Backlog

Status at v0.13.0: **Core implemented; production incomplete.** The source JSON is a desired-state config, not proof that every plugin or operational feature is active. Items remain unchecked until real infrastructure and threat/quality evidence are recorded.

## P0 — correctness and security
- [ ] Implement and test distributed Redis/Valkey limiter/admission adapter and circuit-breaker/quota state across all replicas; failure modes cannot silently fall back to unsafe local limits.
- [ ] Verify real HTTPS SNI/certificate chain, TLS rotation/renewal, proxy subnet trust and namespace-to-upstream restrictions; require explicit certificate ownership and startup failure on missing secrets.
- [ ] Integrate independently verified identity/JWKS issuer, audience, signature rotation and cache; test missing, stolen, revoked, wrong-realm, wrong-key tokens. Current in-process realm verifier has a single key.
- [ ] Add secure API-key hashing/storage, key rotation, per-consumer revocation, tenant mapping and mTLS/private-key JWT authentication where configured. Current key auth resolves static configuration per request.
- [ ] Implement proper authorized/verified threat feeds, geo service, bot challenges, edge DDoS bans and false-positive triage. UA-only blocking is a weak heuristic; non-empty configured feeds fail closed if unbound.
- [ ] Validate `proxy-cache` isolation under key rotation/logout, dynamic authorization, downstream cache-control and privacy; current bounded local cache is not shared.
- [ ] Add WebSocket/gRPC/TCP/TLS passthrough only with explicit protocol-specific auth, size and admission controls.
- [ ] Define immutable config revision, schema migration, GitOps diff/approval, rollback and drift monitoring. `metadata.annotations` do not implement GitOps reconciler.

## P1 — reliability and platform features
- [ ] Add real tenant/consumer accounting, version-based routing beyond path prefix, health threshold hysteresis, passive timeout/status counters, active probes with timeout per host and recovery across replicas.
- [ ] Support streaming large responses/uploads with backpressure and WAF/multipart inspection without unbounded buffering; current request/response caps reject large uploads.
- [ ] Implement rule-engine schema registration/OpenAPI-based JSON validator with sandboxed regex/schema cost; current `validateBody` is an injected callback.
- [ ] Implement actual log sinks in sample (`stdout`, file rotation, Loki, Mongo TTL, audit, SIEM), redaction pipeline and end-to-end trace propagation. `onEvent` alone is not equivalent.
- [ ] Implement rate-limit IETF headers and stable global/consumer quotas across node restarts, accurate Retry-After, dynamic consumption and audit.
- [ ] Add robust route ambiguity detection (overlapping host/method/path), RFC-compliant URI normalization and header/trailer handling against request smuggling.
- [ ] Develop service discovery DNS caching, rolling canary weights and failure/retry metrics with test topology; connection-pool/backpressure integration.
- [ ] Extend CORS policy to credentials, vary handling on proxy responses, allowed headers and external allowed origins; test actual browsers.

## P1 — tests and infrastructure
- [ ] Run TLS/HTTP production-like gateway behind real ingress and Kubernetes with students/identity upstreams, real Redis/Valkey limiter, failover and canary distribution.
- [ ] Execute malicious header/IP/body/JWT and unauthenticated/authorization regression tests with approved fixture accounts, independent security audit and documented threat model.
- [ ] Install `yaml` from locked pnpm deps; run YAML parse and equivalence tests. The minimal YAML has a different realm (`main`) from the full JSON (`school-platform`); do not combine them by default.
- [ ] Execute load/stress/spike/soak, latency p95/p99 and upstream failure recovery; record SLO and SRE approval.

## P2 — developer experience
- [ ] Build an admin/management API and GitOps dry-run/plan/diff tool with approved change workflow, declarative schema editor and immutable history.
- [ ] Generate TypeScript route/client types from approved gateway schema and support config lint IDE diagnostics.
- [ ] Build dashboard, plugin lifecycle and replayable operational incident evidence.

**Exit:** all supported plugin actions tested against representative upstreams, all required adapter paths connected, high/critical risks resolved or explicitly approved, and current-source release gates passed. No Kong plugin or HA parity claim until independently measured.

**Production startup guard:** enabled `bot-detection` challenge and `ddos-protection` ban actions from the uploaded full config are deliberately rejected, not treated as operational, until real drivers are implemented.
