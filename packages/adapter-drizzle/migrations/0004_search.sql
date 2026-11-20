-- Search only these explicitly public/searchable fields. Never index secrets or the entire JSON document.
CREATE INDEX IF NOT EXISTS sapling_records_public_search_idx ON sapling_records USING GIN (
  to_tsvector('simple'::regconfig, coalesce(body->>'name','') || ' ' || coalesce(body->>'title','') || ' ' || coalesce(body->>'description',''))
) WHERE NOT (body ? 'deletedAt');
