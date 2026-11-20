# PRD — Sapling Unified SDK

## Product mission

Offer one installable, TypeScript-first backend SDK to cover reusable SaaS application concerns, security scanning and runtime defense. Developers configure behavior in a single imported TypeScript file, use narrow feature facades, and retain freedom to swap providers.

## User stories

- As a backend developer I can initialize common SaaS features in one place and avoid boilerplate.
- As a security owner I can configure passive source and URL checks outside the request path and runtime threat defenses inside the app.
- As an application admin I can set tenant-scoped access, quotas, flags, event trails and integrations.
- As an operator I can query the complete feature catalog and find what is native, provider-dependent, or not yet implemented.

## Requirements and acceptance criteria

1. One `@sapling/sdk` entry point and one typed `sapling.config.ts`.
2. Config identifies environment, tenancy, auth, access, security, billing, storage, notifications, payments, audit, analytics, flags, jobs, telemetry, provider adapters and per-feature overrides.
3. 182 enumerated SaaS capabilities with stable IDs (`SAAS-001..SAAS-182`); current catalog is broader than the original approximate 100-feature discussion.
4. 41 enumerated scanner categories (`SCAN-01..SCAN-41`), with explicit run-status and no equivalence claim to vendor 200+ checks.
5. Separate scanner CLI from runtime defender middleware; do not run site-vulnerability fuzzing on ordinary requests.
6. Deny access by default in resource facades, require explicit tenant context, enforce key hashing and verify signed webhooks.
7. In production refuse volatile defaults unless the operator explicitly opts into a development-only override.
8. Include reference adapters and source code, deploy docs, tests and implementation-gap registry.

## Non-goals in v0.1

All 182 features production complete, replacement for OWASP ZAP/Semgrep/Trivy, exhaustive CheckVibe parity, multi-region SaaS, managed IAM/SSO, PCI processing, compliance certification, distributed WAF, automated AI fix engine (previously deferred).

## Success metrics

- Developer can build/test after install and integrate into Express with a verified identity resolver.
- Full master inventory is machine-readable and cross-referenced by module/status.
- CI can run actual passive source checks and produce JSON/SARIF; runtime defender can monitor/block selected traffic.
- External providers are replaceable via interfaces without SDK domain changes.
