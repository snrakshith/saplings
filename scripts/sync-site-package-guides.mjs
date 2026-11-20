import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(read(path));
const check = process.argv.includes('--check');

const { navigation } = readJson('sites/docs.json');
const pages = navigation.groups.flatMap(({ pages }) => pages);
assert.equal(new Set(pages).size, pages.length, 'Duplicate Mintlify navigation page');

const packageNames = readdirSync('packages', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(`packages/${entry.name}/package.json`))
  .map(({ name }) => name);
assert.deepEqual(
  pages.filter((page) => page.startsWith('packages/')).sort(),
  packageNames.map((name) => `packages/${name}`).sort(),
  'Update the Mintlify package navigation to match the npm workspaces',
);

for (const name of packageNames) {
  const root = `packages/${name}`;
  const manifest = readJson(`${root}/package.json`);
  const [heading, intro, ...sections] = read(`${root}/README.md`).trim().split('\n\n');
  assert.equal(heading, `# ${manifest.name}`, `Use the npm package name in ${root}/README.md`);
  assert.ok(intro && sections.length, `Add an introduction and examples to ${root}/README.md`);

  const page = [
    '---',
    `title: ${JSON.stringify(manifest.name)}`,
    `description: ${JSON.stringify(intro)}`,
    '---',
    '',
    sections.join('\n\n'),
    '',
  ].join('\n');
  const path = `sites/packages/${name}.mdx`;
  if (check) {
    assert.ok(
      existsSync(path) && read(path) === page,
      `Regenerate ${path} with pnpm run docs:site:sync`,
    );
  } else {
    writeFileSync(path, page);
  }
}

for (const route of pages)
  assert.ok(existsSync(`sites/${route}.mdx`), `Missing Mintlify page ${route}`);
console.log(`Verified ${pages.length} Mintlify pages and ${packageNames.length} package guides`);
