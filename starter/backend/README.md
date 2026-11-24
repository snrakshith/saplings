# Starter backend

Start this service with `pnpm dev` from the parent Starter directory.

- `src/config/sapling.ts` assembles the local SDK from the project, Kingsman, and Harbor definitions in the same directory. The durable runtime uses those platform definitions or deployer-supplied files.
- `src/http` contains middleware and request policy. `src/features` contains application-owned routes such as the workspace profile.
- `src/platform` contains the Harbor catalog gateway. `src/services` connects Remote Config and Miner to authenticated application routes.
- `src/deployment` contains durable provider wiring, jobs, migrations, and telemetry. `src/starter` contains local walkthroughs and quality fixtures.

## HTTP integrations

| Integration | Routes | Access and profile |
| --- | --- | --- |
| Status | `GET /health`, `GET /ready`, `GET /metrics` | Both profiles. The HTTPS edge forwards health and readiness. Metrics are served on the private API listener. |
| SDK catalog | `GET /api/starter/catalog` | Local discovery on loopback. Public read through Harbor in durable mode. The internal upstream path is private. |
| Kingsman OIDC | `GET /realms/:realm/.well-known/openid-configuration` | Durable HTTPS. The discovery document supplies the authorization, token, JWKS, userinfo, revocation, and introspection URLs. Each endpoint applies its OIDC grant or token requirements. |
| Session | `GET` and `POST /api/starter/session`, `POST /api/starter/operator-token` | Session status, sign-in and sign-out in both profiles. Only durable authors and reviewers can mint Console tokens. |
| Profile and activity | `GET` and `POST /api/starter/profile`, `GET /api/starter/activity` | Profile reads and writes use the signed-in user's identity. Activity returns the most recent 50 tenant events by default and requires `audit:read`. |
| Remote Config | `GET /api/public/config/:key`, `GET /api/config/:key`, `GET /api/services/config`, `GET` and `POST /api/services/config/:key` | Public and member reads are scoped to the document audience. Console inventory, history, and changes require operator permissions. |
| Miner | `POST /api/miner/{consent,events,identify,server-event}`, `POST /api/miner/flags/:id`, `POST /api/miner/experiments/:id/{assignment,exposure}`, `GET` and `POST /api/services/miner` | Both profiles. Browser tracking observes consent. Identity linking and server events require sign-in. Reporting, configuration, and privacy operations check SDK permissions. |
| Report worker | `POST /api/starter/jobs`, `GET /api/starter/jobs/:id` | Durable member session. Creation requires an idempotency key. Reads check job ownership. |
| Providers | `GET /api/starter/providers`, storage upload/read/link/delete, notification, checkout create/read under that prefix | Durable member session with provider-specific configuration. Objects and checkout orders are owner-scoped. |
| Cashfree | `POST /api/webhooks/cashfree` | Durable provider callback. Verifies the signed raw body and reconciles payment status with Cashfree. |
| Development | Console discovery at `/.well-known/saplings-console.json`, `GET /api/starter`, `POST /api/starter/:id`, and quality fixtures under `/api/items`, `/api/slow`, `/api/orders`, and `/api/telemetry` | Local loopback walkthrough and quality testing. The durable profile omits these routes. |

Use the SDK catalog to select server-side actions for new features. Mount application routes with the corresponding tenant, permission, and ownership checks. The Starter exposes the workflows above as its HTTP interface.

See the [Starter guide](../README.md) for running the API, frontend, and worker.
