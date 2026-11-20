# Source provenance and licensing

The user supplied `murphui.zip` and `xlox-ui-main.zip` for this upgrade. Both were inspected directly.

- **Murphi UI:** The uploaded archive includes `src/components` with 39 component subdirectories, `src/theme` token files, and `src/utils`. Its `README.md` calls the project "Xlox UI" and describes its license as MIT, but the supplied ZIP did **not** contain a standalone `LICENSE` file. `@sapling/murphi-ui` adapts this actual component source (including Emotion styles and component prop interfaces) and `@sapling/ui-core` adapts the palette and typography source. Confirm ownership and retain an authoritative copyright/license notice before publication or distribution beyond the current project.
- **Xlox UI:** The uploaded archive has an MIT `LICENSE`, copyright (c) 2024 Rakshith. Its source primarily contains `src/core`, `src/components`, `src/lib`, `src/icons`, `src/stories`, and one Bold React component. Its **project structure and export conventions** inform the organization of the three new Sapling packages. No Xlox React component source was copied; using the structure does not imply Xlox provided 39 components.
- **Native:** The React Native components are newly authored idiomatic native implementations of the source design language. They don't copy Emotion/DOM runtime code.

No npm `node_modules`, fonts, screenshots or bundled third-party binaries from the source ZIPs are shipped. The original uploaded archives should be retained by the rights holder separately for traceability.
