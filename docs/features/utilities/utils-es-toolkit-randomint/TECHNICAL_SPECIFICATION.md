# utils-es-toolkit-randomint — randomInt (utils/es-toolkit)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/utils/src/es-toolkit.ts:59`
- `packages/utils/package.json`

## Public contract / current implementation
```typescript
randomInt = (minValue: number, maxValue: number): number => {
  const low = Math.ceil(Math.min(minValue, maxValue));
  const high = Math.floor(Math.max(minValue, maxValue));
  return Math.floor(Math.random() * (high - low + 1)) + low;
}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Pure helpers should not mutate inputs unless explicitly documented; stateful/async utilities must bound resources, cancel/clean up, and preserve documented errors.

## Security boundary
Preserve runtime separation: browser-safe root, Node-only server subpath. Reject unsafe keys and unbounded inputs; never use generic helpers as an authorization or crypto policy.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Boundary/property-test coverage, allocation/time complexity for large inputs, dependency and bundle-size regression.

## Verification design
Add a focused fixture for randomInt using its actual declaration, then assert success, edge/error cases and the applicable utilities acceptance requirements. Define exact behavior at empty/invalid inputs, null/undefined, mutation, overflow, Unicode and large input boundaries as relevant; test TypeScript inference and JS runtime behavior.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
