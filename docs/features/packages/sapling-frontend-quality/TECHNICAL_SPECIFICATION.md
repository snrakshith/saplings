# sapling-frontend-quality — @saplings/frontend-quality

Release: 0.17.0 · Technical specification

## Implementation status
Workspace package retained; full installed-workspace release gate open. Package-level compilation or registration is not per-feature functional completeness; see feature dossiers and release blockers.

## Source of truth
- `packages/frontend-quality/package.json`
- `packages/frontend-quality/src`

## Public contract / current implementation
```json
{
  "name": "@saplings/frontend-quality",
  "version": "0.17.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./browser": {
      "types": "./dist/browser-observability.d.ts",
      "default": "./dist/browser-observability.js"
    },
    "./react": {
      "types": "./dist/react.d.ts",
      "default": "./dist/react.js"
    },
    "./register": {
      "types": "./dist/register.d.ts",
      "default": "./dist/register.js"
    }
  },
  "dependencies": {
    "@saplings/quality-core": "workspace:*",
    "playwright": "1.56.1",
    "@axe-core/playwright": "^4.10.2",
    "pixelmatch": "^7.1.0",
    "pngjs": "^7.0.0",
    "@saplings/quality-browser-runtime": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18"
  }
}
```

## Configuration and dependencies
Dependencies: @saplings/quality-core, playwright, @axe-core/playwright, pixelmatch, pngjs, @saplings/quality-browser-runtime. Peer dependencies: react.

## Execution, persistence and consistency
Compile types and code, enforce package export map, verify dependency graph and clean consuming application; keep dev-only quality out of runtime.

## Security boundary
Review dependency/SBOM, supply-chain integrity, public exports, secret handling and independent security audit where applicable.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Build/typecheck results, package/bundle size, dependency audit, consumer test results.

## Verification design
Build and pack @saplings/frontend-quality from a clean frozen pnpm install; run import/type checks for supported entry points and a consumer integration test. Verify no production bundle accidentally includes dev engines or incompatible browser/Node code.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
