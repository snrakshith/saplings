# Releasing Sapling packages

The reusable libraries under `packages/` publish publicly as `@saplings/*`.
The root workspace (`saplings`), example apps, and demos are private. Package versions are
independent. The root version tracks the SDK repository's readiness evidence.

## Prepare and review a release

1. Run `pnpm changeset` for each change that should ship. Select the affected
   packages and choose a semantic version bump.
2. Merge the changeset to `main`. The **npm Release** workflow creates or updates
   the version PR with package versions, changelogs, and the pnpm lockfile.
3. Review and merge the version PR. The workflow installs the frozen lockfile,
   builds and tests the workspace, verifies the compiled code and type
   declarations in the exact release tarballs, and publishes unpublished
   versions to npm. GitHub tags and releases record what was published.

Run **npm Release** manually with `preview` enabled (the default) to see the
Changesets mode, apply pending version bumps in the runner, and download the
verified tarballs. Preview needs no npm credentials. Run `pnpm run release:verify` for the same package checks locally.
`pnpm run release:version` can prepare the version commit on a branch if the
GitHub Actions version PR setting is disabled.

## Configure the first release

- Under **GitHub Settings → Actions → General**, allow GitHub Actions to create
  pull requests if you want Changesets to maintain the version PR automatically.
- For the initial publish, add the GitHub Actions secret `NPM_TOKEN` using a
  short-lived [granular npm token](https://docs.npmjs.com/creating-and-viewing-access-tokens/)
  from a user who can publish for the organization. Under **Packages and scopes**,
  grant **Read and write (publish and stage)** for `@saplings` and enable
  **Bypass 2FA** for the non-interactive publish.
- After completing the applicable release checks and confirming distribution
  rights for the Murphi-derived UI assets, set the GitHub Actions repository
  variable `NPM_RELEASE_ENABLED` to `true` for automatic releases on pushes to
  `main`. To run a live release manually, select `main` and clear `preview`.
  Changesets opens a version PR when changesets are pending. Merge that PR
  before publishing the bumped versions in a subsequent run.
- After the packages exist, configure an [npm trusted publisher](https://docs.npmjs.com/trusted-publishers/)
  for each package. Use owner `snrakshith`, repository `saplings`, workflow
  `npm-release.yml`, and allow `npm publish`. Then remove `NPM_TOKEN` so later
  releases use GitHub OIDC.

Replace package dependencies and imports that use `@sapling/` with `@saplings/`.

## Inspect a published package

Use the npm package's version selector to inspect `latest` (currently
`0.17.1`). The older `0.0.0-stage` entries are placeholders. You can inspect
the released files with `npm pack @saplings/middleware@latest --dry-run`.
