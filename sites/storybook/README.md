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

Run the web command for port 6006 and the app command for port 6007. Add stories under `stories/web/` or `stories/app/`. Each preview has a light and dark theme control.

## Build for GitHub Pages

The Pages workflow runs `scripts/build-docs-pages.sh` to build the two Storybooks into `storybook/web/` and `storybook/app/` in the same artifact as the Mintlify site. Pull requests build the artifact for review. The workflow deploys it from `main`.
