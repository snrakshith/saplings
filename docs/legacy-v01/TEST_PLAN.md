# Testing and verification plan

## Included runnable tests

`npm test` runs Node's built-in test runner against compiled SDK source. Tests cover inventory counts, tenant isolation for resources/storage, RBAC deny/allow, API key secrecy/revocation, quotas, deterministic flag rollouts, job retry/DLQ, webhook HMAC, audit, runtime defender blocking/rate windows, production volatile-store rejection and basic scanner finding/redaction.

## Required before production

- Database: transaction/rollback behavior, isolation levels, concurrent quotas, RLS cross-tenant read/write, connection pooling, migrations and backup recovery.
- Cloud adapters: S3 metadata/versioning/IAM/SSE policies, SES/SNS throttling and delivery receipts, Razorpay orders/settlement/refunds/webhook signatures.
- Auth: SSO/OIDC flow, MFA enrollment, clock skew, issuer/audience validation, key rotation, session fixation, CSRF and revocation.
- HTTP: Express middleware order, malformed payloads, rate-limit bypasses, proxies, false positives/negatives, DoS stress.
- Scanner: golden-file test fixtures per check, SARIF validation, safe URL allowlists, SSRF and DNS rebinding resistance, checks run/pass/fail/unknown semantics.
- Jobs: worker crash/restart, concurrency, duplicate delivery, at-least-once semantics, multi-tenant fairness and scheduling.
- Operations: performance/load/stress/spike/soak, circuit breakers, alerts, trace sampling, chaos testing, rollback and deployment validation.
- Supply chain: `npm audit`, Semgrep, Gitleaks, Trivy, SBOM/provenance, license checks, third-party code review.

A `doctor` output is an informational checklist, not a security certification.
