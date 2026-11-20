#!/usr/bin/env bash
set -euo pipefail
: "${RESTORE_DATABASE_URL:?disposable restore DB URL required}"
: "${BACKUP_FILE:?backup path required}"
[[ "${SAPLING_DISPOSABLE_RESTORE_CONFIRM:-}" == 'yes' ]] || { echo 'Refusing restore without disposable confirmation'; exit 1; }
[[ "${RESTORE_DATABASE_URL}" != "${BACKUP_DATABASE_URL:-}" ]] || { echo 'Restore target must differ'; exit 1; }
sha256sum -c "$BACKUP_FILE.sha256"
# Do not use --clean. Existing objects cause failure, not destruction.
pg_restore --dbname="$RESTORE_DATABASE_URL" --exit-on-error --single-transaction --no-owner --no-acl "$BACKUP_FILE"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM sapling_records;'
echo 'Logical DB restore executed; verify application invariants, object storage, RPO/RTO and roles before signoff.'
