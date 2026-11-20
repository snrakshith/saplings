#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${BACKUP_DATABASE_URL:?trusted backup DB URL required}"
: "${BACKUP_DIR:?separate encrypted backup volume required}"
mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/sapling-$(date -u +%Y%m%dT%H%M%SZ).dump"
trap 'rm -f "$file.partial"' EXIT
pg_dump --dbname="$BACKUP_DATABASE_URL" --format=custom --no-owner --no-acl --file="$file.partial"
pg_restore --list "$file.partial" >/dev/null
mv "$file.partial" "$file"
sha256sum "$file" > "$file.sha256"
printf 'Backup archive created and catalog readable; restore drill still required.\n'
