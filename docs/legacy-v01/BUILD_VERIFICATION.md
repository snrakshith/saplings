# Build verification — 11 November 2026

Commands run in the construction environment:

```bash
tsc -p packages/catalog
tsc -p packages/security
tsc -p packages/sdk
tsc -p packages/cli
node --test tests/*.test.mjs
```

**Result:** All four core packages compiled; 10 automated tests passed, 0 failed. The optional cloud adapter packages were not compiled or integration-tested because AWS/Drizzle/PostgreSQL dependencies and credentials were unavailable in the build environment. The Express example was not launched because Express was not installed in the environment. Compilation/test success is not a production security audit.

Scanning `packages/sdk/src` with the built CLI resulted in 10 source scanner categories executed, 31 categories not executed (including those requiring an authorized URL or external integration), and 0 heuristic findings. This is not proof that the code has no vulnerabilities.
