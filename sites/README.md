# Saplings documentation site

Mintlify renders this directory. The repository stores the site configuration and content. Mintlify provides the hosting service separately and its CLI is distributed under the Elastic License 2.0.

## Preview locally

From the repository root, sync the package references and open the preview.

```bash
pnpm run docs:site:sync
cd sites
npx --yes mint@4.3.76 dev
```

The CLI prints the preview URL. Run `npx --yes mint@4.3.76 broken-links` in this directory to check links using Mintlify.

## Maintain content

- Edit the npm README in `packages/<name>/README.md` for a package reference, then run `pnpm run docs:site:sync` from the repository root. Commit both files.
- Edit other pages directly and update `docs.json` when adding routes to the sidebar.
- Run `pnpm run docs:site:check` to check that package references are current and every navigation route resolves.

## Publish to GitHub Pages

The Documentation Pages workflow checks and exports the site when a pull request to `main` changes the docs, packages, or examples. After a qualifying push to `main`, it deploys the export to [Saplings documentation](https://snrakshith.github.io/saplings/). The workflow also supports manual runs.

Set the repository's Pages source to **GitHub Actions**. The workflow reads the production base path from Pages and checks pull request builds with the repository path. To reproduce that build locally, run from the repository root.

```bash
bash scripts/build-docs-pages.sh /saplings "$(mktemp -d)/site"
```
