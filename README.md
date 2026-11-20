Reusable packages are released under the `@saplings` npm organization. See the [Changesets release guide](.changeset/README.md) for npm setup and versioning.

> **v0.17.0 — Harbor + Kingsman (reusable packages)**
>
> - `@saplings/harbor` replaces `@sapling/gateway` (edge routing, ingress policy, API key/JWT verification, HTTP response helpers and configured TLS probe).
> - `@saplings/kingsman` replaces `@sapling/identity-platform` and now owns legacy SaaS accounts, RBAC/ABAC checks, API keys, TOTP, membership proof and scoped impersonation.
> - `sapling.harbor` / `sapling.kingsman` replace platform accessor names; legacy `sapling.gateway` / `sapling.identityPlatform` and config keys remain deprecated aliases temporarily.
> - All 182 catalog IDs/actions remain, with [explicit ownership map](docs/architecture/FEATURE_OWNERSHIP_V017.md). The source move is **not** complete federation, bot protection or production certification.
> - Vitest 5 test suite remains configured. Runtime Vitest and V8 coverage require a real installed dependency/lockfile; source-level smoke checks are separately documented.
>
# Sapling Unified SDK — v0.17.0

**Vitest 5 migration (development candidate).** All active Node test suites and backend-quality fixture examples now import the Vitest test API. The standard test command, integration, quality and React hook commands run Vitest, and the backend-quality operator test engine invokes Vitest with a checked JSON report. The legacy `node-test` engine identifier is accepted for older quality configurations but executes Vitest. New tests demonstrate Vitest's spies, table-driven tests, deterministic timers and strict result handling.

**Dependency limitation:** This packaging environment cannot access npm/pnpm registries; the real Vitest package and V8 coverage plugin could not be installed or executed. TypeScript compilation and static migration checks are recorded separately. Previous 190/191 test results belong to v0.15.0 and are **not** v0.16.0 Vitest results. No lockfile or coverage percentages were invented. **Production remains blocked.** See [testing specification](docs/technical-specifications/TESTING_V016.md).

```bash
npm install --global pnpm@10.11.0
pnpm install --no-frozen-lockfile      # one time; review/commit the generated pnpm-lock.yaml
pnpm run build:all
pnpm run test:vitest:verify
pnpm test                               # Vitest core suite
pnpm run test:coverage                  # V8 coverage: lcov, html, JSON summary
pnpm run test:integration               # requires real Postgres/Valkey + env configuration
pnpm run test:hooks                     # requires React runtime
pnpm run release:preflight
```

---

# Sapling Unified SDK v0.15.0 — flat SaaS SDK and critical security hardening

**v0.15.0 cumulative release:** 24 packages and all 182 SaaS feature IDs retained. The 31 previously nested SDK files have been moved to `packages/sdk/src/` and their internal service registry renamed. Public flat services remain intact; existing `config.expanded` stays as a deprecated input alias but there is no runtime `sdk.expanded` property.

Critical implementation changes include persistent transactional gateway quota/ban adapters (separate counters for each configured rate window), bot-challenge and API-key auth integration points, per-request trusted proxy TLS validation, realm token introspection/revocation, refresh-family replay invalidation, MFA TOTP replay fencing, and policy-scoped tenant exports.

**Evidence:** local TypeScript builds, 23 new security/root-refactor regressions, and the full regression suite. See [engineering specification](docs/technical-specifications/ENGINEERING_015.md), [production-readiness assessment](docs/technical-specifications/PRODUCTION_READINESS_015.md), [182 feature gap review](docs/evidence/SAAS_182_GAP_AUDIT.md) and [release blockers](docs/technical-specifications/RELEASE_BLOCKERS.md).

**75% objective:** target, **not a verified production-readiness score**. The historical 35% estimate had no audited denominator. Full pnpm, real React Native builds, live Postgres/Valkey, Cashfree sandbox, gateway/identity protocol conformance and independent security review remain open; do not deploy to production on the strength of local tests.

```bash
npm install --global pnpm@10.11.0
pnpm install --frozen-lockfile # requires reviewed pnpm-lock.yaml (absent in this source archive)
pnpm run build
pnpm run verify:sdk-layout
pnpm run test:critical:local
pnpm test
pnpm run docs:verify
pnpm run release:preflight
```

---

# Historical v0.14.0 — Web and Mobile Murphi UI

The SDK now contains **24 workspace packages**, adding `@saplings/ui-core` (shared tokens), `@saplings/murphi-ui` (React/Emotion web, 39 Murphi source component directories) and `@saplings/murph-appui` (React Native, 38 matching component names). See [cross-platform UI documentation](docs/ui-platforms/README.md), [component matrix](docs/ui-platforms/COMPONENT_PARITY.md) and [source provenance](docs/ui-platforms/PROVENANCE.md). The existing 182 SaaS IDs, gateway, identity platform, scanner/defender and quality packages remain intact.

