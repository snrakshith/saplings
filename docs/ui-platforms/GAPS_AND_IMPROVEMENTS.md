> **v0.15.0:** [Flat SDK implementation and critical-code changes](../technical-specifications/ENGINEERING_015.md) · [evidence-based production assessment](../technical-specifications/PRODUCTION_READINESS_015.md). P0/P1 items below remain open until real accepted evidence; older version claims are historical.

**Release note:** package count stays 24, but v0.15.0 does not add a native build or certify cross-platform parity. Prior native/UI gaps and source rights remain open.

# UI platforms — Detailed gaps and improvements (v0.14.0)

**Status: engineering integration delivered; production certification OPEN.** Treat source compilation, static tests, browser rendering, native device behavior and accessibility approval as distinct evidence tiers.

## P0 — legal/security, correctness and API stability

- [ ] **Source redistribution rights:** Xlox source has MIT license in its uploaded archive; Murphi README claims MIT but the supplied `murphui.zip` lacks a standalone LICENSE. Obtain and retain the authoritative rights/attribution notice before public release. Keep source references traceable.
- [ ] **React 19.3 + RN 0.88 native build:** Install resolved peers via frozen pnpm lockfile, run real `tsc` and Metro iOS/Android bundling; resolve any official RN type incompatibilities (offline shim verification is not enough).
- [ ] **Web React 19 compatibility:** Rebuild 39 Murphi component folders against React 19 and current Emotion types; run SSR, hydration, StrictMode and representative DOM behavior. Local React18 source check is not a React19 certification.
- [ ] **Overlay accessibility:** Modal/Drawer/Tooltip/Select need focus trapping, focus restoration, Escape/BackHandler handling, screen-reader announcements, background accessibility isolation, nested overlay ownership and scroll-lock preservation. Portals require actual browser verification.
- [ ] **Form accessibility:** Connect error/help text with ARIA on web and `accessibilityLabelledBy`/`accessibilityState` on native; ensure disabled/loading state and keyboard navigation are correct; validate high-contrast mode.
- [ ] **Contrast and accessible theming:** Run automated contrast calculations for every primary/secondary override, including dark mode; add policy to prevent inaccessible on-primary text and non-semantic color pairs. Current override is constrained by hex format, **not** WCAG contrast.
- [ ] **Controlled props parity:** Document controlled/uncontrolled state semantics per component; test focus, default values, changing options, and stale callback behavior. Avoid any uncontrolled state divergence across platforms.
- [ ] **Input security:** Never use UI tokens or local storage as credential storage; escape user-generated markup, never directly render untrusted HTML, and restrict theme overrides to approved tokens.

## P1 — native parity and performance

- [ ] **Native Slider:** Web component exists; no native counterpart yet. Integrate approved native slider with screen-reader adjustable actions, range steps, disabled state and gesture testing.
- [ ] **Native data table virtualization:** `Table` is ScrollView-based, suitable only for small data. Add FlatList/FlashList-based list/table virtualization with stable IDs, column widths and screen-reader ordering for large datasets.
- [ ] **Native modal/select UX:** Validate Android Back, iOS VoiceOver focus, keyboard avoidance, touch target sizes (44/48dp), dynamic type, landscape, safe areas, reduced motion and device-specific scrolling.
- [ ] **Native live app:** Provide an Expo or bare RN host with pinned 0.88 toolchain, Hermes, Metro config, iOS/Android build scripts and device E2E snapshots; the current native example is source-only by design.
- [ ] **Web source-quality remediation:** Audit every Murphi component for unknown DOM prop forwarding, id/label/aria linkage, unmanaged timers, theme mutations and unnecessary rerenders. Source migration alone does not certify 39 components.
- [ ] **Responsive/RTL:** Test breakpoint transitions, density changes and layout in right-to-left/localized screens; use physical/logical spacing and native `I18nManager` where needed.
- [ ] **Typography parity:** Compare actual font metrics, line wrapping, dynamic font scale and platform system fonts; shared base tokens do not ensure pixel-identical rendering.
- [ ] **Themes and product branding:** Add tenant theme override schema, tenant/cache isolation, persisted theme preferences with hydration policy and safe remote theme updates.
- [ ] **Storybook/documentation:** Add interactive web and native stories for default/disabled/loading/error/focus/dark states with screenshots and keyboard/screen-reader review.
- [ ] **UX state machines:** Complex selects/combobox, slider, tooltip, confirmation dialogs and `Command` require deterministic validation with overlapping overlays, async options and touch handling.

## P1 — testing/release automation

- [ ] **Browser matrix:** Build Vite reference in Chromium/Firefox/WebKit, test SSR/hydration, axe accessibility, keyboard navigation, focus restoration, responsive layouts and dark/light rendering.
- [ ] **Native device matrix:** Exercise both iOS and Android on supported versions and screen sizes; capture Detox/Maestro integration flows and VoiceOver/TalkBack outcomes.
- [ ] **Package install:** Generate/review `pnpm-lock.yaml`, frozen clean install, package export and `pnpm pack` checks, dependency/SBOM/peer compatibility and bundle tree-shaking. Registry was not available for this release build.
- [ ] **Performance:** Measure bundle sizes and React commit cost for web; startup FPS, memory, modal rendering and list virtualization on mobile; define budgets before certification.
- [ ] **Cross-platform semantics:** Use structured parity fixture tests for all 39 web folders and 38 native component counterparts, including native-specific behavior. Avoid asserting that same names imply identical capabilities.
- [ ] **Version and supply chain:** Confirm all 24 packages at v0.14.0, no duplicate React bundling, external package licenses and peer contract compatibility.

## P2 — developer experience / maintenance

- [ ] Component generators following Xlox layout, token-driven icons and approved vector assets, codemods for Murphi naming changes, ESM/CJS/Metro conditional export checks.
- [ ] Component API review: consistent `variant`, `size`, `color`, `spacing`, `disabled` and `loading` semantics where applicable; typed field templates for web/native.
- [ ] Automated visual regression approvals, generated component API docs, RFCs per breaking change, changelog and semver release tooling.

**Owners:** UI platform engineer, React web engineer, React Native engineer, accessibility reviewer, legal/license owner. **Close only with source-bound code review, actual browser/device evidence, approved design acceptance and release-gate completion.**
