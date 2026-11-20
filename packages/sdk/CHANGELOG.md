# @saplings/sdk

## 0.17.2

### Patch Changes

- 886be53: Enforce the tenant freeze inside transactions for direct resource mutations and durable job admission. Paused tenants retain pending work and can resume after reactivation.
- 886be53: Publish onboarding guides, API summaries, and examples in each npm package.
  
  Use the single sapling executable for catalog, scan, doctor, and quality commands. Install @saplings/cli and replace sapling-quality with sapling quality. Replace sapling-quality-legacy with sapling quality legacy.
- Updated dependencies [886be53]
  - @saplings/catalog@0.17.2
  - @saplings/harbor@0.17.2
  - @saplings/kingsman@0.17.2
  - @saplings/middleware@0.17.2
  - @saplings/quality-contracts@0.17.2
  - @saplings/realtime@0.17.2
  - @saplings/security@0.17.2

## 0.17.1

### Patch Changes

- cf8fe00: Prepare the reusable Sapling packages for their first release under the `@saplings` npm scope. Include package license notices and publish installable tarballs with resolved internal dependencies.
- Updated dependencies [cf8fe00]
  - @saplings/catalog@0.17.1
  - @saplings/harbor@0.17.1
  - @saplings/kingsman@0.17.1
  - @saplings/middleware@0.17.1
  - @saplings/quality-contracts@0.17.1
  - @saplings/realtime@0.17.1
  - @saplings/security@0.17.1
