// Disposable CI database only. Never run against production.
import pg from 'pg';
import { readFile } from 'node:fs/promises';
if (!process.env.TEST_ADMIN_DATABASE_URL) throw Error('TEST_ADMIN_DATABASE_URL required');
const db = new pg.Client({ connectionString: process.env.TEST_ADMIN_DATABASE_URL });
await db.connect();
try {
  for (const path of [
    '0001_sapling_records.sql',
    '0002_rls_and_indexes.sql',
    '0003_integrity.sql',
    '0004_search.sql',
  ])
    await db.query(await readFile('packages/adapter-drizzle/migrations/' + path, 'utf8'));
  await db.query(
    "CREATE ROLE sapling_test_app LOGIN PASSWORD 'sapling_ci_only' NOSUPERUSER NOBYPASSRLS",
  );
  await db.query(
    'GRANT USAGE ON SCHEMA public TO sapling_test_app; GRANT SELECT, INSERT, UPDATE, DELETE ON sapling_records TO sapling_test_app',
  );
} finally {
  await db.end();
}
