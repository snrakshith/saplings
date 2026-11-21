-- Miner partitions use the tenant's existing RLS policy. Timestamp scans use a bounded index range.
CREATE INDEX IF NOT EXISTS sapling_records_miner_time_idx
  ON sapling_records (tenant_id, collection, ((body->>'time')::bigint), id)
  WHERE collection LIKE 'miner:events:%' AND jsonb_typeof(body->'time') = 'number';
