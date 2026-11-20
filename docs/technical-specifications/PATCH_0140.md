# v0.14.0 — Murphi UI and Xlox-structured cross-platform design system

Adds `@sapling/ui-core`, `@sapling/murphi-ui`, `@sapling/murph-appui` to the existing 21-package SDK. Full documentation: [UI platforms](../ui-platforms/README.md). Existing backend APIs, gateway, identity, payments, scanner/defender and 182 SaaS feature inventory are preserved. Shared tokens have no UI-platform runtime dependencies. React web uses the actual uploaded Murphi component source; React Native uses independently authored native primitives and UI-core themes.

**Verification:** shared core and web TypeScript compilation, SSR component smoke checks, native source syntax and structural typecheck using an offline stub. Full React Native typecheck, Metro bundle and iOS/Android device tests remain open; existing production gates unchanged. A real pnpm frozen install requires a lockfile and registry access.
