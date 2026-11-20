# Frontend Quality — Getting Started

## Prerequisites

Node 22+, npm, Playwright browser binaries. Launch the reference Express API (`pnpm run dev:api`) and React/Vite frontend (`pnpm run dev:web`). For `bundle`, build first: `pnpm run build:web`.

```bash
pnpm install
pnpm run build
pnpm exec playwright install chromium
pnpm run dev:api   # Terminal 1
pnpm run dev:web   # Terminal 2
pnpm run build:web # Terminal 3
pnpm run quality -- run --suite frontend:accessibility,frontend:responsive,frontend:bundle
```

## Configure

Use `frontend.baseUrl` as the deployed frontend target. Set `routes`, `browsers`, `viewports`, visual baseline directory, performance budgets, and allowed security headers in `sapling.quality.config.ts`. Set `allowedHosts` at the root config for authorized domains. This is one config shared with the backend package.

## Visual baseline workflow

```bash
pnpm run quality -- run --suite frontend:visual --update-baselines
# Review PNG images and commit quality-baselines/ to the app repository
pnpm run quality -- run --suite frontend:visual
```

A missing baseline intentionally fails instead of silently making an image. Rebaseline only after UI review.

## Rendering and field telemetry

Wrap measured components with `SaplingProfiler` so `frontend:rendering` can inspect commit samples. Use `startFrontendObservability` at the application entry point to collect LCP, CLS, INP and JavaScript errors. `frontend:observability` only verifies that the instrumented browser emitted diagnostics—it does **not** prove your telemetry collector stored the event.

## Lighthouse CI

Copy `examples/configs/.lighthouserc.json` to a valid `.lighthouserc.json` (or use its path) and set `frontend.lighthouserc`. Install `@lhci/cli` so the `lhci` executable is on PATH. Run `frontend:performance` to execute `lhci autorun`. Note that current adapter chooses this path when configured; it does not merge Playwright timing data into a single run.

## UI cases to tailor

- Authenticated pages: supply a custom Playwright scenario through `frontend.custom` to provision test users and sessions.
- Accessible design: configure WCAG rule tags, then manually review keyboard and assistive technology navigation.
- SEO: use `frontend.publicRoutes` for indexable routes; do not apply public search rules indiscriminately to private consoles.
- Localization: configure locale query parameter and locale codes; add app-specific assertions for actual translations, RTL support and truncation.
- Recovery: provide a stable state selector and `persistAcrossReload=true` for stores that should persist.
- Network: configure blocked pattern or offline mode and an optional fallback selector for meaningful pass/fail.

## Troubleshooting

- Browser launch failed: `pnpm exec playwright install --with-deps chromium firefox webkit`.
- Memory suite skipped: Chrome heap metric unavailable; use supported Chromium flags or a dedicated CDP runner.
- Visual suite failed: compare diff PNG in `quality-results/...`, approve baseline only when expected.
- Bundle suite failed: build assets first, then set realistic per-app budgets.
- Accessibility result absent: confirm the browser loaded the real page and that CSP permits testing instrumentation.
