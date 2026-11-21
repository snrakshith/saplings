#!/usr/bin/env bash
set -euo pipefail

base_path=${1?Usage: bash scripts/build-docs-pages.sh /base-path output-directory}
destination=${2:?Provide a new output directory}
mint_version=4.3.76
mint_client=0.0.4243

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
node scripts/sync-site-package-guides.mjs --check

scratch_dir=$(mktemp -d)
trap 'rm -r -- "$scratch_dir"' EXIT
archive="$scratch_dir/docs.zip"
(
  cd sites
  npx --yes "mint@$mint_version" broken-links --telemetry=false
  npx --yes "mint@$mint_version" export --telemetry=false \
    --client-version "$mint_client" --base-path "$base_path" --output "$archive"
)

mkdir -- "$destination"
unzip -q "$archive" -x README.md serve.js 'Start Docs.*' -d "$destination"

node --input-type=module - "$destination" <<'JS'
import { statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const destination = process.argv[2];
const { navigation } = JSON.parse(readFileSync('sites/docs.json', 'utf8'));
const pages = ['', ...navigation.groups.flatMap(({ pages }) => pages)];
for (const page of pages) {
  const file = join(destination, page, 'index.html');
  if (statSync(file).size === 0) throw new Error(`Empty Pages export file: ${file}`);
}
console.log(`Verified ${pages.length} rendered entry points in the Pages export`);
JS

pnpm run build:ui
pnpm --filter @saplings/storybook run typecheck
destination=$(realpath -- "$destination")
for target in web app; do
  output="$destination/storybook/$target"
  pnpm --filter @saplings/storybook run "build:$target" --output-dir "$output"
  node scripts/verify-storybook-coverage.mjs "$target" "$output"
  node --input-type=module - "$output" "$base_path/storybook/$target/" <<'JS'
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [output, basePath] = process.argv.slice(2);
const site = new URL(basePath, 'https://pages.invalid');
const { entries } = JSON.parse(readFileSync(join(output, 'index.json'), 'utf8'));
const storyCount = Object.values(entries).filter(({ type }) => type === 'story').length;
assert.ok(storyCount > 0, `No stories were indexed under ${basePath}`);

for (const file of ['index.html', 'iframe.html']) {
  const page = readFileSync(join(output, file), 'utf8');
  assert.ok(page, `Empty Storybook entry point: ${file}`);
  for (const [, reference] of page.matchAll(/<(?:link|script)\b[^>]+(?:href|src)="([^"]+)"/g)) {
    const asset = new URL(reference, site);
    if (asset.origin !== site.origin) continue;
    assert.ok(asset.pathname.startsWith(site.pathname), `Asset outside ${basePath}: ${reference}`);
    const path = join(output, decodeURIComponent(asset.pathname.slice(site.pathname.length)));
    assert.ok(statSync(path).isFile(), `Missing Storybook asset: ${reference}`);
  }
}
console.log(`Verified ${storyCount} stories and entry point assets under ${basePath}`);
JS
done
