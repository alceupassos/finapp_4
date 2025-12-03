#!/usr/bin/env bash
set -euo pipefail
REPO="${REPO:?}"
KEY_FILE="${KEY_FILE:-$HOME/.ssh/finapp_deploy}"
DEPLOY_HOST="${DEPLOY_HOST:?}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:?}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI não encontrado"
  exit 1
fi

gh secret set SSH_PRIVATE_KEY --repo "$REPO" < "$KEY_FILE"
printf "%s" "$DEPLOY_HOST" | gh secret set DEPLOY_HOST --repo "$REPO"
printf "%s" "$DEPLOY_USER" | gh secret set DEPLOY_USER --repo "$REPO"
printf "%s" "$DEPLOY_PATH" | gh secret set DEPLOY_PATH --repo "$REPO"
echo "Segredos configurados para $REPO"