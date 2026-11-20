> **v0.13.0:** Two new packages (`@saplings/harbor`, `@saplings/kingsman`) and typed optional `sapling.gateway` / `sapling.identityPlatform` integrations. See [platform specs](platforms/CONFIG_COVERAGE.md) and their detailed product/technical/gap documents. Existing production gates remain open; both platforms require real infrastructure/conformance testing.

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](technical-specifications/SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](technical-specifications/CASHFREE_PAYMENTS.md) and [feature dossiers](features/README.md). Historical sections below may describe previous releases.

> **v0.10.0:** See [flat SDK, hooks and pnpm migration](technical-specifications/ENGINEERING_0100.md) for the current API, workspace and verification. Historical sections below may describe older releases.

> v0.7.0 foundation update: see [FOUNDATION_PACKAGES.md](FOUNDATION_PACKAGES.md) for new packages, configuration, usage and limitations. Existing sections are retained as the baseline.

> v0.6.0 integration update: see [QUALITY_INTEGRATION.md](QUALITY_INTEGRATION.md) for current full-stack configuration, packages, commands and parity. Earlier SDK sections are retained for context.

# Getting started — v0.3

1. Extract archive. `pnpm install` with Node.js 26, then `pnpm run build`. `pnpm run build:adapters` after optional dependencies are installed. `pnpm run check:catalog` lists feature IDs.
2. Choose infrastructure: local memory for learning; PostgreSQL/Drizzle, object storage, and authentication provider for production-oriented integration. `docker compose up -d postgres` starts only local DB. Apply both SQL migrations under `packages/adapter-drizzle/migrations/` with a controlled migration role.
3. Create `sapling.config.ts`; import `defineSaplingConfig` and select capabilities, providers and security policy. See `examples/express-app/sapling.production.config.ts.example` for wiring. Never place credentials in source; environment/secret manager only.
4. `const sdk=createSapling(config)`; attach `sdk.defender.preflight()` before bounded parsing and runtime middleware after parsing (raw webhook routes must preserve bytes and verify signatures). Define explicit, validated routes. Use the verified `req.sapling` context, never `x-tenant-id` alone.
5. Use `sdk.capabilities.invoke(ctx,'SAAS-100','track',{name:'signup',subjectId:ctx.actorId,properties:{}})`. Grant `capabilities:SAAS-100:track` to authorized actor. Legacy direct APIs have their own permissions, so some calls require both.
6. For workers register handlers using `sdk.automation.register('my.job', handler)`; run `sdk.worker.run(tenantContexts, signal)` from a trusted worker process. Ensure handler honors AbortSignal and idempotency; use provider-specific job adapter for higher scale.
7. Scanner: `node packages/cli/dist/index.js scan --path packages/sdk/src --format sarif`. For passive URLs explicitly allow the owned hostname with `--allow-host`. No arbitrary customer URL input. Use `security.scanner.adapters` to import trusted external scanner reports.
8. Check production gaps. Never promote to production on a successful build alone.


## v0.3 release additions

See [provider matrix](PROVIDER_MATRIX.md), [test plan](TEST_PLAN.md), and [release gates](GAPS_AND_IMPROVEMENTS.md) for current implementation, validation and limitations.

Scanner CLI: `--reports FILE` loads a JSON map of scanner IDs to `{format,path,maxAgeMs?}`, `--dns-config FILE` loads the DNS baseline, `--require-all` fails (exit 3) when a category was not executed or a scanner failed. High/critical findings exit 2. Use generated JSON alongside SARIF to preserve execution metadata.

For production example, copy the production config template to an actual `.ts` file, set `SAPLING_CONFIG_PATH` to its absolute path and `NODE_ENV=production`, configure scoped credentials, and mount the file in the container. `Dockerfile` and `deploy/kubernetes/api.example.yaml` are deployment templates, not executed manifests. For real worker processes supply a trusted tenant context registry and deploy independently from API instances.
