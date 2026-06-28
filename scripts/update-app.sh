#!/usr/bin/env bash
set -euo pipefail

cd /var/www/jebil

git pull origin main
cd backend
npm ci --omit=dev
npm run db:migrate
cd ../frontend
npm ci
npm run build
cd ..
pm2 reload ecosystem.config.cjs --update-env
