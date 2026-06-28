#!/usr/bin/env bash
set -euo pipefail

cd /var/www/jebil/backend
npm ci --omit=dev
npm run db:migrate
