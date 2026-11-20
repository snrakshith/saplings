# v0.8.1 — release blocker execution and hardening

## Verified code changes

- Recurring payment attempts now carry a fresh lease token per claim, independent of the stable provider idempotency key. An expired/reclaimed attempt cannot apply a stale gateway response even while its replacement remains pending. A provider must still guarantee idempotent charging and reconciliation.
- InMemoryStore transaction handles reject use after commit or rollback. The Drizzle adapter adds an equivalent lifetime guard and a live integration assertion; its compilation/live execution are still blocked.
- Pre-aborted billing charge/offboarding operations cannot claim work. Cancellation of work already in progress is cooperative and requires idempotent providers and handlers.
- Local HTTP benchmark now obtains its version from package.json instead of reporting v0.5.0.
- Release gate obtains the version from package.json. Old evidence is archived, not reused as new release proof.

## Run the release checks

```sh
pnpm install --no-frozen-lockfile
# Review and commit pnpm-lock.yaml; subsequent installations use npm ci.
pnpm run release:preflight
pnpm run release:checks -- --local-only
pnpm run release:checks
pnpm run release:gate
```

The preflight lists missing module names, required environment variable names, and lockfile presence. `release:checks` executes eligible build, regression, catalog, technical inventory, adapter, quality, validation, database, transport, provider and dependency checks. It exits nonzero when checks fail, are blocked or require operator review. All command outcomes are logged under `docs/evidence/checks/`; do not share child logs until secrets have been removed. The runner does not install packages, provision infrastructure, run destructive drills or automatically approve evidence. The `--local-only` option limits execution to four local checks. Full integration checks require approved disposable environments. Set the test database and Valkey URLs, and explicitly supply the approved provider test module per RELEASE_VALIDATION.md.

## Closure plan by environment

| Group | Gates | Required action |
|---|---|---|
| Dependency-backed | adapter-build, quality-build, validation-compat, dependency-audit | Registry access; review lockfile; compile, execute conformance tests; run SCA, SBOM and container audit |
| Test infrastructure | postgres-live, valkey-live, foundation-live | Start disposable PostgreSQL and Valkey, migrate/create restricted DB role; run real database, broker and transport checks; validate production topology and policies |
| Provider and lifecycle | provider-live, recurring-payment-live, tenant-offboarding-drill | Approved sandbox credentials, implement remaining provider-specific checks, payment mandates/reconciliation, legal holds and lifecycle handlers; run and review evidence |
| Staging infrastructure | staging-load, staging-soak, restore-drill, backend-quality-live, frontend-quality-live | Install approved engines and run against application fixtures; record SLO, RPO/RTO, suite outcomes and restoration results |
| Human/security/application review | scanner-triage, independent-security-audit, application-authorization, operations-review | Complete all applicable scans and independent triage; independent audit; app-specific authorization and operational approval |

The remaining 19 gates are not closed by this patch. The existing technical evaluation distinguishes 119 local reference, 49 hybrid and 14 provider-dependent mappings. Many need feature-specific tests and concrete provider/domain implementations. This is not a certification of complete feature functionality. Independent Zod implementation parity remains incomplete; upstream-backed compatibility requires actual conformance testing. No new live credentials or infrastructure were available during this patch.
