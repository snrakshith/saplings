# Validation compatibility specification

## Decision and scope
The independent v0.7 parser cannot honestly be called fully Zod-compatible. v0.8 uses exact dependency `zod@4.6.7` for default and standard public entry points: exported objects, schema classes, functions, inference types and error objects are the actual upstream implementation, not approximations. MIT upstream dependency; see https://github.com/colinhacks/zod/blob/v4.6.7/LICENSE and https://zod.dev/v4/versioning. We retain our original independent implementation at `@saplings/validations/native` (ESM); it has distinct bounds and semantics. This is an explicit change from the earlier dependency-free default, not completion of an independent clone.

## Entry points
- Root, `/v4` and `/v3`: classic APIs; default and named exports; TypeScript and ESM/CJS entrypoints.
- `/mini`, `/v4-mini`, `/v4/mini`, `/v4/core`, `/locales`, `/v4/locales`, `/compile`: forward upstream exports and side effects.
- 63 named locale modules with `.js` and `.cjs` paths. Source-export conditions and undocumented internal paths are excluded. The package.json subpath returns Sapling's manifest. Third-party hardcoded `zod` imports must still resolve the same installed Zod version; ESM/CJS class identity is only within the corresponding module system.
- Native preserves `ValidationError`, `Schema`, stricter coercion, bounded depth and per-parse budget. These are not aliases for upstream schemas.

## Examples
```ts
import { z } from '@saplings/validations';
const dto = z.object({ email: z.email(), age: z.coerce.number().int().min(18) });
type DTO = z.infer<typeof dto>;
const result = dto.safeParse({ email: 'user@example.com', age: '30' });
const jsonSchema = z.toJSONSchema(dto);
```
```ts
import { z as native } from '@saplings/validations/native';
const strictBoolean = native.coerce.boolean();
```

## Compatibility and migration
Upstream supports JSON schema conversion, error formats, custom issues, registries, codecs and composition via direct re-exports. API/version semantics come from pinned Zod; consult upstream migration guide https://zod.dev/v4/changelog. E.g. Zod boolean coercion follows JavaScript truthiness, whereas native parses explicit true/false; empty string number coercion differs. Never assume parser complexity limits, coercion, object keys or error shapes are interchangeable. Middleware accepts structurally compatible `safeParseAsync` schemas rather than requiring the native `Schema` class. Enforce request-size/depth budgets at ingress, avoid untrusted refinements, and reject circular data before recursive schema parsing. Use `jitless` upstream setting where dynamic evaluation is disallowed. Do not compile unknown schemas.

## Verification
`pnpm run test:validation:compat` compares the exact export identities, ESM/CJS and locale paths, schema results, errors and JSON schema output. `pnpm run typecheck:validation:compat` checks inference and middleware interop. The tests fail explicitly if upstream is unavailable. The local environment could not resolve npm registry; default compatibility integration is **not verified**, native regression tests pass. Full independent Zod reimplementation remains outside this release. Pin upstream and review future upgrade diff, advisories and tests before approval.
