# Independent security audit brief

**Status: not conducted.** This is a handoff for an independent qualified security reviewer. The local engineering review and scanner cannot stand in for it.

Scope: SDK, configured providers, example application, real integration and deployment, tenant boundaries, threat model and supply chain. Record commit/source digest, environment, reviewer organization and authorization. Review credentials without logging them. Conduct tests only against authorized sandbox targets.

| Review area | Required evidence |
|---|---|
| Identity | Credential stuffing, session revocation, password reset enumeration, MFA replay/recovery, OIDC PKCE/nonce/issuer/audience, broker trust |
| Authorization | BOLA/IDOR, role grant, impersonation, resource mutations, queued jobs and event routing, same-tenant object ACL, tenant escape |
| Persistence | RLS role tests and direct DB access boundary, transaction correctness, append-only audit, backup access |
| Network | SSRF/redirect/egress, proxy trust, TLS, DNS ownership, rate limits, CSRF and CORS |
| Inputs | Schema/DTO, prototype pollution, upload limits, GraphQL complexity, injection, malformed webhook/signatures |
| Provider and supply chain | Scoped IAM, verified callbacks, tokenization, idempotency, dependency/lockfile/SBOM, secrets and container scans |
| Operational resilience | Worker lease crash/replay, overload/backpressure, event retention, logs/redaction, physical restore, alerts |

For each issue record severity, impact, reproducible evidence, owner, mitigation, retest and residual risk. Critical/high findings must be fixed and independently retested before approval; other risks require explicit signed acceptance. Provide signed report and independent reviewer approval bound to exact release and deployment. Do not store credentials or sensitive exploit evidence in the source archive.
