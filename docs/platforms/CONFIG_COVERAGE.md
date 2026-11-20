# Gateway and realm config coverage — 0.17.0

Config source: uploaded school-platform gateway JSON and full realm JSON, retained verbatim in examples/platform/. YAML is a separate default/orders example referencing realm main, NOT the school-platform realm. The original RealmConfig.status Ready snapshot is informational only. **Partial** means functional source exists but field parity/production proof is incomplete; **config-only** means declared but not wired.

## Gateway spec

| Field | Status | Current implementation / gap |
|---|---|---|
| secretStoreRefs | partial | Secret resolver injected; remote rotation/secret store controllers not implemented |
| observabilityRef | config-only | External observability profile reference not resolved |
| certificates | partial | TLS SNI listener and PEM resolver implemented; actual cert issuance/rotation/real TLS validation pending |
| upstreams | partial | Weighted round-robin/least-connections, probe, circuit breaker; live replica, advanced passive and adaptive logic missing |
| services | partial | HTTP routes, retries, timeouts, method/path/host, basic deprecation; gRPC/TCP/WebSocket protocols not implemented |
| consumerGroups | partial | Scoped plugin override via group membership; durable consumer lifecycle/authorization missing |
| consumers | partial | Static resolved API-key authentication and JWT consumer association; hashing/rotation/revocation need DB |
| plugins | partial | See per-plugin matrix; several advanced actions require external adapters |
| observability | config-only | onEvent hook only; declared log sinks/metrics/traces not wired |

## Gateway plugin controls

| Field | Status | Current implementation / gap |
|---|---|---|
| correlation-id | implemented | Bounded server-generated request ID |
| cors | partial | Exact-origin CORS/preflight; credentials/policies require browser validation |
| ddos-protection | partial | Distributed rate callback/global/IP thresholds; ban/challenge and edge defense missing |
| bot-detection | partial | UA-deny heuristic only; challenge and verified-bot support missing |
| ip-restriction | partial | CIDR and threat feed callback; external feed management missing |
| geo-restriction | partial | Country callback and deny/allow; geodb/reliability external |
| request-size-limiting | implemented | Header and request limits enforced |
| rate-limiting | partial | Scoped token counters via injected store; IETF header details, distributed operational proof pending |
| response-transformer | partial | Top-level JSON mask/remove and headers; nested/object streaming absent |
| logging-override | config-only | Source metadata retained; no dynamic log stream backend |
| jwt | partial | Verifier adapter + realm binding; remote JWKS lifecycle requires adapter |
| acl | implemented | All/any claim allowlist |
| proxy-cache | partial | Authenticated GET-only bounded local cache; no distributed invalidation |
| request-validator | partial | Schema callback required; no schema engine bundled |

## Identity realm spec

| Field | Status | Current implementation / gap |
|---|---|---|
| state | implemented | Active/inactive guard |
| secretStoreRefs | partial | Vault resolver injected for confidential client; key manager/integration rotation not implemented |
| observabilityRef | config-only | External observability ref unused |
| frontend | partial | Issuer and OIDC endpoints; browser themes/branding/locales/login UI require host integration |
| keys | partial | RS256 and JWK; stable production signer injected; key rotation/import management not implemented |
| tokens | partial | Access/ID JWT, rotating refresh with family replay, short-lived auth code; action/ID claims and token exchange incomplete |
| sessions | partial | Realm-scoped transactional sessions and revocation; Redis/rememberMe/offline policies incomplete |
| security | partial | Password policy, breach-check callback, role-conditional TOTP, brute force; WebAuthn/headers and encrypted TOTP need integration |
| registration | partial | Normalized email/domain, verification, reset and account lookup; detailed registration modes/UI need integration |
| userProfile | partial | Registration-time editable string attributes/format checks; full per-role view/edit/multivalued needed |
| requiredActions | partial | VERIFY_EMAIL/RESET_PASSWORD; UPDATE_PROFILE/PASSWORD and TOTP UX not implemented |
| authenticationFlows | partial | Password and conditional OTP; IdP redirect/cookie flow host integration not implemented |
| flowBindings | config-only | Only code flow HTTP handler; other named bindings are not executed |
| organizations | partial | Create org, hashed invitation, accept membership and role; domain verification/per-org IdP not implemented |
| roles | partial | Realm/default/composite roles used for tokens; client-role permission grants missing |
| groups | partial | Default and nested realm group role expansion; admin lifecycle management missing |
| defaultGroups | implemented | Assign default group on registration |
| clientScopes | partial | Basic role/profile/issuer claims; mapper execution per destination incomplete |
| defaultClientScopes | partial | Auth code scope allowlist/default; full optional scope/mappers/consent not implemented |
| clients | partial | Public PKCE code + confidential client secret credentials; private-key-jwt/mTLS/DPoP unavailable |
| clientPolicies | partial | Public PKCE/redirect enforced; general profile executors and advanced policies unavailable |
| identityProviders | config-only | Google/SAML broker settings retained; no federation drivers activated |
| userFederation | config-only | LDAP settings retained; no LDAP connections or sync |
| smtp | config-only | sendAction callback must be provided; SMTP settings are not a mail client |
| events | partial | onEvent callback; no configured webhook/SIEM/audit sink implementations |
| observability | config-only | No metrics/health server wired by default |
| bootstrap | config-only | No bootstrap credentials or users automatically applied; needs approved create-only provisioner |

## Acceptance and next steps

Before production, connect external dependencies, test all enabled config paths with real identities/upstreams, execute OIDC conformance and multi-replica gateway security/recovery tests, close explicit gaps in `harbor/GAPS_AND_IMPROVEMENTS.md` and `kingsman/GAPS_AND_IMPROVEMENTS.md`, and obtain independent review.
