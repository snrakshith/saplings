# Tool selection, boundaries and licensing review

Links and licenses are a **starting checklist**, not legal advice or a substitute for validating the exact dependencies/versions chosen for commercial redistribution.

| Tool | Area | Integration | License class / consideration | Project |
|---|---|---|---|---|
| Vitest 5 | SDK unit, integration, mocked-provider and operator-authored quality fixtures | Test runner, V8 coverage plugin, JSON evidence | MIT (review exact package metadata) | https://vitest.dev/ |
| k6 | API load/stress/spike/soak | CLI + generated JS | AGPL-3.0; review redistribution/modification | https://grafana.com/docs/k6/latest/ |
| Autocannon | Node HTTP benchmark | npm programmatic API | MIT | https://github.com/mcollina/autocannon |
| Toxiproxy | Fault injection | HTTP API | MIT | https://github.com/Shopify/toxiproxy |
| Schemathesis | API schema fuzzing | `st` CLI | Open source; confirm version license | https://schemathesis.readthedocs.io/ |
| OWASP ZAP | Dynamic security analysis | ZAP automation CLI | Apache-2.0 | https://www.zaproxy.org/docs/automate/automation-framework/ |
| Semgrep | Code security analysis | CLI | Check scanner and rule-pack licensing separately | https://semgrep.dev/docs/ |
| Trivy | Image/dependency analysis | CLI | Apache-2.0 | https://trivy.dev/ |
| Chaos Mesh | Kubernetes chaos | Kubernetes CRDs | Apache-2.0 | https://chaos-mesh.org/ |
| Playwright | Browser automation | TypeScript runtime | Apache-2.0 | https://playwright.dev/ |
| axe-core | A11y rules | Playwright wrapper | MPL-2.0 | https://github.com/dequelabs/axe-core |
| Lighthouse CI | Lab web quality | CLI | Apache-2.0 | https://github.com/GoogleChrome/lighthouse-ci |
| web-vitals | Field browser metrics | Browser SDK | Apache-2.0 | https://github.com/GoogleChrome/web-vitals |
| pixelmatch / pngjs | Visual differences | npm library | MIT | https://github.com/mapbox/pixelmatch |
| React Profiler | Rendering measures | React wrapper | MIT React | https://react.dev/reference/react/Profiler |
| OpenTelemetry | Traces and metrics | Planned deeper integration | Apache-2.0 | https://opentelemetry.io/ |
| Prometheus | Backend metrics store | Sample endpoint only; cluster integration separate | Apache-2.0 | https://prometheus.io/ |
| Grafana | Visualization / historical comparison | Future dashboard | AGPL-3.0 and cloud licensing differs | https://grafana.com/ |
| Pact | Consumer contract testing | Future adapter | Open source, confirm exact artifact license | https://docs.pact.io/ |
| MSW | Browser mocks | Not installed; Playwright route mocks implemented | MIT | https://mswjs.io/ |
| Testcontainers | Ephemeral integration dependencies | Future dedicated adapter | MIT for Node module | https://node.testcontainers.org/ |

**Distribution decision:** ship only our original TypeScript source, manifest and integration adapters. External executables run as separate installed tools/container workloads. Do not bundle their source code or container binaries into the published npm package. Lock versions and produce a complete SBOM and third-party notices before actual distribution.
