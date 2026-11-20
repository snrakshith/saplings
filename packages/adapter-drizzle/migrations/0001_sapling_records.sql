CREATE TABLE IF NOT EXISTS sapling_records (
 tenant_id TEXT NOT NULL,
 collection TEXT NOT NULL,
 id TEXT NOT NULL,
 body JSONB NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id, collection, id)
);
CREATE INDEX IF NOT EXISTS sapling_records_tenant_collection_idx
 ON sapling_records (tenant_id, collection, updated_at DESC);
