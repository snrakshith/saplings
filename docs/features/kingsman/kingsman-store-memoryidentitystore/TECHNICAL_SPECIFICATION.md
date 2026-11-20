# kingsman-store-memoryidentitystore — MemoryIdentityStore (kingsman/store)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/kingsman/src/store.ts:3`
- `packages/kingsman/package.json`

## Public contract / current implementation
```typescript
export class MemoryIdentityStore implements IdentityStore {
async get<T>(t:string,c:string,i:string):Promise<T|undefined>
async list<T>(t:string,c:string):Promise<T[]>
async put<T extends {id:string}>(t:string,c:string,row:T):Promise<void>
async delete(t:string,c:string,id:string):Promise<boolean>
async transaction<T>(tenant:string,callback:(tx:IdentityStore)=>Promise<T>):Promise<T>
}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Realm-scoped atomic credential/session/action/token transactions, stable production RSA and Argon2id provider, rotating refresh and bounded crypto/HTTP execution.

## Security boundary
Verify PKCE, issuer/audience/RS256, anti-replay and least-privileged client grants; never accept untrusted realm/tenant or persist plaintext credentials.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Login errors, MFA required, token/replay/refresh rejection, breached-password checks, session revocation lag and credential events.

## Verification design
Add a focused fixture for MemoryIdentityStore using its actual declaration, then assert success, edge/error cases and the applicable kingsman acceptance requirements. Test identity API using full RealmConfig, real Argon2id and stable RS256 signer, token/client/realm isolation, OTP, PKCE and refresh replay; run independent OIDC conformance.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
