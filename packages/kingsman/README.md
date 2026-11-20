> **v0.17.0 package identity:** `@saplings/kingsman` is a reusable library, not a deployed platform on its own. Previous package name deprecated; update imports.

# @saplings/kingsman

Keycloak-inspired **multi-tenant realm and organization identity core** for Node 22. Loads uploaded RealmConfig JSON (`identity.sapling.dev/v1alpha1`), exposes user/profile, email verification, password reset, session, client, organization invitation, one-time OAuth Authorization Code + PKCE S256, rotating refresh tokens, RS256 access/ID JWT, JWKS and HTTP OIDC endpoints.

```ts
import {IdentityPlatform,loadRealmConfig,createIdentityHttpHandler} from '@saplings/kingsman';
const config=await loadRealmConfig('./RealmConfig-full.json');
const realm=new IdentityPlatform(config,{store:yourDurableStore,passwordHasher:yourArgon2id,signingKey:yourPersistedRSA,resolveSecret:yourVaultResolver,sendAction:yourSafeMailQueue,breachedPassword:yourBreachChecker});
const handler=createIdentityHttpHandler(realm,{authenticateBrowser:yourVerifiedBrowserSession});
// Mount behind TLS ingress; never use untrusted Host/cookies or client-supplied tenant IDs.
```

**Production requires** persistent transactional store, stable injected RSA signing key, real Argon2id and actual delivery integrations. `MemoryIdentityStore` and ephemeral keys are development only. Google/SAML/LDAP/WebAuthn/SMTP/branding and several policy profiles are configuration-only; no Keycloak/OIDC certification claim. See `docs/platforms/identity/` in the monorepo for exact coverage and gap list.
