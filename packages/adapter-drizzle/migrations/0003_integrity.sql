BEGIN;
ALTER TABLE sapling_records DROP CONSTRAINT IF EXISTS sapling_body_object;
ALTER TABLE sapling_records ADD CONSTRAINT sapling_body_object CHECK (jsonb_typeof(body) = 'object' AND body ? 'id' AND jsonb_typeof(body->'id') = 'string' AND body->>'id'=id) NOT VALID;
ALTER TABLE sapling_records VALIDATE CONSTRAINT sapling_body_object;
CREATE INDEX IF NOT EXISTS sapling_job_lease_idx ON sapling_records (tenant_id, (body->>'leaseUntil')) WHERE collection='durable-jobs' AND body->>'status'='running';
COMMIT;
