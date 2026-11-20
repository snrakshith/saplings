# kingsman-config-period — period (kingsman/config)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/kingsman/src/config.ts:3`
- `packages/kingsman/package.json`

## Public contract / current implementation
```typescript
period=(v:unknown,defaultMs:number,maxMs=365*86400000)=>{if(v===undefined)return defaultMs;if(typeof v!=='string'||!/^[1-9]\d{0,7}(?:ms|s|m|h|d)$/.test(v))throw new IdentityError('INVALID_DURATION','Invalid duration');const unit=v.match(/(ms|s|m|h|d)$/)![1],m=Number(v.slice(0,-unit.length))*({ms:1,s:1000,m:60000,h:3600000,d:86400000}[unit as 'ms'|'s'|'m'|'h'|'d']);if(!Number.isSafeInteger(m)||m>maxMs)throw new IdentityError('INVALID_DURATION','Duration out of bounds');return m;}
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
Add a focused fixture for period using its actual declaration, then assert success, edge/error cases and the applicable kingsman acceptance requirements. Test identity API using full RealmConfig, real Argon2id and stable RS256 signer, token/client/realm isolation, OTP, PKCE and refresh replay; run independent OIDC conformance.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
