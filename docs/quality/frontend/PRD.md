# Product Requirements Document — Frontend Quality

**Product:** `@saplings/frontend-quality` | **Primary targets:** React, TypeScript, browser applications

## 1. Background

Frontend regressions are not limited to whether buttons work. Applications can be functionally correct while loading slowly, failing accessibility, overflowing on mobile, leaking heap after navigation, shipping unsafe headers, breaking visuals in Safari/WebKit, or collecting no field diagnostics. We need one reusable platform package, not a separate test harness in each React repository.

## 2. Product goals

1. Expose 16 browser quality categories through the same core suite/result interfaces as the backend.
2. Standardize realistic navigation, browser/viewports, route lists, thresholds and baseline review.
3. Collect synthetic data and opt-in real-user Web Vitals without requiring developers to reinvent instrumentation.
4. Support production-style CI/CD, scheduled/PR profiles and browser-runner jobs on Kubernetes.
5. Preserve honest pass/fail/skipped semantics: browser automation is not equivalent to human screen-reader usability certification or real-user INP data.

## 3. Capability requirements

| ID | Category | Observable outcome |
|---|---|---|
| FE-01 | Page performance | Navigation, paint/long task samples; optional LHCI |
| FE-02 | React rendering | React Profiler actual render samples/counts |
| FE-03 | Visual regression | Screenshot baseline, diff and threshold |
| FE-04 | Accessibility | axe-core violation findings, WCAG tags |
| FE-05 | Responsive | Viewport matrix, overflow checks |
| FE-06 | Browser compatibility | Chromium, Firefox and WebKit navigation/errors |
| FE-07 | Bundle budgets | Total JS/CSS gzip file budget |
| FE-08 | Memory | Repeated visit heap-growth probe in Chromium |
| FE-09 | Security | CSP and HTTP security header checks, optional static scan command |
| FE-10 | Network resilience | Route blocking/offline simulation, optional fallback selector |
| FE-11 | SEO | Public route title/description/noindex |
| FE-12 | API integration | Intercepted mocked HTTP responses and UI selector expectations |
| FE-13 | Observability | Real-user Web Vitals and error instrumentation, telemetry startup check |
| FE-14 | Recovery | Page reload and optional persisted state assertion |
| FE-15 | Localization | Locale selection and HTML language validation |
| FE-16 | Navigation | Route/link navigation and optional expected DOM selector |

## 4. Roles

- **React engineer:** supplies pages, viewports, expected selectors, budgets, mocks, and approved baselines.
- **Design-system owner:** approves component snapshots, keeps accessible components in Storybook.
- **Accessibility engineer:** supplements automated axe results with manual keyboard/assistive technology validation.
- **Performance engineer:** reviews lab performance and real-user LCP/INP/CLS percentiles.
- **SRE/platform owner:** manages browser runners and keeps tests isolated from production serving pods.

## 5. Critical acceptance criteria

- One config can run frontend-only or full-stack suites.
- Baseline updates happen only via explicit user action; missing baselines fail the visual check.
- Accessibility rules execute in a real browser with readable violation IDs.
- Browser selector and navigation errors are explicit, not swallowed as success.
- `web-vitals` integration allows callers to send sampled metric events to their existing telemetry ingestion service.
- Application-specific behaviors that cannot be automatically inferred are declared in typed scenario config or a custom executable command.

## 6. Scope boundaries

Not an automated guarantee of accessibility conformance, visual correctness on every display, real-user INP percentile, complete SEO quality, manual usability, or CSS design approval. High-fidelity screenshot baselines should be reviewed by humans. UI security is not a substitute for backend authorization tests.

## 7. Product policy

All categories ship through one package. PR/main/nightly/release trigger selection determines execution cost, never code packaging. Private internal dashboards may not need SEO and public marketing pages may not require a user session recovery policy; inapplicable categories are scoped out explicitly.
