# Sapling Unified SDK — TypeScript monorepo

**Version 0.1.0 — working reference foundation, not production-certified.** One SDK, one configuration, modular packages for reusable SaaS features and security scanning/defense.

## Scope at a glance

- **182** named SaaS features across 12 categories, individually tracked in `docs/MASTER_FEATURE_CHECKLIST.md` and `docs/saas-features.{csv,json}`.
- **41** public security scanner categories tracked in `docs/security-scanners.{csv,json}`, including security, uptime, SEO/AEO and accessibility.
- **15** heuristic/passive scanner categories with runnable reference checks; **26** require integrations or specialist validation. Native checks are *not* comprehensive vulnerability tests.
- A configurable runtime defender with rate limiting, threat signals, alert de-duplication and monitor/block policy.
- A per-feature adapter dispatch mechanism for all 182 feature IDs (no fake implementation of unconfigured capabilities).
- Reference SDK services for tenant-scoped records, permission checks, hashed API keys, audit, flags/variants, usage/quotas, jobs, events, object storage, provider-backed notifications/payments, and webhook signatures.
- Optional `@saplings/adapter-drizzle` and `@saplings/adapter-aws` source code (require independent setup, not integration-tested here).

> **Important distinction:** A feature can be included in the master checklist without being fully implemented. `native` means demonstrable reference behavior, `adapter` means provider contract/integration requirement, and `planned` means scoped only. This package does **not** implement all 182 features or the vendor's 200+ individual security checks. It *does* preserve and map the complete intended feature categories.

## Quick start

Requirements: Node 20.11+ and npm. Dependencies need internet for first install.

```bash
npm install
npm run build
npm test
npm run doctor
npm run check:catalog
npm run scan -- --path .
```

For environment without package registry access, run `tsc -p packages/catalog`, then security, sdk and cli; workspace symlinks may need local creation. The JavaScript compiled under each package `dist/` is already included in the ZIP to allow immediate Node smoke tests.

## One config (`sapling.config.ts`)

```ts
import { defineSaplingConfig } from '@saplings/sdk';

export default defineSaplingConfig({
  app: { id: 'my-saas', environment: 'development' },
  tenancy: { enabled: true, enforceContext: true },
  access: { enabled: true, enforceOnServices: true, defaultDecision: 'deny' },
  security: {
    scanner: { enabled: true, enabledScannerIds: ['SCAN-03', 'SCAN-04', 'SCAN-35'] },
    defender: {
      enabled: true, mode: 'block', blockThreshold: 80,
      rateLimit: { enabled: true, maxRequests: 120, windowMs: 60_000 },
    },
  },
  storage: { provider: 'memory', maxUploadBytes: 10_000_000 },
  billing: { enabled: true },
  featureFlags: { enabled: true },
  audit: { enabled: true },
  // Extensible feature IDs; enabling an adapter-only feature does not implement its backend.
  features: { 'SAAS-001': { enabled: true, provider: 'external-idp' } },
  hooks: { resolveRequestContext: async (req) => undefined }, // replace with verified identity
});
```

```ts
import { createSapling } from '@saplings/sdk';
import config from './sapling.config.js';
const sapling = createSapling(config);
app.use(sapling.middleware()); // async Express-compatible middleware

const admin = { tenantId: 'verified-tenant', actorId: 'verified-user', permissions: ['*'] };
const project = await sapling.projects.create(admin, { name: 'Workspace' });
await sapling.storage.upload(admin, { key: 'notes/a.txt', data: new TextEncoder().encode('hi') });
await sapling.billing.setQuota(admin, 'apiCalls', 500);
await sapling.flags.set(admin, { key: 'new-navigation', enabled: true, rollout: 25 });
```

**Never accept tenant/role IDs from unverified client headers.** Production requires trusted identity resolution, persistent storage, distributed rate limits and a full security review.

## Monorepo layout

```text
packages/
  catalog/          182 SaaS + 41 scanner canonical IDs, coverage status
  security/         runtime defender, passive/source scanner, SARIF output
  sdk/              typed configuration + SaaS services + Express middleware
  cli/              catalog, scan, doctor
  adapter-aws/      optional AWS S3, SES, SNS adapters (external dependencies)
  adapter-drizzle/  optional Postgres+Drizzle store and SQL migration
examples/express-app/
tests/
docs/
scripts/
```

## Docs

Start with `docs/MASTER_FEATURE_CHECKLIST.md`, `docs/GETTING_STARTED.md`, `docs/SECURITY_DESIGN.md`, `docs/PRD.md`, `docs/HLD.md`, `docs/LLD.md`, `docs/SDK_API.md`, `docs/PROVIDER_MATRIX.md`, `docs/GAPS_AND_IMPROVEMENTS.md`, and `docs/TEST_PLAN.md`.

## Known limitations (read before deployment)

This is an in-process reference SDK. In-memory stores, worker state and rate limiting are neither distributed nor persistent. Source-pattern scanning produces false positives and false negatives. Many SaaS features have integration contracts only. Real cloud providers, passwordless/SSO, payments settlement, durable workflows, vulnerability testing, full compliance and tenancy RLS require substantial additional work. See `docs/GAPS_AND_IMPROVEMENTS.md`.

## Reference sources and intellectual property

The security *category names* were compared with the publicly listed catalog at https://checkvibe.dev/security-checks; all implementation code in this repository is newly authored and does not include their proprietary checks or engine. OWASP ASVS 5.0 at https://asvs.owasp.org/ is an additional useful verification baseline. No claim of compliance certification is made.
