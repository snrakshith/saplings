> **v0.16.0:** Quality operator test scripts now use Vitest 5. Set `engine: vitest` for new suites; legacy `node-test` remains a deprecated alias running Vitest. The report is read from Vitest JSON and must have at least one pass, no skips and no failures. See [migration guide](../../technical-specifications/TESTING_V016.md).

# Backend Quality — Getting Started

## Prerequisites

- Node.js 22+, pnpm and project dependencies installed.
- Running API (sample: `pnpm run dev:api`, port 3000).
- Optional native engines: `k6`, `st` (Schemathesis), `semgrep`, `trivy`, `zap.sh`, `kubectl`; Chaos Mesh installed on an isolated K8s cluster for chaos suites.
- A dedicated namespace, disposable data and least-privilege test account for destructive suites.

## First run

```bash
pnpm install
pnpm run build
pnpm run dev:api
# separate terminal
pnpm run quality -- run --suite backend:performance,backend:observability,backend:concurrency
```

Customize `sapling.quality.config.ts`: set `backend.baseUrl`, endpoints and status expectations; `backend.profiles.load`; `backend.concurrency` if the API supports an idempotent POST. The example API implements an idempotency-key-based `/api/orders` endpoint.

## Run workload profiles

```bash
pnpm run quality -- run --suite backend:load
pnpm run quality -- run --suite backend:stress
pnpm run quality -- run --suite backend:spike
pnpm run quality -- run --suite backend:soak
```

Configure safe SLO thresholds and baseline traffic in the config. Load generators may require several minutes; do not test remote or production targets without explicit ownership and approvals.

## Kubernetes / chaos

1. Provision isolated target cluster and dedicated `sapling-quality` namespace.
2. Deploy the example API, configure HPA and install read-only runner RBAC.
3. Verify `kubectl config current-context` and namespace before execution.
4. Set `backend.kubernetes` context, namespace, deployment and HPA fields.
5. Use `backend:kubernetes` for read-only resource auditing. **For restart/chaos**, obtain separate approved write RBAC, set `safety.allowDestructive=true` and pass `--allow-destructive`. Do not perform these in production.

```bash
pnpm run quality -- run --suite backend:kubernetes
pnpm run quality -- run --suite backend:recovery --allow-destructive
pnpm run quality -- run --suite backend:chaos --allow-destructive
```

## Add a custom DR drill

Set `backend.kubernetes.drill` to an externally managed executable with argument array. The command must restore into an isolated destination, validate checksums/row counts and measure its own RTO and RPO. The platform records the exit status and logs. Avoid arbitrary shell expansion; supply command/args as separate fields.

## Troubleshooting

- `Cannot launch k6`: install k6 and make executable discoverable in PATH.
- `skipped` appears: suite has missing app-specific config or required instrumented hook; CLI returns failure so it is not misreported as a pass.
- `Target host not allowlisted`: add only authorized test hosts to `allowedHosts`.
- `requires --allow-destructive`: a fault or cluster mutation suite needs explicit CLI flag plus config permission.
- `No permissions on deployment`: service account only grants read-only permissions by default.
