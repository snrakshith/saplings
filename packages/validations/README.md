# @saplings/validations v0.8.0

Default exports delegate directly to pinned upstream Zod 4.6.7 (MIT). No reimplemented semantics or hidden fallback. Install dependencies before using the compatibility entry points. `@saplings/validations/native` retains the independent v0.7 parser, including its stricter coercion and complexity limits. Native is ESM only.

Use `import { z } from "@saplings/validations"` or `/v3` for the upstream v3 compatibility API. Other public entry points: `/v4`, `/mini`, `/v4-mini`, `/v4/mini`, `/v4/core`, `/locales`, `/v4/locales`, `/compile`. All 63 named locale files have `.js` and `.cjs` mirrors. Undocumented/internal paths and custom source-export conditions are not part of the compatibility guarantee. Third-party packages hardcoding `zod` still need Zod.

See docs/technical-specifications/VALIDATIONS.md. The upstream dependency could not be installed in the release sandbox; execute `pnpm run test:validation:compat` and `pnpm run typecheck:validation:compat` after installing.
