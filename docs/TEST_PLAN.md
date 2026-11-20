> v0.8.0 update: see [technical specifications](technical-specifications/README.md) for current contracts, validation migration, recurring billing, offboarding, acceptance criteria and release blockers. Historical descriptions below may describe prior releases.

> v0.6.0 integration update: see [QUALITY_INTEGRATION.md](QUALITY_INTEGRATION.md) for current full-stack configuration, packages, commands and parity. Earlier SDK sections are retained for context.

# Verification and test plan — v0.5.0

## Run now

`pnpm run verify:build` reconciles the catalog and compiles core packages. `pnpm test` runs the local Node test suite (38 passing at packaging). Includes original regression tests plus MFA, replay, support scope, vault, backup, callback, worker, concurrent quota, audit, payment capture, mocked control-plane transport, scanner evidence and readiness checks.

## Live PostgreSQL (disposable DB only)

```sh
pnpm install
pnpm run build:adapters
TEST_ADMIN_DATABASE_URL=postgres://postgres:ADMIN@localhost:5432/sapling_test node scripts/setup-test-postgres.mjs
TEST_DATABASE_URL=postgres://sapling_test_app:sapling_ci_only@localhost:5432/sapling_test TEST_VALKEY_URL=redis://localhost:6379 pnpm run test:integration
```

The setup script creates a disposable test-only role; never run it in production. CI provisions PostgreSQL 16 and runs the above. The live test checks unscoped RLS reads, cross-tenant transaction rejection, audit protection and concurrent quotas. It was not executed during packaging.

## Mandatory pre-production gates

| Gate | Acceptance evidence |
|---|---|
| Per-operation coverage | Positive, malformed input, unauthorized, cross-tenant, concurrency, disabled feature and failure cases for each enabled operation |
| External providers | Real sandbox OIDC/SAML/social, S3/SES/SNS, Razorpay/Stripe, Valkey, Kubernetes, GitHub, CDN, OTLP, Sharp/GraphQL |
| Security | Independent review, safe authorized DAST, SCA and SAST, CSRF/session/tenant/SSRF abuse tests, scanner quality and traffic false-positive evaluation |
| Reliability | Load, stress, spike, soak, DB contention, memory growth, provider outages, lease crash/replay, circuit recovery, graceful shutdown |
| Recovery | Physical DB and object recovery from separate failure domain, RPO/RTO measurements and key recovery drill |
| Deployment | Reproducible locked dependency build, container scan/SBOM, Kubernetes readiness and rollback, alert routing and SLOs |

No local pass implies external or production validation. Test coverage percentage was not measured. Do not certify full-feature readiness from this suite.

See [Release validation](RELEASE_VALIDATION.md) for the local HTTP benchmark, live AWS checks, staging k6, evidence policy and independent audit.
