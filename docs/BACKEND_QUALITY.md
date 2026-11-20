> v0.6.0 integration update: see [QUALITY_INTEGRATION.md](QUALITY_INTEGRATION.md) for current full-stack configuration, packages, commands and parity. Earlier SDK sections are retained for context.

# Backend Quality — v0.5.0

## Scope and provenance

This is a backend-only integration into the existing v0.4 SDK monorepo. It reconstructs the recovered Nov 8 backend-quality scope (15 categories, all phases delivered together), not a byte-for-byte merge of the unavailable standalone quality ZIP. No frontend package is added. `@sapling/sdk` retains all 182 SaaS IDs and 41 scanner categories. `@sapling/backend-quality` is a separate development dependency and is never imported by SDK runtime code; the SDK exports the shared configuration types only. `@sapling/cli` loads quality dynamically if installed. All categories ship in one package; approval and infrastructure requirements control execution, not feature editions.

## Category/engine matrix

| Category | Engine/implementation | Evidence required |
|---|---|---|
| Performance | Native HTTP, k6, Autocannon | Latency and throughput thresholds |
| Load | Native or k6/Autocannon | Representative sustained traffic |
| Stress | Native or k6/Autocannon | Saturation, failure behavior, recovery |
| Spike | Native staged runner or k6 | Burst and recovery |
| Soak | Native staged runner or k6 | Sustained load, memory and connection trends |
| Scalability | kubectl replica change and restoration; k6 or operator assertions | Multi-replica capacity and resource efficiency (rollout alone is insufficient) |
| Security | ZAP baseline, operator Node assertions, existing SDK scanner | Findings triaged and app authorization reviewed |
| Concurrency | Native/k6 or Testcontainers/Node | Race conditions and invariants, not just concurrent HTTP |
| Resilience | Toxiproxy example or operator tests | Fault injection, timeout and recovery assertions |
| Recovery | Testcontainers PostgreSQL example or Node | Recovery and reconnect; extend to real stateful workloads |
| Observability | Prometheus metric example / HTTP probe | Metrics, OTel traces, logs, alert delivery; operator tests for traces/alerts |
| Contract | Schemathesis or Node | Application's actual OpenAPI contract |
| Chaos | Chaos Mesh experiment lifecycle test | Approved scoped experiment, assertions, cleanup |
| Disaster recovery | Operator restore test module, Testcontainers | RPO/RTO and business invariants; physical backup/PITR remains external |
| Kubernetes | kubectl rollout and approved scaling or Node | Deployment, Jobs/CronJobs, isolation, resource and network policies |

Supporting database checks (existing PostgreSQL/Valkey integration), profiling (Node CPU/heap and OTel/Prometheus), reporting, policies, engine orchestration, and Kubernetes deployment are cross-cutting. CPU/heap profiling and cluster-specific infrastructure assertions remain operator-run, not implemented as dedicated profilers. Testcontainers and Toxiproxy examples require Docker and approved disposable infrastructure. ZAP and Schemathesis binaries require local installation; verify their CLI versions against the commands. ZAP baseline is not a full penetration test. Autocannon reports an upper bound for p95 using its p97.5 quantile, not an exact p95 measurement. k6 applies thresholds in the engine; raw engine output is not persisted by the current adapter. All external engines must be validated before release.

## Getting started

```sh
pnpm install
pnpm run verify:build
pnpm test
pnpm run quality -- list
pnpm run quality -- run performance --config examples/express-app/sapling.config.ts
pnpm run quality -- report
```

Start the authorized local app first; use Node 22.18+ or the root npm quality script (Node 22.16 with type stripping). External package consumers install `@sapling/sdk` as a runtime dependency and `@sapling/backend-quality` and optionally `@sapling/cli` as dev dependencies. `sapling quality list` or `sapling-quality list` works with published workspace packages; this ZIP does not publish them. TypeScript configs with non-erasable constructs require `node --import tsx` or compilation first. Config modules are trusted executable code and must not initialize production resources on import.

## One configuration

`examples/express-app/sapling.config.ts` imports the typed 15-category example from `quality-profile.ts`. The runtime and quality tool share the same config entry point. `quality` fields: environment (local/staging only), allowedOrigins, targets, allowedNamespaces, allowedDeployments, suites, maxConcurrency, maxDurationSeconds, outputDir, allowDisruptive. Suites declare id, category, engine, target, probes (relative GET paths/statuses/headers), requests, concurrency, durationSeconds, stages, thresholds, timeoutMs, script or approved namespace/deployment. Native runner samples latency with bounded request count and concurrency; errors include unexpected status or network failure. The native runner uses step changes rather than k6 ramp stages. Use workload-specific data and tenants; a health endpoint is not a real production traffic model.

```ts
import {defineSaplingConfig} from '@sapling/sdk';
export default defineSaplingConfig({
 app:{id:'example',environment:'development'},
 quality:{environment:'local',allowedOrigins:['http://127.0.0.1:3000'],
 targets:{api:'http://127.0.0.1:3000'},suites:[{
 id:'smoke',category:'performance',engine:'native',target:'api',
 probes:[{path:'/health',statuses:[200]}],requests:100,concurrency:4,
 thresholds:{maxP95Ms:250,maxErrorRate:0}}]}
});
```

Staging: `QUALITY_STAGING=yes QUALITY_ORIGIN=https://approved.example SAPLING_QUALITY_CONFIRM=yes pnpm run quality -- run load --config examples/express-app/sapling.config.ts`. For disruption, additionally require `SAPLING_QUALITY_DISRUPTIVE=yes` and config `allowDisruptive:true`. Never run against unapproved or production targets. Explicit origin restrictions are not a network sandbox: configure egress controls, DNS and credentials, use scoped sandbox accounts. Operator-supplied scripts and third-party tools are trusted and can perform arbitrary actions; review before execution. Kubernetes default context must be dedicated staging; use scoped RBAC, enforce network policies and review manifests. Example Chaos Mesh scripts require pre-reviewed manifests. Cleanup after cancellation or runner crash remains an operational responsibility.

## CI, Docker and Kubernetes

The regular runtime Dockerfile builds SDK and adapters then removes quality and CLI workspace directories and installs runtime dependencies only. The separate quality Dockerfile is a base runner; extend with pinned engine binaries. Helm Job/CronJob templates are provided for dedicated staging, with disabled service-account token by default. kubectl/chaos runs require a separately reviewed scoped service account and explicit disruptive approval; do not enable privileged Docker sockets in shared clusters. Docker/Helm templates were not executed here. Reports are JSON and JUnit XML; missing engines, blocked suites and failed thresholds cause nonzero CLI exit. Reports are not sufficient by themselves to mark production release gates passed: retain source-bound evidence and independent approval as specified in RELEASE_VALIDATION.md.
