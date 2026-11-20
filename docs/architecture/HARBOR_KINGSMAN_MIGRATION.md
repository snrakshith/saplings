# Harbor and Kingsman reusable packages — v0.17.0

## Scope

The monorepo remains **24 packages**, not additional servers. The package names change from `@sapling/gateway` → `@sapling/harbor` and `@sapling/identity-platform` → `@sapling/kingsman`. Public SDK names `sapling.harbor` and `sapling.kingsman` replace the old `gateway` and `identityPlatform` accessors. Old instance getters and `platforms.gateway`/`platforms.identity` keys remain temporarily supported to allow migrations; specifying both old and new keys for one package is rejected. The NPM package names are **breaking**: update imports and dependency manifests; old external package names are not shipped or published as aliases.

### Source ownership moved

- **Kingsman:** Actual `AccessService` (RBAC/ABAC), `IdentityService` (hash-only tenant API keys), `Accounts` (local registration/challenges/login/MFA), `ImpersonationService` and TOTP implementation now reside under `packages/kingsman/src/saas-*.ts`. Type-only Store/Audit ports preserve tenant/record persistence and avoid a circular SDK dependency. `src/saas-foundation.ts` contains the shared error identity and tenant-encrypted MFA secrets in the previous byte-compatible AES-GCM envelope. SDK source paths re-export Kingsman's classes, so existing callers can migrate gradually; data collections/key hashing stay unchanged.
- **Harbor:** `GatewayHttpPolicies` owns SAAS-124/128/131/137/138 envelopes/versioning/correlation/rate headers; `GatewayTlsPolicy` owns SAAS-055 transport verification and optional certificate control. SDK bindings delegate, retaining action names and response shapes. `key-auth` supports an explicitly supplied verifier and is wired to Kingsman's hashed API keys by the SDK **only when** the application supplies a trusted route/host → tenant resolver. The verifier is *not* supplied unconditionally based on user-supplied headers.
- **Shared:** SAAS-133 now uses effective Kingsman RBAC (including roles) rather than raw claims. Kingsman membership proof drives SAAS-031; an explicitly configured Kingsman realm can provide the SAAS-007 verifier, otherwise an external authentication adapter remains necessary.

### Code example

```ts
import {createSapling,defineSaplingConfig} from '@sapling/sdk';
import {Gateway} from '@sapling/harbor';
import {IdentityPlatform} from '@sapling/kingsman';

const sapling = createSapling(defineSaplingConfig({
  app: {id:'app',environment:'development'},
  platforms: {
    harbor: {config:gatewayConfig,dependencies:{
      // Derive only from a verified host + route mapping managed by the application.
      keyTenantForRequest: async ({route})=>trustedTenantForRoute(route.name),
    }},
    kingsman: {config:realmConfig,dependencies:identityDependencies},
  },
}));
sapling.harbor; // Gateway instance, not a deployed service
sapling.kingsman; // Realm instance, not a deployed service
sapling.identity.createApiKey(ctx,{name:'service',scopes:['projects:read']}); // Kingsman-owned service
sapling.access.has(ctx,'projects:read'); // Kingsman-owned RBAC
```

## Security ownership and risks

Harbor owns ingress routing, verified identity/tenant mapping, IP/geo security, traffic limits, CORS/TLS and upstream retries. Kingsman owns subject identity, credentials, token/session revocation, roles/scopes, organization membership proof. SDK **must** retain business resource-level authorization, tenant RLS, CSRF for cookie-authenticated business endpoints, field/row filtering, paid usage quotas and internal retry/bulkhead. `@sapling/security` still owns scanner/defender engines, with edge signals consumed in Harbor by applications. Gateway headers `x-sapling-principal`/`x-sapling-tenant` are **not cryptographic proof**: downstream applications must authenticate the gateway via mTLS/controlled network and must not trust those headers from direct public clients. Durable distributed rate/bans and token state require a production Store/Valkey; local caches aren't adequate.

These moves do not mean Google/SAML/LDAP federation, WebAuthn, hardware device attestation, WAF, OIDC certification, replay-safe cross-system audit, or real cloud integrations are complete. The old SaaS `Accounts` (scrypt) and new realm `IdentityPlatform` (Argon2id provider) maintain different credential datasets and lifecycles; no automatic merging or migration of user identities is performed. Plan explicit migration and Argon2id rehash workflow before converging them. This is not authorization to deploy both as competing account issuers in production.

## Test and migration sequence

1. Change every package import and workspace dependency, then `pnpm install --frozen-lockfile` after generating/reviewing a *real* pnpm lockfile.
2. Switch to `platforms.harbor` and `platforms.kingsman` configuration keys. Legacy aliases are supported temporarily, not simultaneously with their canonical key. Do not change stored sessions/tokens or rotate credentials solely because a package was renamed.
3. Build packages in order: foundations → catalog/security → Kingsman → Harbor → SDK → CLI, followed by app/adapters/quality/UI.
4. Run `pnpm test`, `pnpm run test:consolidation`, `pnpm run test:coverage`, `pnpm run typecheck:sdk`, `pnpm run ownership:refresh`, `pnpm run docs:verify`, `pnpm run consolidation:verify`.
5. Run real PostgreSQL/Valkey multi-replica tests, OIDC conformance, token/key rotation, TLS proxy/gateway spoofing tests, independent security review and live integration gates before production.

Local direct Node smoke checks test the same fixtures listed in `tests/v017.test.mjs`, but they are **not** a replacement for a true installed Vitest 5/V8 coverage run. See current release evidence for exact status.
