# saplings-validations — @saplings/validations

Release: 0.17.0 · Technical specification

## Implementation status
Workspace package retained; full installed-workspace release gate open. Package-level compilation or registration is not per-feature functional completeness; see feature dossiers and release blockers.

## Source of truth
- `packages/validations/package.json`
- `packages/validations/src`

## Public contract / current implementation
```json
{
  "name": "@saplings/validations",
  "version": "0.17.0",
  "exports": {
    ".": {
      "import": {
        "types": "./compat/index.d.mts",
        "default": "./compat/index.mjs"
      },
      "require": {
        "types": "./compat/index.d.cts",
        "default": "./compat/index.cjs"
      }
    },
    "./mini": {
      "import": {
        "types": "./compat/mini.d.mts",
        "default": "./compat/mini.mjs"
      },
      "require": {
        "types": "./compat/mini.d.cts",
        "default": "./compat/mini.cjs"
      }
    },
    "./compile": {
      "import": {
        "types": "./compat/compile.d.mts",
        "default": "./compat/compile.mjs"
      },
      "require": {
        "types": "./compat/compile.d.cts",
        "default": "./compat/compile.cjs"
      }
    },
    "./locales": {
      "import": {
        "types": "./compat/locales.d.mts",
        "default": "./compat/locales.mjs"
      },
      "require": {
        "types": "./compat/locales.d.cts",
        "default": "./compat/locales.cjs"
      }
    },
    "./v3": {
      "import": {
        "types": "./compat/v3.d.mts",
        "default": "./compat/v3.mjs"
      },
      "require": {
        "types": "./compat/v3.d.cts",
        "default": "./compat/v3.cjs"
      }
    },
    "./v4": {
      "import": {
        "types": "./compat/v4.d.mts",
        "default": "./compat/v4.mjs"
      },
      "require": {
        "types": "./compat/v4.d.cts",
        "default": "./compat/v4.cjs"
      }
    },
    "./v4-mini": {
      "import": {
        "types": "./compat/v4-mini.d.mts",
        "default": "./compat/v4-mini.mjs"
      },
      "require": {
        "types": "./compat/v4-mini.d.cts",
        "default": "./compat/v4-mini.cjs"
      }
    },
    "./v4/mini": {
      "import": {
        "types": "./compat/v4-mini.d.mts",
        "default": "./compat/v4-mini.mjs"
      },
      "require": {
        "types": "./compat/v4-mini.d.cts",
        "default": "./compat/v4-mini.cjs"
      }
    },
    "./v4/core": {
      "import": {
        "types": "./compat/v4-core.d.mts",
        "default": "./compat/v4-core.mjs"
      },
      "require": {
        "types": "./compat/v4-core.d.cts",
        "default": "./compat/v4-core.cjs"
      }
    },
    "./v4/locales": {
      "import": {
        "types": "./compat/v4-locales.d.mts",
        "default": "./compat/v4-locales.mjs"
      },
      "require": {
        "types": "./compat/v4-locales.d.cts",
        "default": "./compat/v4-locales.cjs"
      }
    },
    "./native": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./package.json": "./package.json",
    "./v4/locales/ar.js": {
      "types": "./compat/locales/ar.d.ts",
      "default": "./compat/locales/ar.js"
    },
    "./v4/locales/ar.cjs": {
      "types": "./compat/locales/ar.d.cts",
      "default": "./compat/locales/ar.cjs"
    },
    "./v4/locales/az.js": {
      "types": "./compat/locales/az.d.ts",
      "default": "./compat/locales/az.js"
    },
    "./v4/locales/az.cjs": {
      "types": "./compat/locales/az.d.cts",
      "default": "./compat/locales/az.cjs"
    },
    "./v4/locales/be.js": {
      "types": "./compat/locales/be.d.ts",
      "default": "./compat/locales/be.js"
    },
    "./v4/locales/be.cjs": {
      "types": "./compat/locales/be.d.cts",
      "default": "./compat/locales/be.cjs"
    },
    "./v4/locales/bg.js": {
      "types": "./compat/locales/bg.d.ts",
      "default": "./compat/locales/bg.js"
    },
    "./v4/locales/bg.cjs": {
      "types": "./compat/locales/bg.d.cts",
      "default": "./compat/locales/bg.cjs"
    },
    "./v4/locales/bn.js": {
      "types": "./compat/locales/bn.d.ts",
      "default": "./compat/locales/bn.js"
    },
    "./v4/locales/bn.cjs": {
      "types": "./compat/locales/bn.d.cts",
      "default": "./compat/locales/bn.cjs"
    },
    "./v4/locales/ca.js": {
      "types": "./compat/locales/ca.d.ts",
      "default": "./compat/locales/ca.js"
    },
    "./v4/locales/ca.cjs": {
      "types": "./compat/locales/ca.d.cts",
      "default": "./compat/locales/ca.cjs"
    },
    "./v4/locales/ckb.js": {
      "types": "./compat/locales/ckb.d.ts",
      "default": "./compat/locales/ckb.js"
    },
    "./v4/locales/ckb.cjs": {
      "types": "./compat/locales/ckb.d.cts",
      "default": "./compat/locales/ckb.cjs"
    },
    "./v4/locales/cs.js": {
      "types": "./compat/locales/cs.d.ts",
      "default": "./compat/locales/cs.js"
    },
    "./v4/locales/cs.cjs": {
      "types": "./compat/locales/cs.d.cts",
      "default": "./compat/locales/cs.cjs"
    },
    "./v4/locales/da.js": {
      "types": "./compat/locales/da.d.ts",
      "default": "./compat/locales/da.js"
    },
    "./v4/locales/da.cjs": {
      "types": "./compat/locales/da.d.cts",
      "default": "./compat/locales/da.cjs"
    },
    "./v4/locales/de.js": {
      "types": "./compat/locales/de.d.ts",
      "default": "./compat/locales/de.js"
    },
    "./v4/locales/de.cjs": {
      "types":
```

## Configuration and dependencies
Dependencies: zod. Peer dependencies: none.

## Execution, persistence and consistency
Compile types and code, enforce package export map, verify dependency graph and clean consuming application; keep dev-only quality out of runtime.

## Security boundary
Review dependency/SBOM, supply-chain integrity, public exports, secret handling and independent security audit where applicable.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Build/typecheck results, package/bundle size, dependency audit, consumer test results.

## Verification design
Build and pack @saplings/validations from a clean frozen pnpm install; run import/type checks for supported entry points and a consumer integration test. Verify no production bundle accidentally includes dev engines or incompatible browser/Node code.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
