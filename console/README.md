# Saplings Developer Console

The console guides onboarding for applications that embed [Kingsman](../packages/kingsman/README.md) for identity and [Harbor](../packages/harbor/README.md) for ingress. Each project can hold multiple tenant drafts. A draft pairs native realm and gateway documents and is saved locally with a revision number.

## Run the console

Use the repository's [Node version](../.node-version) and pnpm 10.

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run build:murphi-ui
pnpm run build:console
pnpm run start:console
```

Open `http://127.0.0.1:4178` and enter the access token printed in the server terminal. The browser keeps the token in memory until you lock or reload the console. The SQLite database persists drafts across restarts.

| Environment variable | Purpose | Default |
| --- | --- | --- |
| `SAPLINGS_CONSOLE_PORT` | Local HTTP port | `4178` |
| `SAPLINGS_CONSOLE_DB` | SQLite file path | `console/.data/console.sqlite` when started with the root script |
| `SAPLINGS_CONSOLE_TOKEN` | Operator bearer token of at least 32 characters | Random token on each start |

The console binds to loopback for use by a local operator. Shared hosting would require authenticated operator identities, project authorization, and an audit trail. Use secret references in configs and protect both the database and downloaded files.

## Connect the Saplings Starter

From the repository root, install dependencies and run `pnpm run build:all`. Start each process in its own terminal.

| Process | Command | URL |
| --- | --- | --- |
| Starter API | `pnpm run dev:api` | `http://127.0.0.1:3000` |
| Starter web | `pnpm run dev:web` | `http://localhost:5173` |
| Developer console | `pnpm run start:console` | `http://127.0.0.1:4178` |

Unlock the console and look for **Saplings Starter → Local workspace**. The starter appears in either startup order. The console imports the Kingsman and Harbor configuration and all eleven SDK drafts from the starter's [`sapling.config.ts`](../apps/api/src/sapling.config.ts).

The starter publishes a credential-free loopback manifest during development. Set `SAPLINGS_STARTER_PORT` on the console if the starter API uses a custom `PORT`. Changing the starter project key allows another starter project to be discovered. The console refreshes source-managed drafts and preserves operator edits. Use **Reload saved draft** to inspect changes in an open workspace. See the [starter guide](../apps/README.md) for the workflow and provider coverage.

## Work with live application services

The **Remote Config** and **Miner** tabs call the selected application's service API. The console access token opens the console and the application operator token authorizes service actions. Remote Config stores revisions and review history in the application. Miner stores consented events, reports, targeting rules, and experiments in the same application boundary. The [starter guide](../apps/README.md#try-remote-config-and-miner) walks through both workflows.

The local starter target is enabled by default. Use `SAPLINGS_SERVICE_TARGETS` to supply a JSON array of `{ "origin", "projectId", "tenantId" }` objects when connecting other applications. For one target, `SAPLINGS_SERVICE_ORIGIN`, `SAPLINGS_SERVICE_PROJECT`, and `SAPLINGS_SERVICE_TENANT` override the starter defaults. Targets must use HTTPS or loopback HTTP. The console matches the selected project and tenant to the configured target and forwards an operator token only to that origin. Each application verifies the operator's access and chooses its own runtime environment.

## Onboard an application

1. **Create a project.** Choose a stable key and a display name.
2. **Add a tenant.** Generate a starter realm and gateway by entering your HTTPS issuer base, or import existing Kingsman JSON and Harbor JSON or YAML. You can also import a console bundle.
3. **Configure Kingsman.** Set the issuer and manage OIDC clients and their redirect URIs. New public clients use authorization code with S256 PKCE.
4. **Configure Harbor.** Register one or more paths, choose the allowed methods and path matching, and route traffic to a new or existing upstream service.
5. **Set up the SDK.** Use the tenant onboarding checklist to work through the eleven SDK areas and track saved drafts.
6. **Configure advanced settings.** Edit either complete native document on the Configuration tab for scopes, roles, identity providers, organizations, TLS, plugins, consumers, or other package settings. The server validates both documents before it saves a new revision. If another session saved first, reload the saved draft before applying your changes.
7. **Export and integrate.** Download `realm.json` and `gateway.json` for the application, or use the bundle to move the draft to another console instance.

A console tenant is an onboarding record. Live tenant and organization provisioning, user administration, and route rollout happen in your application or its deployment pipeline. Runtime support for individual settings depends on the capabilities documented by each package.

## Set up SDK capabilities

Every tenant opens to **Onboarding**. The checklist shows all eleven SDK areas with their saved-draft status. Start with the next unfinished area or open any area directly. Every form saves a tenant-scoped draft and provides an SDK example using the saved settings. Download the drafts from the checklist for staging and review.

| Area | First setup |
| --- | --- |
| Feature flags | Save a flag, rollout percentage, and test subject. |
| Product analytics | Define the first event and test subject. |
| Notifications and webhooks | Choose a channel and register the staging endpoint and signing-secret reference for your worker. |
| Payments | Choose a sandbox provider, callback URL, and credential reference. |
| Billing and subscriptions | Draft a plan, included feature, and monthly usage quota. |
| File storage and media | Choose a storage backend and a tenant-scoped test object. |
| Project and workspace setup | Define workspace and project records for the application tenant. |
| Workflows and background jobs | Choose a job type and retry limit. |
| Audit and activity | Choose a result limit for reviewing an audit trail. |
| Data management and governance | Draft a collection allowlist and retention period. |
| Provider operations | Choose a registered operation kind, staging target, and idempotency key. |

The flag and analytics previews run the real SDK with a temporary store and a synthetic actor. The flag preview uses the console tenant key for bucketing. Verify rollout assignments and event ingestion again with your application's tenant ID and store. Provider calls, live operations, and credential handling happen in the staging application. The setup download contains draft inputs and revision numbers.

## Load the exported files in an SDK application

```ts
import { loadRealmConfig, type IdentityDependencies } from '@saplings/kingsman';
import { loadGatewayConfig, type GatewayDependencies } from '@saplings/harbor';
import { createSapling, defineSaplingConfig } from '@saplings/sdk';

export async function setupSaplings(
  identity: IdentityDependencies,
  gateway: GatewayDependencies,
) {
  const [realmConfig, gatewayConfig] = await Promise.all([
    loadRealmConfig('./config/realm.json'),
    loadGatewayConfig('./config/gateway.json'),
  ]);
  return createSapling(defineSaplingConfig({
    app: { id: 'customer-portal', environment: 'development' },
    platforms: {
      kingsman: { config: realmConfig, dependencies: identity },
      harbor: { config: gatewayConfig, dependencies: gateway },
    },
  }));
}
```

Supply environment-specific adapters and secrets in the application. For production, configure Kingsman's persistent identity store, Argon2id password hasher and stable signing key. Use Harbor's upstream allowlist and any adapters required by your policies. Verify the SDK configuration in staging before rollout. [Platform integration guide](../docs/architecture/HARBOR_KINGSMAN_MIGRATION.md)

## Verify the console

```bash
pnpm run build:console
pnpm test tests/developer-console.test.mjs
```

The integration tests cover tenant creation, native file import, persistence, concurrent edits, access token checks, and the SDK consuming the saved configuration to serve a Harbor route.

Run the browser smoke test with `node console/test/browser.mjs` after building. It uses the Chromium bundled with Playwright. If you already have a local Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path. The PR quality workflow runs the smoke test in its pinned Playwright image.
