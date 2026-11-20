# Gaps, risks and implementation roadmap

This is a deliberate **coverage-and-foundation deliverable**. It preserves feature scope and provides working reference code, but it does not claim that all 182 SaaS features or 200+ security verification checks are working.

## Current delivery classification

- **182 SaaS feature entries**: 54 `native` reference mappings; 128 `adapter` integration-contract mappings. No feature is excluded from the master inventory. `native` is a *reference behavior classification*, not proof of complete product behavior.
- **41 security scanner categories**: 15 with source/static or passive-HTTP heuristics; 26 needing specialist tools, provider APIs, or full implementations.
- **200+ vendor checks**: **not mapped or implemented**; count is the public vendor's marketing claim and the per-check list is not fully retrievable/verified here.
- **Runtime defender**: request metadata rules, in-memory rate window, basic alert cooldown, monitor/block mode, configurable hooks; **not** an enterprise bot detection/SIEM/WAF equivalent.

## P0 — blockers for any production deployment

1. Replace in-memory `Store` and object storage; integrate Postgres/Drizzle and S3, apply access isolation, RLS and transaction controls.
2. Add verified authentication (Better Auth/Keycloak/IdentityOS), standard JWT/OIDC verification, MFA/SSO and session revocation.
3. Protect public routes by authN/authZ and authorization policy independent of scanner heuristics.
4. Distributed rate limit and abuse state via Valkey/edge WAF; explicit proxy trust and correct IP parsing.
5. Atomic quotas/entitlements and transaction-safe payment state; razorpay signature verification, refunds reconciliation and secure webhook replay/idempotency.
6. Secret managers, credential rotation, strong encryption, retention/deletion, tamper-evident durable audit.
7. Typed validation for all request DTOs; add formal schema validation (Zod) for full config and module inputs.
8. Logging, tracing, PII redaction, metrics, alerting, SLOs, incident operations, threat event persistence.
9. Deterministic/idempotent workers with leased jobs, reliable queues, DLQ and outbox/inbox; the in-process worker must not serve as a durable job platform.
10. Security assessment, integration testing under multiple tenants, load tests, dependency/SBOM scans, container hardening.

## P1 — feature-completion workstreams

- Identity: signup/login/passwordless, SSO, MFA, device trust, user invitations, sessions, token lifecycle.
- Billing: plans/subscriptions/invoices/credits/tax/trials/dunning, payments reconciliation.
- Communications: templates/preferences, retries, delivery tracking, push, in-app, regulatory requirements.
- Data: presigned URLs, files metadata DB, backup/restore, document versions, archival and search.
- Intelligence: event ingestion stream, identity resolution, reports, analytics, funnels, retention, error diagnostics.
- Developer platform: API versioning, developer portal, OpenAPI, documented webhooks and public SDK client.
- Product: experiments, targeting, remote flags/config, plugins, themes, custom domains/i18n.
- Operations: CI/CD, circuit breakers, bulkheads, chaos/recovery tests, failover and DR.

## Security scanner workstreams

- Implement the remaining 26 categories through official APIs or open-source tool adapters and normalize results with `scannerId`, `checkId`, evidence, confidence, remediation and outcome.
- Build a dedicated **check registry** with authoritative verification cases, explicit preconditions and proof type (static, passive, active, authenticated, manual) instead of inventing 200 check IDs.
- Add authorized two-account tenant-isolation tests; verify separate tenants cannot read/write each other's data across all endpoints.
- Extend defender with distributed aggregation, behavior baselines, IP rotation resilience, bot/device fingerprinting, policy tuning, threat intelligence, alert fan-out and case management.
- Defer AI fix engine as agreed; keep fixes manual/remediation-only in scanner output.

## P2 — hardening / platform-scale extensions

Consumer SDK packaging for browser/React Native if requested, edge gateway integration, centralized policy control plane, self-serve developer portal, provider conformance suites, generated OpenAPI, telemetry/observability SLOs, regulated data-residency and audit certifications.

## Honest release criteria

A feature is `native production` only after passing contract+integration+security tests, persistence correctness, concurrency/tenant isolation tests and documented operational runbooks. Do not change entries to production-complete simply because they are present in `docs/saas-features.json`.
