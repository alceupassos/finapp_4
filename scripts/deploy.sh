#!/usr/bin/env bash
set -e

if [ -f .env.production ]; then
  :
elif [ -f .env.local ]; then
  cp .env.local .env.production
fi

npm run build

if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ] || [ -z "$DEPLOY_PATH" ]; then
  echo "Missing DEPLOY_HOST/DEPLOY_USER/DEPLOY_PATH" >&2
  exit 1
fi

rsync -az --delete dist/ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo systemctl reload nginx || sudo nginx -s reload"
