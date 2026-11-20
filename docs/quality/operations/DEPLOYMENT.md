# Deployment — Local, Docker, CI and Kubernetes

## Local

Use Node 22+, install dependencies, `pnpm run build`, run sample API (`pnpm run dev:api`) and Vite frontend (`pnpm run dev:web`), build web assets, then execute quality suites via the CLI. Missing native engines must be installed explicitly. The browser automation dependency does not automatically install browser binaries.

## Docker

- `infra/docker/Dockerfile.api`: sample Express app.
- `infra/docker/Dockerfile.web` and `nginx.conf`: sample Vite build served with security headers and SPA fallback.
- `infra/docker/Dockerfile.runner`: Playwright-based test runner. **Does not bundle** all k6/Semgrep/Trivy/ZAP/Schemathesis binaries; supply these in derived images or separate engine Jobs.
- `infra/docker/compose.yaml`: basic example apps, not an orchestrated full test platform.

```bash
docker compose -f infra/docker/compose.yaml up --build
```

For reproducible deployments: generate and commit `pnpm-lock.yaml` using a connected npm environment, replace example image tags with immutable digests, use `npm ci`, maintain SBOM and patch cadence. The ZIP does not contain an npm-generated lockfile because dependency installation was unavailable in its assembly environment.

## GitHub Actions

- `.github/workflows/quality-pr.yml`: install/build/sample app start/Playwright install/PR profile/report upload. This is intended as an example and must be validated in your CI environment.
- `.github/workflows/quality-scheduled.yml`: intentionally **does not auto-run dangerous/external nightly tests** until isolated cluster, prerequisites and secrets are configured. This prevents a deceptive or unsafe scheduled job.

Important: GitHub Actions default `ubuntu-latest` runner does not include k6, Chaos Mesh, ZAP and Kubernetes access automatically. Use dedicated runner images and cluster auth when enabling these profiles.

## Kubernetes

1. `kubectl apply -f infra/kubernetes/namespace.yaml`
2. Build, publish and substitute your immutable image references in `example-deployments.yaml` and runner manifests.
3. Apply example Deployment, Service, PDB and HPA (requires cluster resource metrics).
4. Apply read-only test-runner RBAC.
5. Deploy a runner Job for safe profiles. Do not mount Kubernetes admin credentials into browser-only Jobs.
6. For chaos/recovery, provision a separate, approved mutation-capable service account and ephemeral environment; enable `--allow-destructive` and config flag.

```bash
kubectl apply -f infra/kubernetes/example-deployments.yaml
kubectl apply -f infra/kubernetes/runner-rbac.yaml
kubectl apply -f infra/kubernetes/runner-job.yaml
kubectl logs -n sapling-quality job/sapling-quality-pr
```

Chart sample: `infra/helm/sapling-quality/`. Its CronJob honors `.Values.schedule`; configure registry image, namespaces, service account and URLs. Charts/manifests are **starter assets** that need your cluster’s networking, image policies, storage, metrics server and secret management.

## Secrets and persistence

Do not commit credentials in quality config. Bind API tokens from CI secret stores or Kubernetes Secrets at execution time. `quality-results/` is ephemeral by default; configure an artifact uploader/object store or PVC for report retention. Use redaction before publishing JUnit/HTML artifacts and screenshots.

## Quality policies

- PR: inexpensive, fast, safe checks.
- Main: regular load/visual/contract checks where prerequisites exist.
- Nightly: heavier stress/spike/soak, leak analysis and network fault suites only in isolated test environments.
- Release: exhaustive planned profile, with external reviewed recovery drills and manual approvals for destructive experiments.
- Production: passive/field monitoring only by default; no automatic destructive suites.
