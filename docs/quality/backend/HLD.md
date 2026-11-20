# Backend Quality — High-Level Design

## Technology map

```mermaid
flowchart TD
  CFG[Backend quality config] --> CORE[Shared Core]
  CORE --> HTTP[HTTP workloads]
  CORE --> SAFE[Fault and mutation policy]
  CORE --> SEC[Security / contract]
  CORE --> K8S[Kubernetes operations]
  HTTP --> AC[Autocannon]
  HTTP --> K6[k6 profiles]
  SEC --> ZAP[ZAP / Semgrep / Trivy]
  SEC --> ST[Schemathesis]
  SAFE --> TX[Toxiproxy]
  SAFE --> DR[External restore drill]
  K8S --> A[HPA / Deployment / Chaos Mesh]
  AC --> RESULTS[Unified results]
  K6 --> RESULTS
  ZAP --> RESULTS
  ST --> RESULTS
  TX --> RESULTS
  DR --> RESULTS
  A --> RESULTS
```

## Logical components

1. **Workload builder:** emits k6 JavaScript scripts from typed endpoint models and load/stress/spike/soak/staged profiles. The generated workload captures HTTP request checks and metrics under SLO thresholds.
2. **Benchmark adapter:** invokes Autocannon programmatically and normalizes latency percentile, throughput and errors.
3. **Dependency fault adapter:** talks to Toxiproxy's HTTP API, injects latency and cleans toxic resources in `finally`.
4. **Security/contract adapters:** invoke Semgrep/Trivy/ZAP/Schemathesis installed in trusted runners, using explicit file plans.
5. **Kubernetes adapter:** uses restricted kubectl context/namespace; audits Deployment, HPA, PDB and probes; controlled rollout restart.
6. **Chaos adapter:** applies a provided Chaos Mesh CR; checks endpoint and deletes the CR when finished.
7. **Diagnostics SDK:** optional Node.js process metrics helper: event-loop delay, CPU and heap; sample Express API exposes Prometheus text format.

## Kubernetes interaction

```mermaid
sequenceDiagram
  participant R as Quality runner
  participant P as Policy guard
  participant K as Kubernetes API
  participant A as Application
  R->>P: request chaos/recovery
  P-->>R: permission or deny
  R->>K: apply fault CR / restart deployment
  K-->>R: accepted
  R->>A: health probe under fault
  A-->>R: response / timeout
  R->>K: delete experiment
  R->>K: query rollout status
  K-->>R: readiness
```

## Boundary conditions

- k6 targets external URLs on an explicit allowlist; it runs as a separate process, **not as TypeScript code imported into Node.js**.
- Kubernetes namespace is scoped and read from config; a context may be set explicitly.
- App-specific availability, semantic data correctness and RTO/RPO must be asserted by owners; the package does not infer application invariants automatically.
- The runner is deployment infrastructure; production application images must not embed security scanners and browser engines.
