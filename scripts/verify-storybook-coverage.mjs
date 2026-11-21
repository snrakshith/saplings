import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const [target, output] = process.argv.slice(2);
const packages = { web: 'murphi-ui', app: 'murph-appui' };
assert.ok(
  Object.hasOwn(packages, target) && output,
  'Provide a Storybook target and output directory',
);

const entry = `packages/${packages[target]}/dist/index.d.ts`;
const program = ts.createProgram([entry], {
  module: ts.ModuleKind.NodeNext,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const source = program.getSourceFile(entry);
assert.ok(source, `Build ${packages[target]} before checking its public components`);
const publicModule = checker.getSymbolAtLocation(source);
assert.ok(publicModule, `Could not read exports from ${entry}`);

const { entries } = JSON.parse(readFileSync(join(output, 'index.json'), 'utf8'));
const indexed = Object.values(entries);
const isComponent = (name, type) =>
  /^[A-Z]/.test(name) &&
  (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0);
const components = checker.getExportsOfModule(publicModule).flatMap((symbol) => {
  const exported = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  if (!(exported.flags & ts.SymbolFlags.Value)) return [];
  const type = checker.getTypeOfSymbol(exported);
  return isComponent(symbol.name, type) ? [{ name: symbol.name, type }] : [];
});

assert.ok(components.length > 0, `No public components found in ${entry}`);
let compoundCount = 0;
for (const { name, type: componentType } of components) {
  const stories = indexed.filter(
    ({ title }) => title.startsWith('Components/') && title.split('/').at(-1) === name,
  );
  assert.ok(
    stories.some(({ type }) => type === 'story'),
    `Missing ${target} story for ${name}`,
  );
  assert.ok(
    stories.some(({ type }) => type === 'docs'),
    `Missing ${target} docs for ${name}`,
  );

  const children = componentType
    .getProperties()
    .filter((member) => isComponent(member.name, checker.getTypeOfSymbol(member)));
  compoundCount += children.length;
  if (children.length) {
    const paths = new Set(stories.map(({ importPath }) => importPath));
    const examples = [...paths]
      .map((path) => readFileSync(join('sites/storybook', path), 'utf8'))
      .join('\n');
    for (const member of children) {
      const memberName = `${name}.${member.name}`;
      assert.match(
        examples,
        new RegExp(`<${name}\\.${member.name}\\b`),
        `Missing ${target} example for ${memberName}`,
      );
    }
  }
}

assert.ok(
  indexed.some(({ type, title }) => type === 'docs' && title === 'Foundations/Design tokens'),
  `Missing shared design token documentation in the ${target} Storybook`,
);
console.log(
  `Verified stories and docs for all ${components.length} public ${target} components, ${compoundCount} compound parts, and shared design tokens`,
);
