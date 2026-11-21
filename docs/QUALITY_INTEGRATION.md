# Full-stack quality merge — v0.6.0

Authoritative sources: original sapling-quality-platform.zip (v0.1.0) and unified SDK v0.5.0. All 32 original suite IDs are registered. This is source coverage, not certification of equal behavior or successful external execution. The original standalone documentation is preserved in docs/quality; historical claims are not current evidence.

| Scope | Original | v0.5.0 | v0.6.0 |
|---|---:|---:|---:|
| Backend | 16 | 15 | 16 |
| Frontend | 16 | 0 | 16 |

## Suite matrix

| Suite | Restored engine / behavior | Validation |
|---|---|---|
| backend:performance | Autocannon | pending or configuration dependent |
| backend:load | k6 weighted workload | pending or configuration dependent |
| backend:stress | k6 stages | pending or configuration dependent |
| backend:spike | k6 stages | pending or configuration dependent |
| backend:soak | k6 sustained workload | pending or configuration dependent |
| backend:scalability | k6 + HPA | pending or configuration dependent |
| backend:security | Semgrep / Trivy / ZAP | pending or configuration dependent |
| backend:concurrency | HTTP idempotency checks | local test |
| backend:resilience | Toxiproxy latency and cleanup | pending or configuration dependent |
| backend:recovery | kubectl rollout | pending or configuration dependent |
| backend:observability | health and Prometheus | local test |
| backend:contract | Schemathesis/custom | pending or configuration dependent |
| backend:chaos | Chaos Mesh | pending or configuration dependent |
| backend:disaster-recovery | operator restore drill | pending or configuration dependent |
| backend:kubernetes | kubectl resources/probes/HPA/PDB | pending or configuration dependent |
| backend:profiling | Node profiler command and diagnostics | pending or configuration dependent |
| frontend:performance | Playwright / LHCI | pending or configuration dependent |
| frontend:rendering | React Profiler | pending or configuration dependent |
| frontend:visual | pixelmatch + PNG | pending or configuration dependent |
| frontend:accessibility | axe-core | pending or configuration dependent |
| frontend:responsive | viewport checks | pending or configuration dependent |
| frontend:cross-browser | Chromium / Firefox / WebKit | pending or configuration dependent |
| frontend:bundle | gzip budgets | local test |
| frontend:memory | Chromium CDP | pending or configuration dependent |
| frontend:security | headers / Semgrep | pending or configuration dependent |
| frontend:network | routing / offline | pending or configuration dependent |
| frontend:seo | metadata | pending or configuration dependent |
| frontend:api-integration | route mocks / selectors | pending or configuration dependent |
| frontend:observability | Web Vitals / browser events | pending or configuration dependent |
| frontend:recovery | reload state | pending or configuration dependent |
| frontend:localization | HTML language | pending or configuration dependent |
| frontend:navigation | navigation / selector | pending or configuration dependent |

## Source parity

