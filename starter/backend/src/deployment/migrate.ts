import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { required } from './settings.js';

async function migrate() {
  const runtimeUrl = new URL(required('DATABASE_URL'));
  const role = 'saplings_starter_runtime';
  if (decodeURIComponent(runtimeUrl.username) !== role || !runtimeUrl.password)
    throw new Error('DATABASE_URL must name the saplings_starter_runtime role with a password.');
  const migrationPath =
    process.env.SAPLINGS_MIGRATIONS_DIR ??
    fileURLToPath(new URL('../../../../packages/adapter-drizzle/migrations/', import.meta.url));
  const files = (await readdir(migrationPath))
    .filter((file) => /^\d{4}_[\w-]+\.sql$/.test(file))
    .sort();
  if (!files.length) throw new Error('No Starter migrations were found.');
  const client = new Client({
    connectionString: required('SAPLINGS_MIGRATION_DATABASE_URL'),
    connectionTimeoutMillis: 3000,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('saplings-starter-migrations'))");
    await client.query(
      'CREATE TABLE IF NOT EXISTS saplings_starter_migrations (name text PRIMARY KEY)',
    );
    for (const file of files) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM saplings_starter_migrations WHERE name = $1',
        [file],
      );
      if (rowCount) continue;
      const source = (await readFile(resolve(migrationPath, file), 'utf8')).trim();
      // Some SDK migrations include their own transaction. Apply their body under the migration lock.
      await client.query(source.replace(/^BEGIN;\s*/i, '').replace(/\s*COMMIT;$/i, ''));
      await client.query('INSERT INTO saplings_starter_migrations (name) VALUES ($1)', [file]);
    }
    const { rowCount } = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
    if (!rowCount) {
      const { rows } = await client.query<{ command: string }>(
        "SELECT format('CREATE ROLE saplings_starter_runtime LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD %L', $1::text) AS command",
        [decodeURIComponent(runtimeUrl.password)],
      );
      await client.query(rows[0].command);
    }
    await client.query('GRANT USAGE ON SCHEMA public TO saplings_starter_runtime');
    await client.query(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.sapling_records TO saplings_starter_runtime',
    );
    await client.query('COMMIT');
    console.log('Starter database migrations applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

try {
  await migrate();
} catch (error) {
  const detail = error instanceof Error && 'code' in error ? String(error.code) : '';
  console.error(
    'Starter migration failed. Check database URLs, migration files, and owner permissions.',
    detail,
  );
  process.exitCode = 1;
}
