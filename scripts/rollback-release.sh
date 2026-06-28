#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: ./scripts/rollback-release.sh <git-ref>"
  exit 1
fi

TARGET_REF="$1"

cd /var/www/jebil
git fetch --all
git checkout "$TARGET_REF"
cd backend
npm ci --omit=dev
cd ../frontend
npm ci
npm run build
cd ..
pm2 reload ecosystem.config.cjs --update-env
