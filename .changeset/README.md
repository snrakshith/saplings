# Releasing Sapling packages

The reusable libraries under `packages/` publish publicly as `@saplings/*`.
The root workspace, example apps, and demos are private. Package versions are
independent. The root version tracks the SDK repository's readiness evidence.

## Prepare and review a release

1. Run `pnpm changeset` for each change that should ship. Select the affected
   packages and choose a semantic version bump.
2. Merge the changeset to `main`. The **npm Release** workflow creates or updates
   the version PR with package versions, changelogs, and the pnpm lockfile.
3. Review and merge the version PR. The workflow installs the frozen lockfile,
   builds and tests the workspace, verifies the package tarballs, and publishes
   unpublished versions to npm. GitHub tags and releases record what was published.

Run `pnpm run release:verify` to check the tarballs locally.
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
  variable `NPM_RELEASE_ENABLED` to `true`. Run **npm Release** on `main` to
  process changesets already merged.
- After the packages exist, configure an [npm trusted publisher](https://docs.npmjs.com/trusted-publishers/)
  for each package. Use owner `snrakshith`, repository `sapling`, workflow
  `npm-release.yml`, and allow `npm publish`. Then remove `NPM_TOKEN` so later
  releases use GitHub OIDC.

Replace package dependencies and imports that use `@sapling/` with `@saplings/`.
