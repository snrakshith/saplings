import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.umask(0o077);
const root = fileURLToPath(new URL('../../.starter/', import.meta.url));
mkdirSync(root, { recursive: true, mode: 0o700 });
const hex = () => randomBytes(32).toString('hex');
const run = (...args) => execFileSync('openssl', args, { cwd: root, stdio: 'pipe' });
const exists = (name) => existsSync(root + name);
const output = (name, text) => writeFileSync(root + name, text, { flag: 'wx', mode: 0o600 });

if (!exists('signing-key.pem')) {
  run(
    'genpkey',
    '-algorithm',
    'RSA',
    '-pkeyopt',
    'rsa_keygen_bits:2048',
    '-out',
    'signing-key.pem',
  );
}
if (!exists('tls-cert.pem')) {
  if (!exists('tls-key.pem'))
    run('genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', 'tls-key.pem');
  run(
    'req',
    '-new',
    '-x509',
    '-sha256',
    '-days',
    '30',
    '-key',
    'tls-key.pem',
    '-out',
    'tls-cert.pem',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  );
}
if (!exists('accounts.json')) {
  const accounts = ['member', 'author', 'reviewer'].map((role) => ({
    username: role,
    email: role + '@starter.example.invalid',
    password: randomBytes(24).toString('base64url'),
    role,
  }));
  output('accounts.json', JSON.stringify(accounts, null, 2) + '\n');
}
if (!exists('compose.env')) {
  const owner = hex();
  const runtime = hex();
  output(
    'compose.env',
    [
      'APP_ORIGIN=https://localhost:8443',
      'STARTER_UID=' + (process.getuid?.() ?? 1000),
      'STARTER_GID=' + (process.getgid?.() ?? 1000),
      'STARTER_DB_ADMIN_PASSWORD=' + owner,
      'SAPLINGS_MIGRATION_DATABASE_URL=postgres://sapling_dev:' +
        owner +
        '@postgres:5432/sapling_dev',
      'DATABASE_URL=postgres://saplings_starter_runtime:' + runtime + '@postgres:5432/sapling_dev',
      'SAPLINGS_VISITOR_SECRET=' + hex(),
      '',
    ].join('\n'),
  );
}
console.log('Starter configuration is ready in .starter/.');
