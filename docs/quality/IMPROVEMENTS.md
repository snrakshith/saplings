# Gaps, limitations and forward implementation plan

The monorepo targets all categories but **coverage is not equivalent to having complete domain-specific assertions**. Prioritize improvements based on failure risk and how broadly they benefit all Sapling apps.

## High priority — before treating this as organization-wide production ready

1. **Dependency/CI validation**: run pnpm install, TypeScript build, Docker builds and a real CI smoke run; fix versions and commit a lockfile. Initial assembly environment did not support this.
2. **Deep configuration validation**: adopt Zod/JSON Schema with schema versions, profile inheritance and strict custom adapter validation.
3. **Stronger safety**: CIDR-level egress restriction, DNS/redirect checks, exact cluster context validation, approvals/review and cleanup reconciliation.
4. **Secret handling**: structured logs with redaction, scoped artifact storage, masked env vars and explicit security testing data policy.
5. **Operational reliability**: retries for transient engine setup failures, cancellation, graceful signal teardown, retry-safe report upload.
6. **Secure engine packaging**: pinned test runner image, pinned browser binaries and external CLI tools, SBOM, license inventory and checksums.
7. **More precise status model**: distinguish unsupported/unavailable/inapplicable from failed/skipped while preserving fail-closed release gates.
8. **Application fixtures**: managed login/auth flows, synthetic test data seeding/reset, stable clocks and screenshot deterministic rules.

## Backend follow-up

- Kubernetes HPA time-series polling while load runs, with scale-out latency, stabilization time and recovery assertions.
- True distributed k6 execution with partitioned workloads, runner resource quotas and workload-specific rate models.
- Automatic correlation of k6 results with Prometheus/OpenTelemetry telemetry: event-loop lag, heap RSS/GC, DB pool and queue metrics.
- Failure behavior assertions for retries, timeout budgets, circuit breakers, dead letters, bulkheads and graceful degradation.
- New Testcontainers adapter to provision disposable Valkey, Postgres, Kafka and Toxiproxy.
- Pact provider verification and OpenAPI diff compatibility checks.
- Database transaction and message-ordering integrity scenario library with state inspection.
- DR proof workflow: immutable backups, restore verification, RPO/RTO metrics, manual release approval.
- Node CPU/heap profile parsing and flamegraph analysis artifacts.

## Frontend follow-up

- Run Lighthouse CI **and** browser timing in one aggregate performance suite; trend budgets and lab/field separation.
- Field LCP, CLS, INP analytics ingestion into a shared telemetry backend and route-level percentiles.
- Accessibility workflows for keyboard focus order, dialogs, screen readers and color contrast review.
- Storybook/Chromatic compatible component-level visual baseline adapters and component accessibility matrix.
- Deterministic screenshot controls for fonts, animations, clock, randomness, geolocation and dynamic fixtures.
- Memory sampling via reliable CDP heap snapshots and leak analysis using MemLab.
- SEO structural-data/canonical/robots/sitemap audits for indexable routes and SSR hydration checks.
- Browser security: CSP violation collection, storage-token handling and front-end authorization UI assertions.
- Localization: pseudo-locales, RTL layout, missing string checks, date/currency formatting.
- Network resilience: throttling and loss simulation, request retry/backoff assertions, offline queueing and state replay.
- Navigation recovery and microfrontend-specific boundary validation.

## Platform follow-up

- Shared report service backed by Postgres + Drizzle for run history, retention and trend comparisons.
- Object-storage artifact retention, browser trace playback and role-based access controls.
- Work queues and worker-controller on Kubernetes for parallel execution and fair per-tenant resource budgets.
- Release scorecard dashboard, alert integrations and approval workflow with auditable actor/tenant identity.
- Extensible reporter plugins and remote engine adapters with tool-version manifests.
- Internal package publishing pipeline with semantic versioning and generated documentation portal.
- Automated health checks of testing infrastructure so missing prerequisites are detected *before* a scheduled suite.

## Not included by request

No unit/integration/E2E test files were written for this repository. Application-specific scenario handlers implemented for quality verification are **features**, not a test suite covering the quality platform's own code. Add conventional automated tests, quality integration tests, and contract tests as a later dedicated milestone.
