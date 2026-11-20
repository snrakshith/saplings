# Operator Runbook — Sapling Quality

## Before a run

- [ ] Confirm target environment, owner, allowlisted hosts, URL and namespace/context.
- [ ] Confirm sample data is synthetic and recoverable.
- [ ] Review requested profile and engine prerequisites with `sapling quality doctor`.
- [ ] Confirm browser binaries, Vite build artifacts, API availability and timeouts.
- [ ] For stress/chaos/recovery/DR, obtain approval and segregated credentials; enable two-key guard only where appropriate.
- [ ] Confirm report persistence and alert destination.

## Command reference

```bash
pnpm run quality -- list
pnpm run quality -- doctor
pnpm run quality -- run --profile pr --scope fullstack
pnpm run quality -- run --profile main --scope backend
pnpm run quality -- run --suite frontend:visual --update-baselines
pnpm run quality -- run --suite backend:chaos --allow-destructive
```

## Failure triage

1. **Failed guard**: refuse to override until host/namespace/context reviewed. Check `allowedHosts`, `safety` and runner identity.
2. **Missing binary**: install tool in controlled quality runner. Do not claim the suite passed if it never ran.
3. **Browser launch**: install Playwright browser dependencies and ensure runner has memory/CPU limits appropriate for concurrency.
4. **Lighthouse false regressions**: pin browsers and runner resources, run multiple samples, compare environmental variance and trends.
5. **Visual diffs**: view diff PNG, determine expected/undesired change, explicitly update baseline only after design review.
6. **Load thresholds**: inspect p95/p99, RPS, rate of failed HTTP requests, API logs, DB pool, event-loop delay and autoscaling.
7. **Chaos failure**: verify cleanup resources and explicitly look for orphaned CRs and service health. Restore only through approved SRE procedures.
8. **Report missing**: check runner write permissions, artifact upload conditions and `quality-results` volume.

## Ownership model

Application team: endpoint contracts, navigation and state assertions, SLO budgets, fixtures. Platform team: engine releases, default profiles, runner deployments and policies. SRE: Kubernetes permissions and fault/DR approvals. Security: scanner policies and authorization review. Accessibility/UX: manual acceptance of findings and visual baselines.
