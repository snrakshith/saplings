import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const packages = readdirSync('packages', { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(({ name }) => {
    const directory = join('packages', name);
    return { directory, manifest: readJson(join(directory, 'package.json')) };
  });
const manifests = new Map(packages.map(({ manifest }) => [manifest.name, manifest]));

function exportTargets(value) {
  if (typeof value === 'string') return [value];
  return Object.values(value ?? {}).flatMap(exportTargets);
}

assert.equal(manifests.size, packages.length, 'Workspace package names must be unique');
const destination = mkdtempSync(join(tmpdir(), 'saplings-pack-'));
try {
  for (const { directory, manifest } of packages) {
    const { name, version } = manifest;
    assert.match(name, /^@saplings\//);
    assert.equal(manifest.private ?? false, false, name);
    assert.equal(manifest.publishConfig?.access, 'public', name);

    execFileSync('pnpm', ['pack', '--pack-destination', destination], { cwd: directory });
    const filename = `${name.slice(1).replace('/', '-')}-${version}.tgz`;
    const archive = join(destination, filename);
    const files = new Set(execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n'));
    const packed = JSON.parse(execFileSync('tar', ['-xOzf', archive, 'package/package.json'], { encoding: 'utf8' }));
    assert.equal(packed.name, name);
    assert.equal(packed.version, version, name);
    assert.ok(files.has('package/LICENSE'), `${name} is missing its license`);

    const bin = typeof packed.bin === 'string' ? [packed.bin] : Object.values(packed.bin ?? {});
    const targets = [packed.main, packed.module, packed.types, ...bin, ...exportTargets(packed.exports)];
    for (const target of targets) {
      if (!target) continue;
      const path = `package/${target.replace(/^\.\//, '')}`;
      assert.ok(files.has(path), `${name} is missing ${target}`);
    }

    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies']) {
      for (const [dependency, range] of Object.entries(packed[field] ?? {})) {
        assert.ok(!range.startsWith('workspace:'), `${name} ships a workspace reference to ${dependency}`);
        assert.ok(!range.startsWith('file:') && !range.startsWith('link:'), `${name} ships a local reference to ${dependency}`);
        if (manifest[field]?.[dependency] === 'workspace:*') {
          assert.equal(range, manifests.get(dependency)?.version, `${name} resolves ${dependency}`);
        }
        assert.ok(!dependency.startsWith('@sapling/'), `${name} references the old scope in ${dependency}`);
      }
    }
    console.log(`Verified ${name}@${version}`);
  }
} finally {
  rmSync(destination, { recursive: true, force: true });
}
