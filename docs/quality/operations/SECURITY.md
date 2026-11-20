# Safety, security and abuse boundaries

## Core controls implemented

- `assertTargetAllowed`: only localhost or explicit hostname allowlist. Never use a wildcard allowlist for load testing.
- `assertSafeRun`: production targeting requires an opt-in and destructive suites **always** reject a production environment.
- `assertWorkloadLimit`: VU ceiling defaults to 100; set a lower maximum for shared development environments.
- Destructive suites require both config `safety.allowDestructive=true` and CLI `--allow-destructive`.
- Reserved/shared namespaces (`default`, `kube-system`, `kube-public`, `production`, `prod`) blocked for destructive Kubernetes suites.
- All subprocesses use `spawn` with `shell:false` and timeouts to reduce argument injection and runaway execution.
- Example Kubernetes RBAC is read-only, except where separate changes are explicitly approved.

## Further hardening required before production organizational rollout

1. **DNS pinning / SSRF:** A hostname allowlist alone does not protect against DNS rebinds or malicious redirects. Add IP/CIDR allowlists, redirect restrictions and egress controls.
2. **Control-plane identity:** Enforce SSO/OIDC, short-lived runners and environment scoped credentials; never use kube-admin context.
3. **Secret redaction:** stdout/stderr may contain tokens from external scanners. Implement redaction and safe artifact access before broad CI publication.
4. **Multi-tenancy:** Separate runners, caches, browser profiles, namespaces and telemetry permissions for different teams/tenants.
5. **Data privacy:** screenshots and browser telemetry can capture private content; use synthetic data and retention limits.
6. **Supply-chain risk:** pin npm/native engines by lockfile and digest; scan images; review third-party licenses and SBOM.
7. **Destructive safety:** add Kubernetes admission rules, target label selectors, dry-run previews and expiry/cleanup reconciliation for chaos jobs.
8. **Active scanning:** ZAP plans may submit malformed requests or cause state changes. Run only on authorized disposable instances with approved accounts.
9. **Production policy:** never enable production destructive testing using this CLI; design a separate governed experiment mechanism if real production chaos is later required.

## Incident procedure

If an experiment is interrupted: stop new jobs, inspect Chaos Mesh resources, Toxiproxy toxics, HPA state and Kubernetes rollouts in the *specific isolated namespace*. Remove residual faults only after checking blast radius, preserve logs and runbooks, and verify service health/data consistency. Use `kubectl` access through preapproved roles.