```bash
npm install --global pnpm@10.11.0
pnpm install --frozen-lockfile   # generate/review pnpm-lock.yaml first if absent
pnpm run build:ui
pnpm run typecheck:ui
pnpm run test:ui
pnpm run build:web
```

**Release qualification:** `@saplings/ui-core` and the adapted Murphi web source compile with local available dependencies; real React Native 0.88/React 19.3 typecheck, Metro, iOS/Android UI and accessibility testing require a full native environment. No fabricated lockfile. Source licensing for Murphi must be confirmed before redistribution; user-provided archive did not include its standalone LICENSE.

---

# v0.13.0 — Gateway and Identity Platform

Added **`@saplings/harbor`** and **`@saplings/kingsman`** as separate TypeScript packages. They use the uploaded `GatewayConfig.json`, `GatewayConfig.yaml` and `RealmConfig-full(1).json`, preserved in `examples/platform/`. Existing 19 packages and 182 SaaS feature IDs remain unchanged; total workspace library packages: **21**.

```ts
const sapling=createSapling({app:{id:'school-platform',environment:'development'},platforms:{gateway:{config:gatewayConfig,dependencies:gatewayDeps},identity:{config:realmConfig,dependencies:identityDeps}}});
// sapling.gateway  — explicit HTTP/TLS listener, no automatic port binding
// sapling.identityPlatform — realm, token, user, org and OIDC HTTP-handler core
```

The source realm metadata declares **production** and requires a persistent store, stable RSA keypair, real Argon2id hasher, and delivery/security integrations. The gateway sample similarly requires a shared rate limiter and trusted TLS termination/secrets. Do **not** copy the sample configuration into a production listener without satisfying those safeguards. Several uploaded configuration sections are retained for future development but are not yet active. This is **not** Kong/Keycloak feature or certification parity.

See [API gateway specs](docs/platforms/gateway/TECHNICAL_SPECIFICATION.md), [identity specs](docs/platforms/identity/TECHNICAL_SPECIFICATION.md), [config coverage matrix](docs/platforms/CONFIG_COVERAGE.md), and [remaining gaps](docs/platforms/identity/GAPS_AND_IMPROVEMENTS.md).

```bash
pnpm install --frozen-lockfile # after a reviewed pnpm-lock.yaml is committed
pnpm run build:platforms
pnpm run test:platforms
pnpm run platform:coverage
pnpm run release:preflight
```

