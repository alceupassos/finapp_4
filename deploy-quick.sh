#!/bin/bash

# Script de Deploy Rápido (usa configurações salvas)
# Para primeiro deploy, edite deploy.sh

set -e

# Carregar configurações
if [ -f ".deploy-config" ]; then
    source .deploy-config
else
    echo "❌ Arquivo .deploy-config não encontrado!"
    echo "📝 Execute o deploy.sh primeiro ou crie manualmente."
    exit 1
fi

echo "🚀 Iniciando deploy rápido..."

# Build
echo "📦 Building..."
npm run build

# Upload
echo "📤 Uploading..."
rsync -avz --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude .env.local \
    -e "ssh -p $VPS_PORT" \
    ./dist/ \
    $VPS_USER@$VPS_HOST:$VPS_PATH/current/

# Upload .env
scp -P $VPS_PORT .env.production $VPS_USER@$VPS_HOST:$VPS_PATH/current/.env 2>/dev/null || true

# Fix permissions
echo "🔐 Ajustando permissões..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "sudo chown -R www-data:www-data $VPS_PATH/current && sudo chmod -R 755 $VPS_PATH/current"

# Restart Nginx
echo "🔄 Restarting Nginx..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "sudo systemctl reload nginx"

echo "✅ Deploy concluído!"
echo "🌐 http://$VPS_HOST"
echo "🌐 https://www.ifin.app.br"
