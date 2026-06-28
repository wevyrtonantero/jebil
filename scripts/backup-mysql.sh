#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/jebil"

mkdir -p "$BACKUP_DIR"

mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  -h "${DB_HOST}" \
  -P "${DB_PORT}" \
  -u "${DB_USER}" \
  -p"${DB_PASSWORD}" \
  "${DB_NAME}" > "${BACKUP_DIR}/jebil-${TIMESTAMP}.sql"
