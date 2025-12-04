#!/bin/bash

# Script de Deploy Corrigido para VPS
# Finapp Dashboard - www.ifin.app.br

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Carregar configurações
if [ -f ".deploy-config" ]; then
    source .deploy-config
else
    # Valores padrão
    VPS_USER="root"
    VPS_HOST="147.93.183.55"
    VPS_PORT="22"
    VPS_PATH="/var/www/finapp"
    APP_DOMAIN="www.ifin.app.br"
fi

# Verificações pré-deploy
print_step "1/8 - Verificando pré-requisitos..."

if [ ! -f ".env.production" ]; then
    print_error "Arquivo .env.production não encontrado!"
    echo "Crie o arquivo .env.production com as variáveis necessárias."
    exit 1
fi

# Verificar se variáveis estão preenchidas
if grep -q "your-project.supabase.co" .env.production || grep -q "your-anon-key-here" .env.production; then
    print_error "Arquivo .env.production contém valores placeholder!"
    echo "Edite .env.production com valores reais antes de fazer deploy."
    exit 1
fi

# Limpar build anterior
print_step "2/8 - Limpando build anterior..."
rm -rf dist/
print_success "Build anterior removido"

# Build local
print_step "3/8 - Executando build local..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Build falhou! Diretório dist não foi criado."
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    print_error "Build falhou! index.html não foi criado."
    exit 1
fi

print_success "Build concluído com sucesso!"

# Verificar tamanho do build
BUILD_SIZE=$(du -sh dist | cut -f1)
echo "Tamanho do build: $BUILD_SIZE"

# Criar backup no VPS
print_step "4/8 - Criando backup da versão anterior no VPS..."

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    if [ -d "$VPS_PATH/current" ]; then
        timestamp=\$(date +%Y%m%d_%H%M%S)
        backup_dir="$VPS_PATH/backup_\$timestamp"
        echo "Criando backup em: \$backup_dir"
        cp -r $VPS_PATH/current \$backup_dir
        echo "Backup criado com sucesso!"
    else
        echo "Nenhuma versão anterior encontrada para backup."
        mkdir -p $VPS_PATH/current
    fi
EOF

print_success "Backup criado!"

# Upload dos arquivos
print_step "5/8 - Enviando arquivos para o VPS..."

# Criar arquivo de exclusões para rsync
cat > /tmp/rsync-exclude.txt << EOF
node_modules
.git
.env.local
.env
*.log
.DS_Store
var/
scripts/
*.md
EOF

# Upload do dist
rsync -avz --delete \
    --exclude-from=/tmp/rsync-exclude.txt \
    -e "ssh -p $VPS_PORT" \
    ./dist/ \
    $VPS_USER@$VPS_HOST:$VPS_PATH/current/

# Upload do .env.production como .env
scp -P $VPS_PORT .env.production $VPS_USER@$VPS_HOST:$VPS_PATH/current/.env

# Limpar arquivo temporário
rm /tmp/rsync-exclude.txt

print_success "Arquivos enviados!"

# Ajustar permissões
print_step "6/8 - Ajustando permissões..."

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    sudo chown -R www-data:www-data $VPS_PATH/current
    sudo chmod -R 755 $VPS_PATH/current
    echo "Permissões ajustadas!"
EOF

print_success "Permissões ajustadas!"

# Verificar arquivos no VPS
print_step "7/8 - Verificando arquivos no VPS..."

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    if [ -f "$VPS_PATH/current/index.html" ]; then
        echo "✅ index.html encontrado"
    else
        echo "❌ index.html NÃO encontrado!"
        exit 1
    fi
    
    if [ -d "$VPS_PATH/current/assets" ]; then
        echo "✅ assets/ encontrado"
        echo "   Arquivos em assets: \$(ls -1 $VPS_PATH/current/assets | wc -l)"
    else
        echo "❌ assets/ NÃO encontrado!"
        exit 1
    fi
    
    if [ -f "$VPS_PATH/current/.env" ]; then
        echo "✅ .env encontrado"
    else
        echo "⚠️  .env NÃO encontrado (pode ser normal se variáveis estão no build)"
    fi
EOF

# Reiniciar NGINX
print_step "8/8 - Reiniciando NGINX..."

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    # Testar configuração antes de reiniciar
    if sudo nginx -t; then
        echo "✅ Configuração NGINX válida"
        sudo systemctl restart nginx
        echo "✅ NGINX reiniciado"
    else
        echo "❌ Erro na configuração NGINX!"
        exit 1
    fi
EOF

print_success "NGINX reiniciado!"

# Verificação final
echo ""
print_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "🚀 DEPLOY CONCLUÍDO COM SUCESSO!"
print_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}📍 Aplicação disponível em:${NC}"
echo -e "   • https://$APP_DOMAIN"
echo ""
echo -e "${YELLOW}📝 Verificações recomendadas:${NC}"
echo -e "   1. Acesse https://$APP_DOMAIN no navegador"
echo -e "   2. Abra o console (F12) e verifique se há erros"
echo -e "   3. Verifique se a aplicação carrega corretamente"
echo ""
echo -e "${GREEN}📊 Comandos úteis:${NC}"
echo -e "   • Logs NGINX: ssh $VPS_USER@$VPS_HOST 'sudo tail -f /var/log/nginx/error.log'"
echo -e "   • Status NGINX: ssh $VPS_USER@$VPS_HOST 'sudo systemctl status nginx'"
echo -e "   • Ver arquivos: ssh $VPS_USER@$VPS_HOST 'ls -la $VPS_PATH/current'"
echo ""

