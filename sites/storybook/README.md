# Saplings UI Storybooks

These Storybooks use the compiled workspace packages and their own theme providers. The App UI build renders the React Native components with React Native Web. Run iOS and Android checks separately for native platform behavior.

## Run locally

Run from the repository root. Rebuild the UI packages after editing library source.

```bash
pnpm install --frozen-lockfile
pnpm run build:ui
```

| Storybook | Local command | GitHub Pages |
| --- | --- | --- |
| [Murphi UI](../../packages/murphi-ui/README.md) | `pnpm --filter @saplings/storybook run dev:web` | [React web](https://snrakshith.github.io/saplings/storybook/web/) |
| [Murph App UI](../../packages/murph-appui/README.md) | `pnpm --filter @saplings/storybook run dev:app` | [React Native browser preview](https://snrakshith.github.io/saplings/storybook/app/) |

Run the web command for port 6006 and the app command for port 6007. Add stories under `stories/web/` or `stories/app/`. Each preview has Theme and Density controls. Open **Foundations → Design tokens** for the shared palettes, semantic CSS variables, typography, spacing, breakpoints, radius, depth, and control sizes. The examples use the published component entry points and the values in `@saplings/ui-core`.

## Build for GitHub Pages

The Pages workflow runs `scripts/build-docs-pages.sh` to build the two Storybooks into `storybook/web/` and `storybook/app/` in the same artifact as the Mintlify site. Pull requests build the artifact for review. The workflow deploys it from `main`.

Each Pages build compares the compiled public component exports with the Storybook index. Add a component story and its docs page under **Components** when adding an export. Include compound components such as `Table.Head` in the parent example.
