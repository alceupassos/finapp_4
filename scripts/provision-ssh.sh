#!/usr/bin/env bash
set -euo pipefail
KEY_NAME="${KEY_NAME:-finapp_deploy}"
KEY_FILE="${KEY_FILE:-$HOME/.ssh/$KEY_NAME}"
DEPLOY_HOST="${DEPLOY_HOST:?}"
DEPLOY_USER="${DEPLOY_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
if [ ! -f "$KEY_FILE" ]; then
  ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -C "github-deploy"
fi

PUB="$(cat "$KEY_FILE.pub")"
ssh -p "$SSH_PORT" "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && (grep -qxF \"$PUB\" ~/.ssh/authorized_keys || echo \"$PUB\" >> ~/.ssh/authorized_keys) && chmod 600 ~/.ssh/authorized_keys"
ssh -p "$SSH_PORT" -o BatchMode=yes "$DEPLOY_USER@$DEPLOY_HOST" "echo ok"

echo "SSH_PRIVATE_KEY: $KEY_FILE"
echo "DEPLOY_USER: $DEPLOY_USER"
echo "DEPLOY_HOST: $DEPLOY_HOST"
echo "Defina DEPLOY_PATH conforme seu Nginx root"