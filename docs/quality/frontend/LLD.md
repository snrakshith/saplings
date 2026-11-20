# Frontend Quality — Low-Level Design

## Modules

### `browser.ts`

1. Determine category-specific browser list (`cross-browser`: Chromium/Firefox/WebKit; others: preferred browser).
2. Determine viewport list (`responsive`: mobile/tablet/desktop; other categories: preferred desktop viewport).
3. For each route, open a Playwright page; attach an uncaught `pageerror` collector.
4. Execute suite logic and append `CheckResult` assertions, metrics and artifacts.
5. Close browser/context in `finally`.

**Visual comparison algorithm**: generate screenshot (`animations: disabled`, full page); decode baseline/current PNG using `pngjs`; require matching dimensions; calculate changed-pixel ratio via `pixelmatch`; fail if ratio exceeds `frontend.visual.thresholdRatio`, writing a diff PNG. `--update-baselines` deliberately writes a reviewed new image. Baselines should be committed and reviewed in PRs, not blindly updated by CI.

**Accessibility**: `new AxeBuilder({page}).withTags(...)`, capture serious and critical violations and compare against allowed count. Always pair with human keyboard/assistive-tech checks.

**Responsive**: capture each viewport and verify `document.documentElement.scrollWidth <= innerWidth+1`. Custom layout/design assertions and screenshot baselines can be added.

**Cross-browser**: launch browser engines declared in config and verify document response and absence of uncaught page errors. This is a smoke signal, not full application workflow coverage.

**Memory**: Chromium CDP performs heap garbage collection and collects `performance.memory.usedJSHeapSize`, comparing after repeated reloads. This is nondeterministic and not supported identically across engines; return `skipped` when the metric is unavailable.

**Network**: use `page.route(PATTERN, route.abort)` to simulate failed API requests, or set context offline. Applications may supply an offline indicator selector. Merely executing network blocking is not a correctness assertion without application-specific expectations.

**Localization**: load configured locale query parameter and assert `html[lang]`; optionally add RTL/bidi/truncation baseline suites by application.

**SEO**: check document title, meta description and absence of `noindex`; structured data and canonical validation are improvement items.

**API mocks**: intercept patterns using Playwright route fulfillment and count interceptions. UI expectation selectors are configurable. In the example app, the sample page loads `/api/items` via the Vite dev proxy.

### `bundle.ts`

Recursively enumerate built JS/CSS files, calculate raw byte size and individually gzip each asset. Compare sum of gzipped assets against `maxTotalGzipKb`. This is an **asset transfer-size approximation**, not an interactive performance measurement; caching/chunks and other assets must be accounted for separately for a specific app.

### `lighthouse.ts`

Run `lhci autorun --config FILE` when `frontend.lighthouserc` is supplied. A Lighthouse config should define URLs, run count and assertion budgets. Current adapter chooses LHCI instead of Playwright performance for the `frontend:performance` suite when LHCI config is set; combined lab/browser data is an improvement.

### `browser-observability.ts`

Initialize `onLCP`, `onINP`, `onCLS` handlers from `web-vitals`; capture errors and rejected promises; retain a bounded diagnostic event buffer in the browser for test verification. Call optional event callback and send Beacon to a specified endpoint when configured. Use sampling and redact PII in production.

### `react.ts`

`SaplingProfiler` uses React's native `<Profiler>` and captures `{ id, phase, actualDuration, baseDuration, startTime, commitTime }` into a bounded browser buffer. Rendering suite validates that samples exist and records count/max duration. Future additions: max-duration thresholds per component and effect loop detection.

## Example React integration

```tsx
import {SaplingProfiler} from '@sapling/frontend-quality/react';
import {startFrontendObservability} from '@sapling/frontend-quality/browser';
startFrontendObservability({endpoint:'/telemetry',sampleRate:0.1});
export function App(){return <SaplingProfiler id="root"><main>App</main></SaplingProfiler>;}
```

## Test data and determinism

Use stable fixtures, mocked timestamps and fonts, fixed viewport, consistent browser engine and region, deterministic route state. Review screenshot baselines; avoid snapshot approvals on every automated run. Keep sensitive user data out of screenshots and traces.
