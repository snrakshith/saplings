# Quality suite technical evaluation — v0.17.0

Original suite implementations retained. Full acceptance requires real engine and application fixtures. The detailed original engine assertions and limitations are preserved in `../quality/IMPLEMENTATION_MATRIX.md`.

| Suite | Engine/source | Source parity | Release validation |
|---|---|---|---|
| backend:performance | Autocannon | retained or adapted | pending or configuration dependent |
| backend:load | k6 weighted workload | retained or adapted | pending or configuration dependent |
| backend:stress | k6 stages | retained or adapted | pending or configuration dependent |
| backend:spike | k6 stages | retained or adapted | pending or configuration dependent |
| backend:soak | k6 sustained workload | retained or adapted | pending or configuration dependent |
| backend:scalability | k6 + HPA | retained or adapted | pending or configuration dependent |
| backend:security | Semgrep / Trivy / ZAP | retained or adapted | pending or configuration dependent |
| backend:concurrency | HTTP idempotency checks | retained or adapted | local test |
| backend:resilience | Toxiproxy latency and cleanup | retained or adapted | pending or configuration dependent |
| backend:recovery | kubectl rollout | retained or adapted | pending or configuration dependent |
| backend:observability | health and Prometheus | retained or adapted | local test |
| backend:contract | Schemathesis/custom | retained or adapted | pending or configuration dependent |
| backend:chaos | Chaos Mesh | retained or adapted | pending or configuration dependent |
| backend:disaster-recovery | operator restore drill | retained or adapted | pending or configuration dependent |
| backend:kubernetes | kubectl resources/probes/HPA/PDB | retained or adapted | pending or configuration dependent |
| backend:profiling | Node profiler command and diagnostics | retained or adapted | pending or configuration dependent |
| frontend:performance | Playwright / LHCI | retained or adapted | pending or configuration dependent |
| frontend:rendering | React Profiler | retained or adapted | pending or configuration dependent |
| frontend:visual | pixelmatch + PNG | retained or adapted | pending or configuration dependent |
| frontend:accessibility | axe-core | retained or adapted | pending or configuration dependent |
| frontend:responsive | viewport checks | retained or adapted | pending or configuration dependent |
| frontend:cross-browser | Chromium / Firefox / WebKit | retained or adapted | pending or configuration dependent |
| frontend:bundle | gzip budgets | retained or adapted | local test |
| frontend:memory | Chromium CDP | retained or adapted | pending or configuration dependent |
| frontend:security | headers / Semgrep | retained or adapted | pending or configuration dependent |
| frontend:network | routing / offline | retained or adapted | pending or configuration dependent |
| frontend:seo | metadata | retained or adapted | pending or configuration dependent |
| frontend:api-integration | route mocks / selectors | retained or adapted | pending or configuration dependent |
| frontend:observability | Web Vitals / browser events | retained or adapted | pending or configuration dependent |
| frontend:recovery | reload state | retained or adapted | pending or configuration dependent |
| frontend:localization | HTML language | retained or adapted | pending or configuration dependent |
| frontend:navigation | navigation / selector | retained or adapted | pending or configuration dependent |

