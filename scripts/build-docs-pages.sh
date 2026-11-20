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
