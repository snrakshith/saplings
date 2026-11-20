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

To host from GitHub, connect the repository in the Mintlify dashboard and enable the docs subdirectory setting and enter `/sites`. See [Mintlify publishing documentation](https://www.mintlify.com/library/publish-open-source-local-docs-on-mintlify).
