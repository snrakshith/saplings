# utils-types-paths — Paths (utils/types)

Release: 0.17.0 · Technical specification

## Implementation status
Exported type contract. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/utils/src/types.ts:36`
- `packages/utils/package.json`

## Public contract / current implementation
```typescript
export type Paths<T, Prefix extends string = ""> = T extends object ? {
  [K in Extract<keyof T, string>]: T[K] extends object
    ? `${Prefix}${K}` | Paths<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`
}[Extract<keyof T, string>] : never;
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Type-only contract: no runtime side effect by itself; verify implementing code observes the declared shape.

## Security boundary
Preserve runtime separation: browser-safe root, Node-only server subpath. Reject unsafe keys and unbounded inputs; never use generic helpers as an authorization or crypto policy.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Boundary/property-test coverage, allocation/time complexity for large inputs, dependency and bundle-size regression.

## Verification design
Typecheck valid and invalid uses of Paths; verify declaration resolution and assignability in an actual consuming package.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
