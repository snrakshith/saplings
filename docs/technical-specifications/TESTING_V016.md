# v0.16.0 — SDK testing framework migration to Vitest

## Scope and rationale

Move the established 24-package Node.js/TypeScript SDK's **test harness** from built-in `node:test` to **Vitest 5.0.0** while retaining all test assertions and isolation checks. This changes development/test tooling, not runtime SDK APIs or SaaS feature IDs. Vitest supports typed spies/mocks (`vi`), table-driven parameterized tests (`test.each`), fake timers, multi-worker isolation and V8 coverage. Its current v5 release requires Node >=22.12.0 and Vite >=6.4.0; the monorepo targets Node >=22 and uses Vite 7. Vitest's own docs: https://vitest.dev/guide/ and https://vitest.dev/guide/coverage .

**No SDK production module imports Vitest.** The root monorepo uses it as a dev dependency. `@saplings/backend-quality` explicitly depends on Vitest because its authorized operator test engine executes it as a separate tool; normal runtime packages do not inherit this dependency. `@vitest/coverage-v8` is test-only.

## Migrated tests

- Existing top-level SDK/identity/gateway/payments/security/realtime/UI regression tests in `tests/*.test.mjs` use `import {test} from 'vitest'`.
- Separate suites `tests/integration/` include Postgres, Valkey, AWS, Foundation transports, Zod and React hooks; these tests are **not** run in the default `pnpm test` because they require additional services/libraries.
- Operator fixture scripts in `packages/backend-quality/examples/` and `tests/quality-fixtures/contract.test.mjs` import the same Vitest test API.
- `node:assert/strict` assertions remain valid standard assertions during the transition; replacing them with `expect` is optional. New `tests/v016.test.mjs` demonstrates Vitest's `expect`, `vi.fn`, `vi.stubGlobal`, fake clock, `test.each` and strict JSON reporter validation.
- `tests/v013.test.mjs` uses `test.skipIf` for the optional YAML loader instead of `node:test` context diagnostic/skip.
- Quality engines: new `engine:'vitest'`, prior `engine:'node-test'` retained as compatibility alias **but executes Vitest**; `testcontainers`, `toxiproxy` and `chaos-mesh` operator-authored scripts also execute through Vitest. The quality engine reads a bounded JSON reporter file and rejects zero passes, skipped/pending/todo, failed runs and missing or inconsistent reports. It does not trust exit code zero alone.

## Commands and configuration

```bash
# Node.js 22.12+, pnpm 10; first install requires registry access
corepack enable && corepack prepare pnpm@10.11.0 --activate
pnpm install --no-frozen-lockfile
# Review & commit the generated pnpm-lock.yaml, then use frozen installs in CI.
pnpm install --frozen-lockfile
pnpm run build:all
pnpm run test:vitest:verify  # offline structural check, NOT runtime test
pnpm test                    # tests/*.test.mjs
pnpm run test:watch
pnpm run test:coverage       # V8 report: coverage/index.html, coverage/lcov.info, coverage/coverage-summary.json
pnpm run test:foundation
pnpm run test:platforms
pnpm run test:ui
pnpm run test:hooks          # React dependencies required
pnpm run test:integration    # requires TEST_DATABASE_URL and TEST_VALKEY_URL
pnpm run test:validation:compat
```

`vitest.config.mts` holds core Node-suite timeouts, isolated forks (max two workers) and the V8 coverage config. `vitest.integration.config.mts` runs only live/optional integrations with a longer timeout and one worker. `vitest.quality.config.mts` isolates a requested authorized operator fixture within a bounded process. The quality runner resolves the installed Vitest CLI from its own dependency and writes JSON to a temporary file outside source control; it cleans up after every run.

The V8 provider measures **emitted `packages/**/dist` JS** because the current tests import emitted JS. TypeScript source maps are enabled. Reports are emitted as text, JSON summary, LCOV and HTML. Coverage percentages and minimum thresholds are **not** prefilled because no real baseline has been collected in the current offline environment. When the real run is available, add independently reviewed coverage budgets **per critical package**; do not game thresholds with exclusions or claim line coverage proves business correctness.

## CI and security

CI now runs `pnpm test` and `pnpm run test:coverage`, uploads coverage results, and retains the existing Postgres/Valkey staging jobs, typechecks, scanners and SDK tests. The preferred CI path is a committed reviewed pnpm lockfile with `--frozen-lockfile`; the existing CI bootstrap permits non-frozen first installation **only for review**. Use `pnpm audit` and an SBOM on actual locked versions.

Vitest-run integration fixtures may launch containers, alter test networks or read credentials: **never run them against unauthorized production systems**. Current quality engine continues to enforce explicit environment/namespace/disruptive approvals and safe file paths. All mock provider responses and local loopback evidence are only development evidence, not independent production validation. Avoid introducing `vi.mock` in global setup for authentication/tenant policies; use explicit dependency injection in focused tests where possible.

## Verification status in this source archive

- [x] All current suite files and quality examples migrated to Vitest imports.
- [x] Root scripts, CI, dedicated configurations, V8 coverage plugin dependency and quality runner code implemented.
- [x] Structural migration verification and direct TypeScript build can be run with temporary preinstalled TypeScript (separate evidence).
- [ ] **Real Vitest runtime suite execution**: blocked by unavailable npm registry (`EAI_AGAIN`). Previous v0.15.0 `node:test` counts are historical, not v0.16.0 Vitest test evidence.
- [ ] **Coverage baseline**: real V8 instrumentation cannot run without installing `vitest` and `@vitest/coverage-v8`.
- [ ] **Clean pnpm install and lockfile**: none fabricated.
- [ ] Live Postgres, Valkey, provider sandbox, React Native, browser and production security gates remain open.

## Remaining actions for the next verified build

1. Restore registry connectivity; run `pnpm install --no-frozen-lockfile`, commit reviewed `pnpm-lock.yaml`, then frozen CI install.
2. Run `pnpm run build:all && pnpm test && pnpm run test:coverage`; fix any Vitest compatibility differences and confirm test count, skips, exit status and coverage with a captured source hash.
3. Execute backend-quality operator fixtures (`engine:'vitest'` and legacy alias), live Postgres/Valkey and React hook suites. Compare baseline quality/infrastructure behavior.
4. Enforce per-package coverage budgets, test critical tenant/identity/gateway/payment failure modes and increase coverage without mistaking numerical thresholds for production certification.
