BEGIN;
ALTER TABLE sapling_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sapling_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sapling_tenant_scope ON sapling_records;
CREATE POLICY sapling_tenant_scope ON sapling_records USING (tenant_id = current_setting('sapling.tenant_id', true)) WITH CHECK (tenant_id = current_setting('sapling.tenant_id', true));
CREATE OR REPLACE FUNCTION sapling_guard_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.collection = 'audit' THEN RAISE EXCEPTION 'audit is append-only'; END IF;
 IF TG_OP = 'UPDATE' AND NEW.collection = 'audit' THEN RAISE EXCEPTION 'cannot convert into audit'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sapling_audit_immutable ON sapling_records;
CREATE TRIGGER sapling_audit_immutable BEFORE UPDATE OR DELETE ON sapling_records FOR EACH ROW EXECUTE FUNCTION sapling_guard_audit();
CREATE INDEX IF NOT EXISTS sapling_job_due_idx ON sapling_records (tenant_id, (body->>'status'), (body->>'dueAt')) WHERE collection='durable-jobs';
CREATE INDEX IF NOT EXISTS sapling_record_updated_idx ON sapling_records (tenant_id,collection,updated_at);
COMMIT;
