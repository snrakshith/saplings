# kingsman-types-realmconfig — RealmConfig (kingsman/types)

Release: 0.17.0 · Technical specification

## Implementation status
Exported type contract. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/kingsman/src/types.ts:4`
- `packages/kingsman/package.json`

## Public contract / current implementation
```typescript
export interface RealmConfig {
 apiVersion:'identity.sapling.dev/v1alpha1';kind:'RealmConfig';metadata:{name:string;environment?:string;displayName?:string};
 spec:{state?:'active'|'inactive';secretStoreRefs?:string[];frontend:{issuer:string;hostnames?:string[];sslRequired?:string};keys:{providers:{name:string;type:string;algorithm?:string;keySize?:number;priority?:number;active?:boolean}[];rotation?:Record<string,unknown>};tokens:{defaultSignatureAlgorithm:string;accessToken:{ttl:string};idToken?:{ttl:string};refreshToken:{ttl:string;rotate?:boolean;reuseDetection?:string};authorizationCode?:{ttl?:string}};sessions:{store?:string;sso:{idle:string;max:string};rememberMe?:{enabled?:boolean;idle:string;max:string}};security:{passwordPolicy:{hashAlgorithm:string;minLength:number;maxLength?:number;require?:{digits?:number;uppercase?:number;lowercase?:number;symbols?:number};notUsername?:boolean;notEmail?:boolean;history?:number;breachedPasswordCheck?:boolean};bruteForce?:{enabled?:boolean;failureFactor?:number;waitIncrement?:string;maxWait?:string;failureReset?:string;permanentLockoutAfter?:number};otpPolicy?:{type:string;algorithm?:string;digits?:number;period?:string;lookAhead?:number};webAuthnPolicy?:unknown;webauthnPolicy?:unknown};registration?:{enabled?:boolean;mode?:string;allowedEmailDomains?:string[];emailAsUsername?:boolean;loginWithEmail?:boolean;verifyEmail?:boolean;resetPasswordAllowed?:boolean;autoLoginAfterRegister?:boolean};userProfile?:{attributes?:{name:string;required?:{roles?:string[]};permissions?:{view?:string[];edit?:string[]};validations?:Record<string,unknown>;sensitive?:boolean}[]};requiredActions?:{alias:string;enabled:boolean}[];authenticationFlows?:{alias:string;steps:{authenticator?:string;subFlow?:string;requirement:string;condition?:Record<string,unknown>}[]}[];flowBindings?:Record<string,string>;organizations?:{enabled?:boolean;membership?:string;invitations?:{enabled?:boolean;ttl?:string;allowedEmailDomainsFromOrg?:boolean};roles?:{name:string}[];defaultRole?:string};roles?:{realm?:{name:string;composites?:{realm?:string[]}}[];defaultRoles?:string[]};groups?:{name:string;roles?:{realm?:string[]};children?:{name:string;roles?:{realm?:string[]}}[]}[];defaultGroups?:string[];clientScopes?:{name:string;protocol?:string;mappers?:unknown[]}[];defaultClientScopes?:{default?:string[];optional?:string[]};clients:RealmClient[];clientPolicies?:Record<string,unknown>;identityProviders?:{alias:string;type:string;enabled?:boolean}[];userFederation?:{name:string;type:string;enabled?:boolean}[];smtp?:Record<string,unknown>;events?:Record<string,unknown>;bootstrap?:Record<string,unknown>;observability?:Record<string,unknown>};status?:unknown;
}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Type-only contract: no runtime side effect by itself; verify implementing code observes the declared shape.

## Security boundary
Verify PKCE, issuer/audience/RS256, anti-replay and least-privileged client grants; never accept untrusted realm/tenant or persist plaintext credentials.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Login errors, MFA required, token/replay/refresh rejection, breached-password checks, session revocation lag and credential events.

## Verification design
Typecheck valid and invalid uses of RealmConfig; verify declaration resolution and assignability in an actual consuming package.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
