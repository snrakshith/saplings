# Starter backend

Start this service with `pnpm dev` from the parent Starter directory.

- `src/config/sapling.ts` defines the project, tenant, Kingsman realm, and local Harbor routes.
- `src/http` contains middleware and request policy. `src/features` contains application-owned routes such as the workspace profile.
- `src/platform` contains the Harbor catalog gateway. `src/services` connects Remote Config and Miner to authenticated application routes.
- `src/deployment` contains durable provider wiring, jobs, migrations, and telemetry. `src/starter` contains local walkthroughs and quality fixtures.

See the [Starter guide](../README.md) for running the API, frontend, and worker.
