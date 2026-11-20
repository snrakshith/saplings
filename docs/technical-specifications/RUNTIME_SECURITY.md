# Runtime security technical evaluation

| Control | Implementation / source | Required validation |
|---|---|---|
| Identity | accounts, TOTP, session, JWT/OIDC, API key code in SDK | MFA recovery, replay, session revocation, OIDC broker and route abuse |
| RBAC/ABAC | `access.ts`, `capabilities.ts`, resource checks | Object/field-level permission matrix, role escalation and tenant tests |
| Tenant boundary | Store tenant transaction, PostgreSQL RLS, generic capability guard | Actual non-owner RLS role and application-wide isolation |
| Threat scoring | `security/src/defender.ts` | Tune heuristics against app traffic, prevent bypasses; not a WAF substitute |
| Rate limiting | policy, store rate state and Valkey adapter | Shared state, saturation, fail-closed behavior |
| IP, TLS, CORS and CSRF | `policy.ts` | Trusted edge/proxy identity, header normalization, cookie token binding |
| Audit / alert | SDK audit, threat-event storage, incident records | Retention, alert routing, immutable evidence and SIEM access |
| Webhooks | verified raw-body signatures, replay inbox, outbox and delivery worker | Verify provider secret rotation, clock skew, duplicate deliveries, recipient idempotency |
| Realtime | trusted handshake, channel policy, per-process limits | Actual WS/SSE/Socket.IO, cross-replica Pub/Sub, revocation, reconnect and capacity |
| Middleware | deadline, JSON validation, permissions, cache, error masking, multipart | App-specific ingress bounds, MIME inspection, cancellation, safe cache vary and idempotency |
| Data protection | envelope crypto, secrets vault, adapter storage ACL | KMS, key rotation, backups, object ACL and legal retention |

Threat model: untrusted HTTP body/query/path, headers, tokens, actor and tenant identifiers; external provider responses; worker payloads; stored user content; compromised dependency. Trust only server-verified context, fixed allowlisted destinations and reviewed configuration callbacks. In production use parameterized queries, least privilege, dependency pins, TLS, network policy and explicit application authorization. Do not expose the generic feature registry as a public action API. Middleware/defender inspection cannot prove SQL/XSS prevention or complete application authorization. Independent audit remains mandatory; scanner output is a heuristic, not independent proof. See `../INDEPENDENT_SECURITY_AUDIT.md` and `SECURITY_SCANNER_EVALUATION.md`.
