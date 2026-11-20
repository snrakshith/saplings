> Historical standalone Quality Platform baseline (v0.1.0). See ../QUALITY_INTEGRATION.md for current commands and validation.

# Implementation matrix — scope versus runnable integrations

Statuses: **Built-in** = real implementation in this repo, requires its engine dependencies. **Conditional** = adapter exists but needs a configured external CLI or infrastructure. **Scenario-specific** = code runs, but correctness expectations depend on application fixtures. **Gap** = future work or only partial assertion.

## Backend (16 suites)

| Suite | Status | Engine | What this implementation actually verifies |
|---|---|---|---|
| performance | Built-in | Autocannon | HTTP throughput, p95/p99, errors and configured thresholds |
| load | Conditional | k6 CLI | Normal sustained workload with response checks/thresholds |
| stress | Conditional | k6 CLI | Ramping beyond normal VU count |
| spike | Conditional | k6 CLI | Rapid ramp and recovery traffic pattern |
| soak | Conditional | k6 CLI | Longer steady-state run; memory tracking requires external metrics |
| scalability | Conditional / Gap | k6 + kubectl | Load followed by HPA read, optional replica criterion; lacks time-series scale analysis |
| security | Conditional | Semgrep, Trivy, ZAP automation plan | Scanner exit outcomes; app-specific authentication policies not auto-generated |
| concurrency | Built-in / Scenario-specific | Node fetch | Parallel requests, allowed statuses and stable response ID for idempotency |
| resilience | Conditional / Scenario-specific | Toxiproxy API | Toxic injection, probe, cleanup; app-specific graceful degradation assertions are not inferred |
| recovery | Conditional | kubectl | Restart deployment, wait for rollout |
| observability | Built-in | HTTP/Prometheus | Health and metrics endpoints respond and expose metric samples |
| contract | Conditional | Schemathesis (`st`) | OpenAPI-derived API fuzzing checks |
| chaos | Conditional | kubectl + Chaos Mesh | Apply a chaos manifest, probe availability and clean up |
| disaster-recovery | Scenario-specific | Configured external drill | Runs a controlled backup-restore procedure; RTO/RPO verified by the provided drill |
| kubernetes | Conditional | kubectl | Resource requests/limits, probes, replica readiness, HPA presence, PDB presence |
| profiling | Scenario-specific | Node --cpu-prof or custom command | Launches configured profiler; trace interpretation is future work |

## Frontend (16 suites)

| Suite | Status | Engine | What this implementation actually verifies |
|---|---|---|---|
| performance | Built-in / Conditional | Playwright or LHCI | Navigation/LCP/long-task sample or Lighthouse CI assertion when config supplied; INP/CLS need field collection |
| rendering | Built-in / Instrumented | React Profiler | Actual render counts and durations from `SaplingProfiler` |
| visual | Built-in | Playwright + pixelmatch | Baseline screenshots, pixel ratio diff, review-only baseline updates |
| accessibility | Built-in | axe-core + Playwright | WCAG-tagged automated rules and serious/critical violations |
| responsive | Built-in | Playwright | Multiple viewports and horizontal overflow |
| cross-browser | Built-in | Playwright | Document load and JS errors in configured browser engines |
| bundle | Built-in | Node fs + gzip | Asset size vs gzip budget |
| memory | Conditional | Chromium CDP | Heap growth across route reloads when Chromium exposes heap metrics |
| security | Built-in / Partial | Playwright | HTTP security headers; Semgrep is configurable external command |
| network | Built-in / Partial | Playwright routing/offline | Block network routes or go offline; fallback assertion configurable |
| seo | Built-in / Partial | Playwright | Title, meta description and noindex presence; no structured-data validation |
| api-integration | Built-in / Scenario-specific | Playwright route mocks | Mock intercepted requests and optional expected selectors |
| observability | Built-in / Instrumented | Browser diagnostics | App-instrumented browser telemetry initialized; not backend delivery verification |
| recovery | Built-in / Scenario-specific | Playwright | Reload/visibility and optional persisted state |
| localization | Built-in / Scenario-specific | Playwright | Locale query and HTML lang; does not inspect translation quality |
| navigation | Built-in / Scenario-specific | Playwright | Navigate configured routes/links; optional expected selector |

## Shared core

- Typed quality config, scoped suite identifiers, selective profiles
- Browser/server runner registration and sequential orchestration
- Host allowlist, non-production destructive guard, VU cap
- External command execution without shell injection and with timeouts
- Unified SuiteResult, threshold checks, JSON/HTML/JUnit reporting
- CLI list, doctor, run; config loading from TS/JS/JSON

## Important omissions / limitations

1. No automated test case suites, by user request.
2. No user-facing historical dashboard or centralized database; report files and HTML are implemented.
3. No distributed controller or multi-agent load scheduler; k6 local runner adapter is built.
4. Kubernetes scaled load verification currently samples after test, not full HPA time series.
5. DR, tracing/alert validation, React-specific state assertions and Pact consumer-provider contract flows require domain-specific integrations.
6. External tool installation, binary pinning, hardened runner image and license review are deployment tasks.
7. Static syntax checks only performed during assembly; dependencies and integration tests were unavailable.
