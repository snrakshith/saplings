# Express demonstration

From the monorepo root: `pnpm install`, `pnpm run build`, then `pnpm --filter @sapling/example-express run dev`. Example uses a hard-coded development-only token and memory storage. Do not deploy it. Production-oriented configuration wiring is in `sapling.production.config.ts.example`; it requires dependency installation, trusted configuration, live provider validation and application-specific routes. The example is not included in the core TypeScript compile.
