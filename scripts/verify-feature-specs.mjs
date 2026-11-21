import fs from 'node:fs';
const m = JSON.parse(fs.readFileSync('docs/features/manifest.json', 'utf8'));
const ids = new Set();
const files = [
  'PRODUCT_SPECIFICATION.md',
  'TECHNICAL_SPECIFICATION.md',
  'GAPS_AND_IMPROVEMENTS.md',
];
for (const f of m.features) {
  if (ids.has(f.directory)) throw Error('Duplicate directory ' + f.directory);
  ids.add(f.directory);
  for (const name of files) {
    const file = f.directory + '/' + name;
    const s = fs.readFileSync(file, 'utf8');
    if (!s.includes(f.id) || !s.includes(m.version) || s.length < 800)
      throw Error('Invalid dossier: ' + file);
  }
  for (const p of f.source) {
    if (!fs.existsSync(p.replace(/:\d+$/, ''))) throw Error('Missing source ' + p);
  }
}
for (const [group, count] of Object.entries({
  saas: 182,
  scanner: 41,
  quality: 32,
  defender: 27,
  packages: 26,
}))
  if (m.counts[group] !== count) throw Error('Count mismatch ' + group);
if (m.total !== ids.size || m.documents !== ids.size * 3) throw Error('Total mismatch');
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
if (m.version !== version) throw Error('Version mismatch');
console.log(
  JSON.stringify(
    {
      version,
      dossiers: m.total,
      documents: m.documents,
      counts: m.counts,
      status: 'all triplets and source references present; not functional certification',
    },
    null,
    2,
  ),
);
