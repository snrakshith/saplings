# Saplings Starter

Use these applications as the starting point for a Saplings project. The starter pairs a React and TypeScript frontend using Murphi UI and UI Core tokens with an Express API using the Saplings SDK. The developer console discovers the project in development.

## Start a project

1. Fork the repository or start a branch for your project. Set the project key, workspace name, and runtime settings in [`api/src/sapling.config.ts`](api/src/sapling.config.ts).
2. Use the repository's Node version and pnpm. Run `pnpm install --frozen-lockfile` and `pnpm run build:all` from the root.
3. Run `pnpm run dev:api`, `pnpm run dev:web`, and `pnpm run start:console` in separate terminals.
4. Open the [starter web app](http://localhost:5173/dashboard) to run the capability workflows. Open the [developer console](http://127.0.0.1:4178), unlock it, and select the discovered project to review or export onboarding drafts.
5. Replace local adapters with your application’s storage, identity, observability, and provider dependencies. Use verified user and tenant contexts, durable state, and the provider sandbox for integration verification before deployment.

## Onboarding and runtime coverage

| Area | Developer Console | Starter workflow |
| --- | --- | --- |
| Kingsman | Issuer, OIDC clients, advanced realm configuration | Read the actual issuer, keys, and clients |
| Harbor | Services, upstreams, routes, and advanced gateway configuration | Route a real request to the API through Harbor |
| Project and workspace | Workspace and project setup draft | Create and link workspace and project records |
| Feature flags | Rollout settings and SDK preview | Evaluate a flag for the configured subject |
| Product analytics | Event settings and SDK preview | Record and count a product event |
| File storage and media | Storage backend and test file draft | Upload and download a file with its media type |
| Payments | Provider, webhook, and credential reference | Create and replay an order through the local adapter |
| Billing and subscriptions | Plan, currency, entitlement, and quota | Create a plan, meter usage, and verify the entitlement |
| Notifications and webhooks | Channel, endpoint, and signing-secret reference | Send locally, sign a payload, and verify its signature |
| Workflows and background jobs | Job type, retry settings, and SDK example | Enqueue and process a registered job |
| Audit and activity | Audit review settings and SDK example | Write and read a tenant audit event |
| Data management and governance | Collection, retention settings, and SDK example | Import, export, and inspect the current legal hold |
| Provider operations | Driver kind, target, and idempotency key | Submit and reconcile with a local driver |

The eleven SDK setup areas each have a saved draft, an SDK integration example, and a staging checklist. The browser tests exercise all eleven domain forms and both platform editors. The starter also renders the full SDK feature catalog with its actions and runtime notes. The guided surfaces cover the thirteen areas in the table. The catalog documents lower-level operations and provider-specific capabilities for applications to integrate as needed.

The starter workflows run on loopback against bounded local test data. The payment and notification checks use local adapters. The provider operation uses a local driver. The Identity screen links to OIDC metadata verification. For live sign-in, wire Kingsman to your application’s issuer, callback, and durable identity store. Provider callbacks and media transforms depend on the providers you configure. Use your application’s real authorization and persistence when adapting the routes.

## Verify

Run `pnpm run build:starter` and `pnpm run build:console` after building the SDK. Run `node apps/web/test/starter-browser.mjs` with Playwright Chromium installed. GitHub CI runs the same browser test.
