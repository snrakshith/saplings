# v0.14.0 — Murphi UI / Xlox project architecture

Three new packages; **24 workspace packages total**. User-provided Murphi sources drive the web code and shared token palette; Xlox organizes all three packages around `core`, `components`, `lib`, `icons` and `stories`.

- [Product specification](PRODUCT_SPECIFICATION.md)
- [Technical specification and examples](TECHNICAL_SPECIFICATION.md)
- [39 web / 38 native component parity matrix](COMPONENT_PARITY.md)
- [Detailed gaps and acceptance criteria](GAPS_AND_IMPROVEMENTS.md)
- [Source attribution and redistribution caveats](PROVENANCE.md)

Web usage: `import {MurphiThemeProvider,Button} from '@saplings/murphi-ui'`.

Native usage: `import {MurphAppThemeProvider,Button} from '@saplings/murph-appui'`.

The shared package `@saplings/ui-core` exports the palette, theme and responsive helpers. React Native uses actual RN primitives, **not React DOM/Emotion**. Native device execution and fully installed React19/RN0.88 conformance are not verified by the local source check.