---

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](technical-specifications/SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

# Sapling Unified Full-stack Engineering Platform — v0.13.0

**One monorepo, one application configuration, separate production and development packages.** 182 SaaS mappings, 41 security scanner categories, 16 backend and 16 frontend quality suites. v0.8 adds upstream-backed Zod compatibility (independent validator retained at /native), recurring invoice/dunning and approved tenant offboarding; original utilities, realtime and HTTP middleware retained. See [Foundation packages](docs/FOUNDATION_PACKAGES.md).

See [technical specifications](docs/technical-specifications/README.md), [quality integration and parity report](docs/QUALITY_INTEGRATION.md), [architecture](docs/quality/HLD_LLD_MERGE.md), [release gaps](docs/GAPS_AND_IMPROVEMENTS.md). Production release is blocked pending live evidence.

**v0.11.0:** Cashfree preferred gateway, typed provider selection, and [feature-level product/technical/gaps documentation](docs/features/README.md). 19 workspace packages. [Payment guide](docs/technical-specifications/CASHFREE_PAYMENTS.md). Prior v0.10.0 changes: 19 packages, flat typed SDK service access, 182 typed catalog IDs and actions, React hooks, pnpm 10 workspace. See [migration guide](docs/technical-specifications/ENGINEERING_0100.md).

```sh
npm install --global pnpm@10.11.0
# First installation only: generate and review the lockfile; commit it.
pnpm install --no-frozen-lockfile
# Subsequent CI/reproducible installations:
pnpm install --frozen-lockfile
pnpm run build:all
pnpm run typecheck:sdk
pnpm test
pnpm run test:hooks
pnpm run quality -- list
```

Registry access was blocked when this archive was prepared. No lockfile was fabricated. The full pnpm install, hook typecheck/runtime tests, and previous live production gates require a connected environment. Docker builds require a reviewed lockfile.

```ts
import {createSapling, defineSaplingConfig} from '@saplings/sdk';
const sapling = createSapling(defineSaplingConfig({app:{id:'my-app',environment:'development'}}));
// Typed public services: sapling.domains, sapling.providerWorkflows, sapling.billing, etc.
// Configure policies before calling trusted domain APIs.
```

## Prior SDK README (historical)

# Sapling Unified SDK · v0.5.0

One TypeScript SDK for reusable SaaS and security capabilities, using a single trusted configuration. Incremental upgrade of v0.3.0. **Reference implementation, not production approved.**

## Release highlights

- 182 original SaaS IDs registered: 120 local reference, 48 hybrid, 14 provider-dependent; concrete adapter source for all 14 provider-only IDs.
- MFA, scoped support sessions, OIDC PKCE federation, encrypted vault and bounded logical backup; tenant RLS migration and append-only audit enforcement.
- Worker runtime, outbox delivery, signed callbacks, payment/refund reconciliation; fixed-target infrastructure and deployment adapter code.
- 41 scanner categories retained: 38 static/passive paths, 2 additional configured DNS paths, 1 report-only; evidence import supports every ID. Runtime defender enhanced.
- 38 local automated tests pass. Live database tests and CI are provided but not executed here. External packages and live provider validation remain outstanding.

## Quick start

Use the Node.js 26 LTS version in `.node-version` and pnpm 10.11.0.

```sh
pnpm install
pnpm run verify:build
pnpm test
pnpm run build:adapters
pnpm run check:catalog
pnpm --filter @sapling/example-express run dev
```

```ts
import { createSapling, defineSaplingConfig } from '@saplings/sdk';
const sdk = createSapling(defineSaplingConfig({
  app: { id: 'orders', environment: 'development' },
  security: { scanner: { root: './src' }, defender: { mode: 'block' } },
}));
// Server-verified identity only. Never accept permissions or tenant IDs from client input.
const ctx = { tenantId: 'tenant-a', actorId: 'trusted-admin', permissions: ['*'] };
const plan = await sdk.capabilities.invoke(ctx, 'SAAS-034', 'create', {
  name: 'Pro', priceMinor: 99900, currency: 'INR', features: ['reports']
});
```

Use `sdk.defender.preflight()` before bounded request parsing and `sdk.middleware()` after parsing; explicitly authorize domain routes. Direct SDK services and raw store are trusted backend APIs. Never expose them or the action registry directly to arbitrary clients. For signed webhooks preserve raw bytes.

## Local code checks

Run `pnpm run format` to apply Prettier and `pnpm run lint:fix` to apply safe
lint fixes. Pull requests run `pnpm run format:check`, `pnpm run lint`, and
`pnpm run typecheck`.


## Repository

- `packages/sdk`: core, typed config, feature registry, domain services, worker, concrete provider adapters.
- `packages/security`: scanner, defender, report evidence adapters.
- `packages/catalog`: generated master inventory.
- `packages/adapter-drizzle`: PostgreSQL store and migrations; `adapter-aws`: S3/SES/SNS; `adapter-app`: GraphQL/Sharp.
- `packages/cli`: catalog, scanner, doctor; `examples/express-app`: demo and production config template.
- `tests`: local suite and live PostgreSQL integration; `.github/workflows`: CI; `deploy`: Kubernetes template; `Dockerfile`: example app image.
- `docs`: design, operations, verification and explicit release gaps.

[Master checklist](docs/MASTER_FEATURE_CHECKLIST.md) · [Getting started](docs/GETTING_STARTED.md) · [Provider matrix](docs/PROVIDER_MATRIX.md) · [Verification](docs/BUILD_VERIFICATION.md) · [Remaining production gates](docs/GAPS_AND_IMPROVEMENTS.md).

## v0.5.0 release gates

See [release validation](docs/RELEASE_VALIDATION.md), [audit brief](docs/INDEPENDENT_SECURITY_AUDIT.md) and [gap register](docs/GAPS_AND_IMPROVEMENTS.md). `pnpm run release:gate` intentionally fails until live evidence is supplied. Local load results are in `docs/evidence/local-load.json`.

## v0.5.0 — Backend Quality

Separate `@saplings/backend-quality` development package in this monorepo; all 15 backend categories ship together. No frontend tooling. One `sapling.config.ts` controls both runtime and quality settings. Run `pnpm run verify:build`, `pnpm test`, `pnpm run quality -- list` and see [Backend Quality](docs/BACKEND_QUALITY.md). External tools require authorized staging and installation. Prior v0.5.0 results are historical; see current evidence for v0.5.0.

## v0.8.2 release verification

Run `pnpm run release:preflight` to see missing prerequisites, then `pnpm run release:checks` to execute eligible checks. See [patch notes and closure plan](docs/technical-specifications/PATCH_081.md). Production remains blocked; 4/23 gates are locally verified.

## v0.8.2 hardening

See [three-iteration patch](docs/technical-specifications/PATCH_082.md) for provider-operation state, Stripe recurring gateway, bounded outbox processing, realtime journal/replay, scanner evidence and remaining engineering work. See [release blockers](docs/technical-specifications/RELEASE_BLOCKERS.md) before deployment.

## v0.8.4 engineering sequence

See [three-patch plan](docs/technical-specifications/ENGINEERING_CLOSURE_PLAN.md), [patch v0.8.3](docs/technical-specifications/PATCH_083.md), and [patch v0.8.4](docs/technical-specifications/PATCH_084.md). 104 local regression tests passed; 4/23 release gates passed, production remains blocked. Earlier release sections are historical.

## v0.9.0 engineering hardening

See [engineering assessment](docs/technical-specifications/ENGINEERING_090.md) for provider workflow orchestration, billing reconciliation, realtime quotas and ACK, governance, field policies and search. Existing 18 packages retained. Production remains blocked pending current evidence and remaining domain-specific engineering.
