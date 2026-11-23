import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { Client } from 'pg';

export async function verifyWorkerRetry(databaseUrl, id, getJob) {
  const tenant = 'local';
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  async function scoped(operation) {
    await client.query('BEGIN');
    try {
      await client.query("SELECT set_config('sapling.tenant_id', $1, true)", [tenant]);
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [tenant]);
      const result = await operation();
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  const jobFilter = "tenant_id = $1 AND collection = 'durable-jobs' AND id = $2";
  try {
    const original = await getJob();
    const attempts = await scoped(async () => {
      const { rows } = await client.query(
        `UPDATE sapling_records SET body = body || $3::jsonb WHERE ${jobFilter} AND body->>'status' = 'completed' RETURNING (body->>'attempts')::int AS attempts`,
        [tenant, id, JSON.stringify({ status: 'queued', dueAt: new Date().toISOString() })],
      );
      assert.equal(rows.length, 1);
      return rows[0].attempts;
    });
    for (let attempt = 0; attempt < 24; attempt++) {
      const result = await getJob();
      if (result.status === 'completed') {
        assert.deepEqual(result, original);
        const [record, report] = await scoped(async () =>
          Promise.all([
            client.query(
              `SELECT (body->>'attempts')::int AS attempts FROM sapling_records WHERE ${jobFilter}`,
              [tenant, id],
            ),
            client.query(
              "SELECT id FROM sapling_records WHERE tenant_id = $1 AND collection = 'starter-reports' AND id = $2",
              [tenant, id],
            ),
          ]),
        );
        assert.equal(record.rows[0].attempts, attempts + 1);
        assert.equal(report.rowCount, 1);
        return;
      }
      await setTimeout(500);
    }
    throw new Error('The worker did not retry the requeued report.');
  } finally {
    await client.end();
  }
}
