# Murphi UI — Product Specification (v0.14.0)

## Objective

Deliver reusable React web and React Native UI systems with a single shared design language, based on the two user-provided source archives. **Murphi UI** supplies the majority of working web component implementations and source design tokens; **Xlox UI** supplies the project organization (`src/core`, `src/components`, `src/lib`, `src/icons`, `src/stories`), public re-export layout and package/testing conventions.

Three and only three new workspace packages:

1. `@sapling/ui-core` — shared theme colors, 23 color families/11 shades, light/dark palettes, density, spacing, typography, breakpoint mapping, token validation, semantics and style adapters; **no React/DOM/native rendering imports**.
2. `@sapling/murphi-ui` — web React + Emotion implementation directly adapted from all **39 source component folders** in Murphi; default theme provider, SSR-compatible rendering, typed component props and exports, source-compatible names.
3. `@sapling/murph-appui` — native React/React Native components using `View`, `Pressable`, `TextInput`, `Modal`, `Image`, `ActivityIndicator`, etc., sharing ui-core. **38 of 39** corresponding named components have a native implementation or approximation; native Slider requires an approved dedicated native control.

## Personas and workflows

- **Design system maintainer:** changes a single semantic token/density/mode and verifies the appearance across web/mobile, publishes compatible versioned packages.
- **React web developer:** builds authorized SaaS dashboards, login/forms, tables, popovers, dialogs, and public content with MurphiThemeProvider, typed React props, and Emotion.
- **React Native developer:** builds native login, forms, list, dialog and navigation screens using the same semantics and design scales, without importing DOM/Emotion.
- **Application accessibility reviewer:** validates actual browser and screen-reader behavior, touch target sizing, keyboard focus and supported dark/light contrast before release.

## Acceptance requirements

- Tokens are deterministic, branded overrides are constrained to safe color values, density and radius validated; identical primary/secondary/semantic colors on web/native.
- No native package imports `react-dom`, `@emotion/*`, `document`, or `window`. Web theme provider supplies Emotion styling and explicit light/dark mode.
- Component props are idiomatic for their platform (`onClick` and DOM attributes on web; `onPress`, `accessibilityRole`, native styles on mobile).
- Web components can be imported and server-rendered; native components compile with the **real React Native 0.88 / React 19.3 typings** and render on both iOS and Android, including keyboard and screen reader validation.
- The existing 21 SDK workspaces, 182 SaaS features, 41 scanners and 32 quality suites are retained; new packages are independently consumable without pulling a React Native runtime into backend SDK or browser dependency graph.

## Scope

Delivered in this iteration: token core, full Murphi web source migration, native component primitives and counterparts, package exports, web reference app adoption, mobile example source, CI scripts, source provenance, docs and regression tests.

Explicit non-goals: pixel-identical rendering across web and mobile; copying Xlox implementation as React Native source; building a navigation/router, icon registry, data grids with virtualization, a cross-platform overlay manager, React Native simulator/signed app binary, or claiming full accessibility certification before device testing.
