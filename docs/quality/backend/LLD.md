# Backend Quality — Low-Level Design

## Modules and algorithms

### `k6.ts`

- Select `load`, `stress`, `spike`, `soak`, or `scalability` profile.
- Validate peak VU target with `assertWorkloadLimit` and project-specific `safety.maxVirtualUsers`.
- Resolve configured endpoint paths against `backend.baseUrl`, assign weights, and generate one k6 ES module into the run output directory.
- Use `k6 run --summary-export FILE GENERATED.js` (CLI must be on PATH) and enforce `http_req_failed`, `http_req_duration` and `checks` thresholds.
- Parse summary JSON into normalized latency, error-rate and requests-per-second metrics. Include the native JSON artifact.

**Note:** k6's JS runtime is distinct from Node.js; only use API surface shared with k6 in generated scripts. Tests currently use the closed-VU model. Open arrival-rate models, scenarios with setup/teardown and connection pools are extension points.

### `benchmark.ts`

- Use Autocannon's callback API.
- Extract `latency.p95`, `latency.p99`, `requests.average`, error/timeout totals.
- Compare against configured generic `thresholds` and return failed checks if requests errored.

### `http-suites.ts`

- Health and Prometheus metrics endpoint checks; response timing recorded.
- Concurrency test sends up to 200 simultaneous HTTP writes with one idempotency key, checks permitted status codes and (if configured) stable JSON response identifier.
- Contract uses `st run SCHEMA --url BASE_URL`.
- Security uses `semgrep scan`, `trivy fs` and `zap.sh -cmd -autorun PLAN`. Authentication and active-scan safety are supplied through reviewed plan files.

### `toxiproxy.ts`

1. POST a uniquely named `latency` toxic to the configured proxy.
2. Probe the configured service URL.
3. DELETE the toxic in `finally`, even when the probe fails.
4. Record cleanup and endpoint checks; **this is not by itself a retry/backoff semantics test**.

### `kubernetes.ts`

- Read-only deployment audit via `kubectl get deployment -o json`.
- Assert startup/readiness/liveness probes, resource requests/limits, available replicas and optional HPA/PDB.
- Scaling: run staged k6 workload, sample HPA and compare optional `expectedReplicas`. Enhancement: HPA telemetry time series while load is active.
- Recovery: `kubectl rollout restart deployment/X`, then `rollout status` with timeout.
- Chaos: `kubectl apply -f manifest`, probe, `kubectl delete -f manifest --ignore-not-found=true` in finally.
- DR: execute only a configured, reviewed external command; it must assert backup age, restore integrity, RTO/RPO itself.
- Profiling: execute configured Node profiler (`node --cpu-prof ...`), optional helper `createNodeDiagnostics` publishes live CPU/memory/event-loop samples.

## Example app integration

```ts
import {createNodeDiagnostics} from '@sapling/backend-quality/diagnostics';
const diagnostics=createNodeDiagnostics();
const snapshot=diagnostics.snapshot();
console.log(snapshot.heapUsedMb, snapshot.eventLoopLagP95Ms);
// call diagnostics.close() when the process exits
```

## Interpreting measured data

- **p95/p99:** measured API request durations across workload samples. Benchmark and k6 percentiles are not interchangeable across different workload models.
- **Error rate:** k6 `http_req_failed` plus application-status checks; a 2xx response with corrupted business state can still be wrong.
- **HPA replicas:** point-in-time HPA status; scale-out needs adequate duration and metric availability.
- **Soak:** a long run alone does not prove memory stability; correlate RSS, heap, GC, event-loop lag, queue depth and database connection counts.
- **Recovery:** rollout readiness is necessary but insufficient for validating transaction replay and external dependencies.

## Error paths

- Missing engine => execution error, failed suite.
- Config missing for specialized suite => skipped suite, CLI gate fails closed.
- Kubernetes RBAC rejection => failed suite (not automatic privilege escalation).
- Chaos cleanup error => explicit failed cleanup check.
- Timeouts => external process killed; for Kubernetes custom CRs the operator must inspect for orphaned experiments after runner crash.
