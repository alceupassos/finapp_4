#!/bin/bash

# Script de Deploy para VPS
# Finapp Dashboard v0.2.0

set -e  # Sair em caso de erro

# ========================================
# CONFIGURAÇÕES DO VPS
# ========================================
# Edite estas variáveis com os dados do seu VPS
VPS_USER="root"                          # Usuário SSH
VPS_HOST="SEU_IP_OU_DOMINIO"             # IP ou domínio do VPS
VPS_PORT="22"                             # Porta SSH (padrão: 22)
VPS_PATH="/var/www/finapp"                # Caminho no VPS onde ficará o app
NGINX_CONF="/etc/nginx/sites-available/finapp"  # Arquivo de config do Nginx
APP_DOMAIN="finapp.seudominio.com"        # Domínio (opcional)

# ========================================
# CORES PARA OUTPUT
# ========================================
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ========================================
# FUNÇÕES
# ========================================
print_step() {
    echo -e "${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# ========================================
# VERIFICAÇÕES PRÉ-DEPLOY
# ========================================
print_step "1/7 - Verificando pré-requisitos..."

# Verificar se git está limpo
if [[ -n $(git status -s) ]]; then
    print_warning "Há alterações não commitadas. Deseja continuar? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_error "Deploy cancelado."
        exit 1
    fi
fi

# Verificar se .env.production existe
if [ ! -f ".env.production" ]; then
    print_error "Arquivo .env.production não encontrado!"
    exit 1
fi

# ========================================
# BUILD LOCAL
# ========================================
print_step "2/7 - Executando build local..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Build falhou! Diretório dist não foi criado."
    exit 1
fi

print_success "Build concluído com sucesso!"

# ========================================
# CRIAR ESTRUTURA NO VPS
# ========================================
print_step "3/7 - Criando estrutura de diretórios no VPS..."

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    # Criar diretório da aplicação
    mkdir -p $VPS_PATH
    
    # Criar backup se já existir
    if [ -d "$VPS_PATH/current" ]; then
        echo "Criando backup da versão anterior..."
        timestamp=\$(date +%Y%m%d_%H%M%S)
        mv $VPS_PATH/current $VPS_PATH/backup_\$timestamp
    fi
    
    # Criar diretório para nova versão
    mkdir -p $VPS_PATH/current
    
    echo "Diretórios criados com sucesso!"
EOF

print_success "Estrutura criada no VPS!"

# ========================================
# UPLOAD DOS ARQUIVOS
# ========================================
print_step "4/7 - Enviando arquivos para o VPS..."

# Criar arquivo temporário com lista de exclusões
cat > /tmp/rsync-exclude.txt << EOF
node_modules
.git
.env.local
.env
*.log
.DS_Store
var/
scripts/
EOF

# Rsync dos arquivos
rsync -avz --delete \
    --exclude-from=/tmp/rsync-exclude.txt \
    -e "ssh -p $VPS_PORT" \
    ./dist/ \
    $VPS_USER@$VPS_HOST:$VPS_PATH/current/

# Upload do .env.production como .env
scp -P $VPS_PORT .env.production $VPS_USER@$VPS_HOST:$VPS_PATH/current/.env

# Limpar arquivo temporário
rm /tmp/rsync-exclude.txt

print_success "Arquivos enviados com sucesso!"

# ========================================
# CONFIGURAR NGINX
# ========================================
print_step "5/7 - Configurando Nginx..."

# Criar configuração do Nginx
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'ENDSSH'
cat > /tmp/finapp-nginx.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name APP_DOMAIN;

    root VPS_PATH/current;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - sempre retornar index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API (se necessário)
    # location /api {
    #     proxy_pass http://localhost:3000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection 'upgrade';
    #     proxy_set_header Host $host;
    #     proxy_cache_bypass $http_upgrade;
    # }

    # Logs
    access_log /var/log/nginx/finapp-access.log;
    error_log /var/log/nginx/finapp-error.log;
}
EOF

# Substituir placeholders
sed -i "s|APP_DOMAIN|$APP_DOMAIN|g" /tmp/finapp-nginx.conf
sed -i "s|VPS_PATH|$VPS_PATH|g" /tmp/finapp-nginx.conf

# Mover para sites-available
sudo mv /tmp/finapp-nginx.conf $NGINX_CONF

# Criar symlink em sites-enabled
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/finapp

# Testar configuração
sudo nginx -t

ENDSSH

print_success "Nginx configurado!"

# ========================================
# REINICIAR NGINX
# ========================================
print_step "6/7 - Reiniciando Nginx..."

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    sudo systemctl reload nginx
    echo "Nginx reiniciado!"
EOF

print_success "Nginx reiniciado com sucesso!"

# ========================================
# VERIFICAÇÃO FINAL
# ========================================
print_step "7/7 - Verificando deploy..."

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    # Verificar se arquivos existem
    if [ -f "$VPS_PATH/current/index.html" ]; then
        echo "✅ index.html encontrado"
    else
        echo "❌ index.html NÃO encontrado!"
        exit 1
    fi
    
    # Verificar Nginx
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx está rodando"
    else
        echo "❌ Nginx NÃO está rodando!"
        exit 1
    fi
    
    # Verificar permissões
    sudo chown -R www-data:www-data $VPS_PATH/current
    sudo chmod -R 755 $VPS_PATH/current
    
    echo "✅ Permissões ajustadas"
EOF

# ========================================
# FINALIZAÇÃO
# ========================================
echo ""
print_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "🚀 DEPLOY CONCLUÍDO COM SUCESSO!"
print_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}📍 Aplicação disponível em:${NC}"
echo -e "   • http://$VPS_HOST"
if [ "$APP_DOMAIN" != "finapp.seudominio.com" ]; then
    echo -e "   • http://$APP_DOMAIN"
fi
echo ""
echo -e "${YELLOW}📝 Próximos passos (opcional):${NC}"
echo -e "   1. Configurar SSL/HTTPS com certbot:"
echo -e "      ${BLUE}ssh $VPS_USER@$VPS_HOST 'sudo certbot --nginx -d $APP_DOMAIN'${NC}"
echo -e "   2. Configurar renovação automática do SSL"
echo -e "   3. Configurar backup automático"
echo ""
echo -e "${GREEN}📊 Logs do Nginx:${NC}"
echo -e "   • Access: ssh $VPS_USER@$VPS_HOST 'sudo tail -f /var/log/nginx/finapp-access.log'"
echo -e "   • Error:  ssh $VPS_USER@$VPS_HOST 'sudo tail -f /var/log/nginx/finapp-error.log'"
echo ""
