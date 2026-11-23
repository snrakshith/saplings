# Saplings Starter

Use these applications as the starting point for a Saplings project. The starter pairs a React and TypeScript frontend using Murphi UI and UI Core tokens with an Express API using the Saplings SDK. The developer console discovers the project in development.

## Start a project locally

1. Fork this repository. Set the project key, tenant and workspace name in [the shared starter configuration](api/src/sapling.config.ts).
2. Use the Node version in `.node-version` and pnpm 10.11.0. From the root, run `pnpm install --frozen-lockfile`, then `pnpm run build:all`.
3. Run `pnpm run dev:starter` for the API and frontend together. Open [the dashboard](http://localhost:5173/dashboard).
4. In another terminal, run `pnpm run start:console`. Open the [Developer Console](http://127.0.0.1:4178), unlock it with the console token, and select the discovered project.

The local profile runs in memory and resets on restart. It issues local author, reviewer, and member credentials and keeps the discovery and guided test routes on loopback. Use the durable profile to exercise the same application with Kingsman, PostgreSQL, and a separate worker.

## Onboarding and runtime coverage

| Area | Developer Console | Starter workflow |
| --- | --- | --- |
| Kingsman | Issuer, OIDC clients, advanced realm configuration | Read the actual issuer, keys, and clients |
| Harbor | Services, upstreams, routes, and advanced gateway configuration | Route a real request to the API through Harbor |
| Project and workspace | Workspace and project setup draft | Create and link workspace and project records |
| Feature flags | Rollout settings and SDK preview | Evaluate a flag for the configured subject |
| Product analytics | Event settings and SDK preview | Record and count a product event |
| Remote Config | Draft, review, publish, and restore JSON | Read a public welcome message and signed-in workspace settings |
| Miner | Saved reports, cohorts, targeted flags, and A/B experiments | Capture consented browser and server events, record exposure and conversion, and inspect results |
| File storage and media | Storage backend and test file draft | Upload and download a file with its media type |
| Payments | Provider, webhook, and credential reference | Create and replay an order through the local adapter |
| Billing and subscriptions | Plan, currency, entitlement, and quota | Create a plan, meter usage, and verify the entitlement |
| Notifications and webhooks | Channel, endpoint, and signing-secret reference | Send locally, sign a payload, and verify its signature |
| Workflows and background jobs | Job type, retry settings, and SDK example | Enqueue and process a registered job |
| Audit and activity | Audit review settings and SDK example | Write and read a tenant audit event |
| Data management and governance | Collection, retention settings, and SDK example | Import, export, and inspect the current legal hold |
| Provider operations | Driver kind, target, and idempotency key | Submit and reconcile with a local driver |

The eleven SDK setup areas each have a saved draft, an SDK integration example, and a staging checklist. The browser tests exercise all eleven domain forms and both platform editors. The starter also renders the full SDK feature catalog with its actions and runtime notes. The local dashboard runs thirteen guided checks. Remote Config and Miner have separate end-to-end flows. The catalog documents lower-level operations and provider-specific capabilities for applications to integrate as needed.

The starter workflows run on loopback against bounded local test data. The payment and notification checks use local adapters. The provider operation uses a local driver. The Identity screen links to OIDC metadata verification. The durable profile uses Kingsman to sign in with accounts stored in PostgreSQL. Provider callbacks and media transforms depend on the providers you configure. Use your application’s real authorization and persistence when adapting the routes.

## Try Remote Config and Miner

Open **Saplings Starter → Local workspace → Remote Config** in the console. Use the **Starter author token** printed in the API terminal to connect. Select `welcome`, edit the JSON to `{"message":"Welcome to your project"}`, save, and submit for review. Approval publishes that exact revision. Use the **Starter reviewer token** with **Switch operator** for a separate reviewer. A rejected draft can be revised. Restoring a published revision creates a new draft that goes through the same review.

Open [Remote Config and Miner](http://localhost:5173/services) in the starter to read the published welcome message. The `workspace` document has the same JSON shape and requires sign-in with the starter member token. The page revalidates every 30 seconds and clears signed-in settings on sign-out. Development defaults to a single operator. Start the API with `SAPLINGS_CONFIG_REVIEW=distinct-reviewer pnpm run dev:api` to require a separate reviewer locally.

In the console's **Miner** tab, connect with the author token. Save the default `starter-banner` feature flag. Select it in the `onboarding` experiment, then save and launch the experiment. In the starter, allow analytics, record a browser event, sign in with the member token, and record a server event. **Run experiment journey** evaluates the assignment and records exposure followed by `starter.completed`. Open **View results** in the console for variant exposure and conversion counts. Save a trend report for `starter.viewed` to see the browser event, or use funnels and retention to inspect a sequence. Use **Evaluate flag** in the starter to check the flag on its own.

## Run the durable stack

Install Docker with Compose v2 and OpenSSL. From the repository root, run:

```bash
pnpm run starter:prepare
docker compose --env-file .starter/compose.env --profile starter up --build --wait
```

Open [the HTTPS starter](https://localhost:8443). Trust the generated development certificate `.starter/tls-cert.pem` in your local browser. The preparation command writes development-only secrets with restricted permissions and preserves existing files. It gives each checkout a separate Compose project and database volume. Set `STARTER_DB_PORT` in `.starter/compose.env` if your machine already uses port 5432. Read the local accounts from `.starter/accounts.json`. Sign in as **member** and queue a dashboard report to count consented visits from the last 24 hours. The dashboard shows the result from the worker. Visit **Services** to read config and send consented events. PostgreSQL persists the job, its result, sessions, config, and Miner data across API or worker restarts.

For the Console, start it in a separate terminal with the durable service target and the local certificate:

```bash
export NODE_EXTRA_CA_CERTS="$PWD/.starter/tls-cert.pem"
SAPLINGS_SERVICE_ORIGIN=https://localhost:8443 pnpm run start:console
```

Use the project and tenant keys from `sapling.config.ts` when adding or importing their workspace in the Console. Local discovery is only available in the local profile. Sign in to the durable Starter as **author**, choose **Create operator token** on the Identity page, and connect the console with that token. Repeat with **reviewer** for approval. Tokens expire after five minutes and are revoked with the sign-in session. If you need author and reviewer sessions concurrently, use separate browser profiles.

To stop the local stack and preserve its data, run `docker compose --env-file .starter/compose.env --profile starter down`.

## Deploy the same application

- Use `SAPLINGS_STARTER_PROFILE=durable` and `NODE_ENV=production`. Set `APP_ORIGIN` to the public HTTPS origin. Terminate HTTPS at the web proxy and keep the API and database on a private network. Preserve the incoming Host when forwarding to the API. Restrict direct access to the API and its metrics.
- Supply a stable RSA PEM through `SAPLINGS_SIGNING_KEY_FILE` and a stable 32-byte hex `SAPLINGS_VISITOR_SECRET` from your secret manager. Use your deployment certificate, signing key, and account data. Local files generated in `.starter/` are development credentials.
- Run `node dist/deployment/migrate.js` in the API image with `SAPLINGS_MIGRATION_DATABASE_URL` for the database owner and `DATABASE_URL` for the `saplings_starter_runtime` role. The owner applies the Drizzle migrations and grants the scoped runtime role table access. Provision the runtime role separately if the migration account cannot create roles. Only supply the runtime URL to the API and worker. The API and worker verify that RLS is forced and that the runtime database role cannot bypass it.
- Run `node dist/deployment/bootstrap.js` with the runtime settings and `SAPLINGS_BOOTSTRAP_FILE` pointing to a protected JSON array of `{ "username", "email", "password", "role" }` accounts. Roles are `member`, `author`, or `reviewer`. Use unique users for author and reviewer. The bootstrap command skips matching accounts and leaves existing passwords intact. Remove the bootstrap file from the runtime environment after provisioning.
- Run `node dist/server.js` for the API and `node dist/worker.js` from the same image. Use `/health` for liveness and `/ready` for readiness. The worker processes the project’s jobs and runs Miner retention cleanup. The provider settings below connect the durable API to AWS or Cashfree. Use a provider sandbox and verify the deployed integration before accepting live traffic.

## Try local providers and observability

Start the same durable Starter with its provider and observability overlays:

```bash
pnpm run starter:prepare
docker compose --env-file .starter/compose.env -f compose.yaml -f infra/docker/compose.providers.yaml -f infra/docker/compose.observability.yaml --profile starter up --build --wait
```

- Sign in at [the Starter](https://localhost:8443) and open **Providers**. Upload, read, and delete a text object through the S3 adapter. Send a test message and read it in [Mailpit](http://127.0.0.1:8025). The provider overlay uses an S3 emulator, a local SMTP inbox, and Valkey-backed rate limits. It runs with the staging scope and preserves separate Remote Config and Miner data from the production scope.
- Queue a report from **Capabilities** and open [Grafana](http://127.0.0.1:3300). In Explore, choose **Tempo** for traces, **Loki** for structured logs, or **Prometheus** for metrics. Look for services `saplings-starter-api` and `saplings-starter-worker`. API responses carry an `X-Trace-Id` when tracing is enabled. The report worker continues the producer trace and logs the same trace ID. Prometheus receives `starter_http_requests_total` and `starter_worker_jobs_total`.
- Use the same Compose file list when shutting down the overlays. The Grafana and Mailpit ports bind to loopback. The all-in-one telemetry stack is for local use. Point `OTEL_EXPORTER_OTLP_ENDPOINT` at your managed/private collector for deployments. OTLP uses HTTP/protobuf and accepts exporter headers through `OTEL_EXPORTER_OTLP_HEADERS`. The API also exposes its private `/metrics` endpoint.

## Connect deployed providers

| Integration | Settings and behavior |
| --- | --- |
| AWS object storage | Supply `AWS_REGION`, `S3_BUCKET`, and your workload's AWS credentials. Set `S3_KMS_KEY_ID` for a KMS-backed bucket. Upload, read, and delete use user-owned keys under a tenant namespace. AWS-hosted buckets can issue 60-second signed download links. |
| AWS notifications | Set `STARTER_NOTIFICATIONS=aws` and `SES_FROM` to a verified sender. The SDK adapter supports SES email and SNS SMS. The Starter sends a fixed email only to the signed-in account. Configure AWS sandbox permissions and sending limits before delivery. |
| Cashfree Checkout | Set `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, `CASHFREE_ENVIRONMENT`, `STARTER_CHECKOUT_AMOUNT_MINOR` (INR paise), and a stable `SAPLING_ENCRYPTION_KEY` (32 bytes in Base64). Use `SAPLINGS_DEPLOYMENT_ENVIRONMENT=staging` with sandbox credentials. Register the HTTPS app domain and subscribe to success webhooks at `/api/webhooks/cashfree`. The Starter opens hosted checkout, verifies the raw callback, then reconciles verified provider status before displaying capture. Test with a sandbox merchant before enabling production credentials. |
| Durable rate limits | Set `VALKEY_URL` to a private TLS endpoint. PostgreSQL is the shared rate-limit store when Valkey is unset. |

Use separate databases, buckets, and credentials for staging and production. Managed object storage and email delivery require cloud IAM permissions. The app owns recipient and object access rules. Keep the provider credentials, signer, and encryption key in your deployment secret manager.

## Verify

Run `pnpm run build:starter` and `pnpm run build:console` after building the SDK. Run `node apps/web/test/starter-browser.mjs` with Playwright Chromium for the local journey. PR CI also runs the durable stack over HTTPS and tests sign-in, review, event capture, and worker persistence.
