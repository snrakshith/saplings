# Sapling Multi-Tenant Identity Platform — Product Specification v0.13.0

## Vision and source
A realm-scoped identity and access platform inspired by Keycloak's tenant/realm/client model, built independently as `@saplings/kingsman`. The uploaded `RealmConfig-full(1).json` is the authoritative desired-state specification. This is a limited OIDC/identity core, **not Keycloak protocol or administration parity**.

## Personas
**Realm/platform owner:** create and configure realm, clients, token/session policies, signing keys and external integrations. **Tenant/org administrator:** manage organization and invitations. **User:** register, verify email, sign in, reset password, use PKCE login and organization membership. **Backend developer:** validate RS256 access tokens, check roles and scopes, and connect identity to API gateway. **SRE/security:** rotate/revoke secrets, monitor attacks, approve production deployment and review immutable security events.

## Required product journeys
1. Use `RealmConfig-full.json` to register realm `school-platform` at issuer `https://auth.school.com/realms/school-platform`, with client policies, roles, groups, token/session timeouts and organizations. External vault references remain unresolved until the application supplies a secure resolver.
2. Configure stable RS256 signing keys, a persistent transaction-capable realm store, a real Argon2id hasher, secure email delivery and breach-password provider. **Production refuses to start without mandatory cryptographic/storage dependencies.**
3. Register `school.com` account under configured password policy and profile edit permissions, verify email via one-time expiring token and sign in. Admins matching conditional auth flow require TOTP; account lockout counters throttle bad credentials.
4. Run the Authorization Code + PKCE S256 flow for `school-web`; issue access/ID tokens plus rotating opaque refresh token; verify signed access via JWKS/public key and enforce issuer, audience, tenant, token age, session revocation and family replay policy.
5. Authenticate `students-svc` via secret-based client credentials with vault resolver. `partner-erp` private-key JWT remains a configured but unsupported login path until a dedicated authenticator is provided.
6. Create organization and invite a verified user using a one-time expiring invitation, then bind configured organization role; JWT optionally reflects organization membership.

## Acceptance
- Duplicate usernames/emails cannot register concurrently; invalid domain, weak/breached password and unverified email follow configured policy.
- Single-use action/authorization codes, PKCE mismatch, wrong client/redirect/audience/issuer, refresh reuse and revoked sessions are rejected.
- Realm isolation holds for users, credentials, sessions, client grants and organizations; no arbitrary client-supplied realm context.
- Production environment requires durable signer, Argon2id and persistent store; no plaintext TOTP secret enrollment in production.
- Expose OIDC discovery, JWKS, authorization (requiring host browser authentication integration), token and userinfo HTTP endpoints. No interactive UI is bundled.
- Document unsupported federation, WebAuthn, external IdPs, SAML, LDAP, branding, SMTP/notification listeners, fine-grained policies and credentials/key rotation as open work, not working functionality.

## Non-goals
Full Keycloak API/flows, SAML SP/IdP, LDAP federation, passwordless WebAuthn, dynamic Google OIDC brokering, OIDC conformance certification, built-in login UI, administrative management API, credential/key lifecycle automation, external KMS/secret manager plugins. See detailed gaps document.
