# Getting started

1. Install Node.js 20.11+, npm, TypeScript, and run `npm install`.
2. Run `npm run build` and `npm test`. The build script compiles catalog, security, SDK, CLI. Optional cloud adapters need their own installed dependencies and builds.
3. Create `sapling.config.ts` using `defineSaplingConfig`. Put all feature switches, provider objects and security overrides in this file.
4. Initialize `const sapling = createSapling(config)` exactly once in the app composition root.
5. Configure `hooks.resolveRequestContext` using authenticated identity claims **after** actual JWT/OIDC verification, not client headers.
6. Register `app.use(sapling.middleware())` before protected routes; note `req.body` inspection depends on middleware ordering and body limits.
7. Use `sapling.projects`, `.billing`, `.identity`, `.flags`, `.storage`, `.jobs`, `.audit`, `.payments`, `.notifications` with an explicitly scoped `ActorContext`.
8. Run scanner offline: `npm run scan -- --path ./src`. To passively check an owned URL: `npm run scan -- --path ./src --url https://example.com --allow-host example.com`.
9. Inspect JSON/SARIF outputs and review findings manually. There is no active SQLi/XSS fuzzing. CI can fail on high/critical heuristic findings.
10. For deployment, supply persistent Postgres+Drizzle adapter and S3 storage, verified authentication, real payment/notification integrations, and a distributed WAF/rate limiter.

## Smoke-test commands

```bash
npm run build
npm test
node packages/cli/dist/index.js doctor
node packages/cli/dist/index.js catalog > features-output.json
node packages/cli/dist/index.js scan --path packages/sdk/src --format sarif > report.sarif
```

## Optional Drizzle example

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DrizzleStore } from '@sapling/adapter-drizzle';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const store = new DrizzleStore(drizzle(pool));
// pass providers: { store, storage: configuredS3Adapter }
```

Apply `packages/adapter-drizzle/migrations/0001_sapling_records.sql` first. **Warning:** the generic JSONB store alone does not satisfy transactional billing, RLS enforcement, immutable audit, or job leasing; implement dedicated production persistence where required.
