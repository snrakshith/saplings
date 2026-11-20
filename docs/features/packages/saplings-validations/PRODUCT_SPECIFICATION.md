# saplings-validations — @saplings/validations

Release: 0.17.0 · Product specification

## Purpose and users
Maintain @saplings/validations as an independently consumable workspace package in the unified platform.

**Primary consumer:** SDK/platform maintainer.

## Functional contract
Package entry points: ., ./mini, ./compile, ./locales, ./v3, ./v4, ./v4-mini, ./v4/mini, ./v4/core, ./v4/locales, ./native, ./package.json, ./v4/locales/ar.js, ./v4/locales/ar.cjs, ./v4/locales/az.js, ./v4/locales/az.cjs, ./v4/locales/be.js, ./v4/locales/be.cjs, ./v4/locales/bg.js, ./v4/locales/bg.cjs, ./v4/locales/bn.js, ./v4/locales/bn.cjs, ./v4/locales/ca.js, ./v4/locales/ca.cjs, ./v4/locales/ckb.js, ./v4/locales/ckb.cjs, ./v4/locales/cs.js, ./v4/locales/cs.cjs, ./v4/locales/da.js, ./v4/locales/da.cjs, ./v4/locales/de.js, ./v4/locales/de.cjs, ./v4/locales/el.js, ./v4/locales/el.cjs, ./v4/locales/en.js, ./v4/locales/en.cjs, ./v4/locales/eo.js, ./v4/locales/eo.cjs, ./v4/locales/es.js, ./v4/locales/es.cjs, ./v4/locales/fa.js, ./v4/locales/fa.cjs, ./v4/locales/fi.js, ./v4/locales/fi.cjs, ./v4/locales/fr.js, ./v4/locales/fr.cjs, ./v4/locales/fr-CA.js, ./v4/locales/fr-CA.cjs, ./v4/locales/gu.js, ./v4/locales/gu.cjs, ./v4/locales/he.js, ./v4/locales/he.cjs, ./v4/locales/hi.js, ./v4/locales/hi.cjs, ./v4/locales/hr.js, ./v4/locales/hr.cjs, ./v4/locales/hu.js, ./v4/locales/hu.cjs, ./v4/locales/hy.js, ./v4/locales/hy.cjs, ./v4/locales/id.js, ./v4/locales/id.cjs, ./v4/locales/is.js, ./v4/locales/is.cjs, ./v4/locales/it.js, ./v4/locales/it.cjs, ./v4/locales/ja.js, ./v4/locales/ja.cjs, ./v4/locales/ka.js, ./v4/locales/ka.cjs, ./v4/locales/kh.js, ./v4/locales/kh.cjs, ./v4/locales/km.js, ./v4/locales/km.cjs, ./v4/locales/kn.js, ./v4/locales/kn.cjs, ./v4/locales/ko.js, ./v4/locales/ko.cjs, ./v4/locales/lt.js, ./v4/locales/lt.cjs, ./v4/locales/mk.js, ./v4/locales/mk.cjs, ./v4/locales/ms.js, ./v4/locales/ms.cjs, ./v4/locales/ne.js, ./v4/locales/ne.cjs, ./v4/locales/nl.js, ./v4/locales/nl.cjs, ./v4/locales/nn.js, ./v4/locales/nn.cjs, ./v4/locales/no.js, ./v4/locales/no.cjs, ./v4/locales/ota.js, ./v4/locales/ota.cjs, ./v4/locales/ps.js, ./v4/locales/ps.cjs, ./v4/locales/pl.js, ./v4/locales/pl.cjs, ./v4/locales/pt.js, ./v4/locales/pt.cjs, ./v4/locales/pt-BR.js, ./v4/locales/pt-BR.cjs, ./v4/locales/ro.js, ./v4/locales/ro.cjs, ./v4/locales/ru.js, ./v4/locales/ru.cjs, ./v4/locales/sk.js, ./v4/locales/sk.cjs, ./v4/locales/sl.js, ./v4/locales/sl.cjs, ./v4/locales/sv.js, ./v4/locales/sv.cjs, ./v4/locales/ta.js, ./v4/locales/ta.cjs, ./v4/locales/tg.js, ./v4/locales/tg.cjs, ./v4/locales/th.js, ./v4/locales/th.cjs, ./v4/locales/tk.js, ./v4/locales/tk.cjs, ./v4/locales/tr.js, ./v4/locales/tr.cjs, ./v4/locales/ua.js, ./v4/locales/ua.cjs, ./v4/locales/uk.js, ./v4/locales/uk.cjs, ./v4/locales/ur.js, ./v4/locales/ur.cjs, ./v4/locales/uz.js, ./v4/locales/uz.cjs, ./v4/locales/vi.js, ./v4/locales/vi.cjs, ./v4/locales/zh-CN.js, ./v4/locales/zh-CN.cjs, ./v4/locales/zh-TW.js, ./v4/locales/zh-TW.cjs, ./v4/locales/yo.js, ./v4/locales/yo.cjs.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Validate package exports, type declarations, dependency and peer boundaries, runtime/dev separation, clean install and actual consumer example.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Build and pack @saplings/validations from a clean frozen pnpm install; run import/type checks for supported entry points and a consumer integration test. Verify no production bundle accidentally includes dev engines or incompatible browser/Node code.

## Scope and non-goals
Package-level compilation or registration is not per-feature functional completeness; see feature dossiers and release blockers.

## Status
Workspace package retained; full installed-workspace release gate open. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
