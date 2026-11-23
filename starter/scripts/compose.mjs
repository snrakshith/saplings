import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [command, ...options] = process.argv.slice(2);
const profiles = new Map([
  ['--providers', 'starter/deploy/compose.providers.yaml'],
  ['--observability', 'starter/deploy/compose.observability.yaml'],
]);
if (!['up', 'down'].includes(command) || options.some((option) => !profiles.has(option))) {
  console.error('Usage: pnpm stack:up|stack:down [--providers] [--observability]');
  process.exitCode = 1;
} else {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const files = [...new Set(options)].flatMap((option) => ['-f', profiles.get(option)]);
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--project-directory',
      '.',
      '--env-file',
      'starter/.starter/compose.env',
      '-f',
      'starter/deploy/compose.yaml',
      ...files,
      '--profile',
      'starter',
      command,
      ...(command === 'up' ? ['--build', '--wait'] : []),
    ],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}
