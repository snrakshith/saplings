import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConsoleApp } from './app.js';
import { ConsoleStore } from './store.js';

process.umask(0o077);
const token = process.env.SAPLINGS_CONSOLE_TOKEN ?? randomBytes(32).toString('base64url');
if (token.length < 32) throw new Error('SAPLINGS_CONSOLE_TOKEN must be at least 32 characters.');
const port = Number(process.env.SAPLINGS_CONSOLE_PORT ?? '4178');
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid SAPLINGS_CONSOLE_PORT.');
const samplePort = Number(process.env.SAPLINGS_SAMPLE_PORT ?? '3000');
if (!Number.isInteger(samplePort) || samplePort < 1 || samplePort > 65535)
  throw new Error('Invalid SAPLINGS_SAMPLE_PORT.');
const database = resolve(process.env.SAPLINGS_CONSOLE_DB ?? '.data/console.sqlite');
mkdirSync(dirname(database), { recursive: true, mode: 0o700 });
const store = new ConsoleStore(database);
const webRoot = fileURLToPath(new URL('../web/', import.meta.url));

const server = createConsoleApp({ store, token, webRoot, samplePort }).listen(
  port,
  '127.0.0.1',
  () => {
    console.log(`Saplings Developer Console http://127.0.0.1:${port}`);
    if (!process.env.SAPLINGS_CONSOLE_TOKEN) console.log(`Console access token ${token}`);
  },
);
server.once('close', () => store.close());
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.close());
}