| Original | Merged location | Change |
|---|---|---|
| `packages/backend-quality/src/benchmark.ts` | `packages/backend-quality/src/benchmark.ts` | adapted / relocated |
| `packages/backend-quality/src/diagnostics.ts` | `packages/quality-node-diagnostics/src/index.ts (re-export)` | adapted / relocated |
| `packages/backend-quality/src/http-suites.ts` | `packages/backend-quality/src/http-suites.ts` | adapted / relocated |
| `packages/backend-quality/src/index.ts` | `packages/backend-quality/src/index.ts` | adapted / relocated |
| `packages/backend-quality/src/k6.ts` | `packages/backend-quality/src/k6.ts` | adapted / relocated |
| `packages/backend-quality/src/kubernetes.ts` | `packages/backend-quality/src/kubernetes.ts` | unchanged |
| `packages/backend-quality/src/toxiproxy.ts` | `packages/backend-quality/src/toxiproxy.ts` | adapted / relocated |
| `packages/frontend-quality/src/browser-observability.ts` | `packages/quality-browser-runtime/src/index.ts (re-export)` | adapted / relocated |
| `packages/frontend-quality/src/browser.ts` | `packages/frontend-quality/src/browser.ts` | adapted / relocated |
| `packages/frontend-quality/src/bundle.ts` | `packages/frontend-quality/src/bundle.ts` | unchanged |
| `packages/frontend-quality/src/index.ts` | `packages/frontend-quality/src/register.ts + index.ts` | adapted / relocated |
| `packages/frontend-quality/src/lighthouse.ts` | `packages/frontend-quality/src/lighthouse.ts` | unchanged |
| `packages/frontend-quality/src/react.ts` | `packages/quality-browser-runtime/src/react.ts (re-export)` | adapted / relocated |
| `packages/quality-cli/src/cli.ts` | `packages/cli/src/quality.ts` | adapted / relocated |
| `packages/quality-core/src/config.ts` | `packages/quality-core/src/config.ts` | adapted / relocated |
| `packages/quality-core/src/exec.ts` | `packages/quality-core/src/exec.ts` | adapted / relocated |
| `packages/quality-core/src/guard.ts` | `packages/quality-core/src/guard.ts` | adapted / relocated |
| `packages/quality-core/src/index.ts` | `packages/quality-core/src/index.ts` | unchanged |
| `packages/quality-core/src/orchestrator.ts` | `packages/quality-core/src/orchestrator.ts` | adapted / relocated |
| `packages/quality-core/src/reports.ts` | `packages/quality-core/src/reports.ts` | unchanged |
| `packages/quality-core/src/results.ts` | `packages/quality-core/src/results.ts` | unchanged |
| `packages/quality-core/src/types.ts` | `packages/quality-contracts/src/index.ts (re-export in core)` | adapted / relocated |
| `packages/quality-core/src/validation.ts` | `packages/quality-core/src/validation.ts` | adapted / relocated |

## Integration choices and gaps

- Canonical shared types in `@saplings/quality-contracts`; the SDK imports only types. `quality-core` orchestrates and reports. `backend-quality` retains v0.5 native runner and original 16-suite registry; `frontend-quality` retains the original 16-suite registry. The unified `@saplings/cli` package runs quality commands under `sapling quality`. Legacy backend API remains available via `sapling quality legacy run ...`.
- Optional Node diagnostics and browser/React telemetry are independent packages, not bundled with the application SDK; use runtime instrumentation only if explicitly desired. Browser package root telemetry export and old subpaths are preserved.
- Original API/web demos, Docker/Helm/Kubernetes manifests, custom suite examples and workflows are integrated. They are demonstration infrastructure, not production deployment certification.
- Existing configuration shape remains supported by legacy runner. New canonical root `sapling.config.ts` has `quality` with `backend` and `frontend`. A frontend-only application can use a standalone quality config without SDK.
- Production targeting defaults to denied; disruptive tests require both approval flags and isolated targets. Configuration and external command files are trusted operator code; restrict network egress and cluster credentials. Browser subresources may contact external hosts; use network policies. Never run arbitrary manifests or commands from untrusted PRs.
- Local validation does not establish Playwright/browser behavior, k6 timing, external scanner results, Docker/Helm/Kubernetes behavior, external provider validation or audit. Browser telemetry initiation is not end-to-end delivery. Original quality gaps (distributed load orchestration, HPA time series, domain-specific RTO/RPO and state assertions, Pact, dependency pinning) remain.
- Native v0.5 quality tests and existing SDK regression tests retained. No claim that all 182 SaaS features are complete.

## Commands

```sh
pnpm install
pnpm run build
pnpm run build:quality
pnpm run build:starter
pnpm run typecheck:quality
pnpm test
pnpm run quality -- list
pnpm run quality -- run --profile release --dry-run
pnpm run quality -- run --scope frontend --profile pr
pnpm run quality -- run --scope backend --profile pr
pnpm run quality -- doctor
pnpm run release:gate
```

Start demo API and web in separate terminals (`pnpm run dev:api`, `pnpm run dev:web`); install browsers using `pnpm exec playwright install chromium firefox webkit`. External tools are installed and pinned separately. `pnpm run build:quality:local` builds only dependency-free paths, not the full browser/telemetry build. In CI use full build and lockfile. Configure environment-specific target allowlist, thresholds, isolated cluster and reviewed workflows before running release profile.
