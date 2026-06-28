#!/usr/bin/env bash
set -euo pipefail

cd /var/www/jebil/backend
npm run db:seed
