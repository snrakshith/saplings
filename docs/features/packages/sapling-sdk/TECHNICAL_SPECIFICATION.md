# sapling-sdk — @saplings/sdk

Release: 0.17.0 · Technical specification

## Implementation status
Workspace package retained; full installed-workspace release gate open. Package-level compilation or registration is not per-feature functional completeness; see feature dossiers and release blockers.

## Source of truth
- `packages/sdk/package.json`
- `packages/sdk/src`

## Public contract / current implementation
```json
{
  "name": "@saplings/sdk",
  "version": "0.17.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {
    "@saplings/catalog": "workspace:*",
    "@saplings/security": "workspace:*",
    "@saplings/quality-contracts": "workspace:*",
    "@saplings/realtime": "workspace:*",
    "@saplings/middleware": "workspace:*",
    "@saplings/harbor": "workspace:*",
    "@saplings/kingsman": "workspace:*"
  }
}
```

## Configuration and dependencies
Dependencies: @saplings/catalog, @saplings/security, @saplings/quality-contracts, @saplings/realtime, @saplings/middleware, @saplings/harbor, @saplings/kingsman. Peer dependencies: none.

## Execution, persistence and consistency
Compile types and code, enforce package export map, verify dependency graph and clean consuming application; keep dev-only quality out of runtime.

## Security boundary
Review dependency/SBOM, supply-chain integrity, public exports, secret handling and independent security audit where applicable.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Build/typecheck results, package/bundle size, dependency audit, consumer test results.

## Verification design
Build and pack @saplings/sdk from a clean frozen pnpm install; run import/type checks for supported entry points and a consumer integration test. Verify no production bundle accidentally includes dev engines or incompatible browser/Node code.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
