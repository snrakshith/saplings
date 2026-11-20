# Contributing to Sapling Quality

## Design principles

1. Prefer TypeScript and reuse `@sapling/quality-core` for safety, execution and reporting.
2. Do not reinvent a mature workload/security/browser engine; implement an adapter and normalize its real output.
3. Keep `SuiteResult.status` honest. Missing dependencies are never successful tests.
4. Expose realistic application-specific assertion hooks rather than pretend every app shares the same expected behavior.
5. Avoid destructive test flows in any production environment; mutation-capable Kubernetes roles are separate.
6. Do not package browser binaries, scanners or load generators in application-serving Node.js containers.
7. Document every new adapter's CLI/version dependencies, required permissions, execution duration and cleanup mechanism.

## New adapter checklist

- Add/update suite identifier and configuration in `packages/quality-core/src/types.ts`.
- Implement a `SuiteRunner` in frontend/backend package and register it.
- Use `execFileSafe` for external native binaries (separate argument array, no shell), or documented service API.
- Return real metrics/checks, bounded stdout/stderr and artifact paths; implement cleanup in `finally`.
- Add a safe example configuration and docs about setup/limitations and scenarios.
- Add a fail-closed acceptance threshold appropriate to the category.
- Update `IMPLEMENTATION_MATRIX.md`, PRD/HLD/LLD and operational docs.

## Verification

Before publishing: install dependencies in a connected environment, run `pnpm run build`, run the sample API and web, verify the local PR profile, exercise engine adapters against disposable resources, and review security/licensing. Automated repository self-tests are intentionally omitted at present per project scope.
