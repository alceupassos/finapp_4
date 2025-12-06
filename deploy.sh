#!/bin/bash

# Script de Deploy para VPS
# Finapp Dashboard v0.2.0

set -e  # Sair em caso de erro

# ========================================
# CONFIGURAÇÕES DO VPS
# ========================================
# Edite estas variáveis com os dados do seu VPS
VPS_USER="root"                          # Usuário SSH
VPS_HOST="147.93.183.55"                 # IP ou domínio do VPS
VPS_PORT="22"                             # Porta SSH (padrão: 22)
VPS_PATH="/var/www/finapp"                # Caminho no VPS onde ficará o app
NGINX_CONF="/etc/nginx/sites-available/finapp"  # Arquivo de config do Nginx
APP_DOMAIN="www.ifin.app.br"              # Domínio

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
# CONFIGURAR NGINX (SEGURAMENTE)
# ========================================
print_step "5/7 - Configurando Nginx (modo seguro)..."

# Verificar se configuração já existe
CONFIG_EXISTS=$(ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "test -f $NGINX_CONF && echo 'yes' || echo 'no'")

if [ "$CONFIG_EXISTS" = "yes" ]; then
    print_warning "Configuração Nginx já existe. Criando backup..."
    ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "sudo cp $NGINX_CONF ${NGINX_CONF}.backup.\$(date +%Y%m%d_%H%M%S)"
fi

# Criar configuração do Nginx com SSL
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << ENDSSH
cat > /tmp/finapp-nginx.conf << 'EOF'
# Configuração para www.ifin.app.br
# Gerado automaticamente pelo deploy.sh

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name www.ifin.app.br ifin.app.br;
    
    # Redirecionar para HTTPS
    return 301 https://\$host\$request_uri;
}

# Configuração HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.ifin.app.br ifin.app.br;

    # Certificados SSL (usando certificado existente do www.ifin.app.br)
    ssl_certificate /etc/letsencrypt/live/www.ifin.app.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.ifin.app.br/privkey.pem;
    
    # SSL Configuration (recomendado)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

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
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - sempre retornar index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Logs
    access_log /var/log/nginx/finapp-access.log;
    error_log /var/log/nginx/finapp-error.log;
}
EOF

# Substituir placeholders
sed -i "s|VPS_PATH|$VPS_PATH|g" /tmp/finapp-nginx.conf

# Mover para sites-available
sudo mv /tmp/finapp-nginx.conf $NGINX_CONF

# Criar symlink em sites-enabled (se não existir)
if [ ! -L /etc/nginx/sites-enabled/finapp ]; then
    sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/finapp
fi

# Testar configuração ANTES de reiniciar
echo "Testando configuração Nginx..."
if sudo nginx -t; then
    echo "✅ Configuração válida!"
else
    echo "❌ ERRO na configuração! Restaurando backup..."
    if [ -f ${NGINX_CONF}.backup.* ]; then
        sudo cp ${NGINX_CONF}.backup.* $NGINX_CONF
        echo "Backup restaurado."
    fi
    exit 1
fi

ENDSSH

if [ $? -eq 0 ]; then
    print_success "Nginx configurado e testado!"
else
    print_error "Erro ao configurar Nginx. Abortando deploy."
    exit 1
fi

# ========================================
# REINICIAR NGINX (COM CUIDADO)
# ========================================
print_step "6/7 - Reiniciando Nginx (modo seguro)..."

print_warning "Reiniciando Nginx com reload (não interrompe conexões ativas)..."

# Usar reload em vez de restart para não interromper conexões
RELOAD_SUCCESS=$(ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'ENDSSH'
    # Verificar se Nginx está rodando
    if sudo systemctl is-active --quiet nginx; then
        echo "Nginx está rodando. Fazendo reload seguro..."
        if sudo systemctl reload nginx; then
            echo "SUCCESS"
        else
            echo "FAILED"
        fi
    else
        echo "Nginx não está rodando. Iniciando..."
        if sudo systemctl start nginx; then
            echo "SUCCESS"
        else
            echo "FAILED"
        fi
    fi
ENDSSH
)

if echo "$RELOAD_SUCCESS" | grep -q "SUCCESS"; then
    print_success "Nginx reiniciado com sucesso (reload seguro)!"
else
    print_error "Erro ao reiniciar Nginx!"
    print_warning "Verificando status do Nginx..."
    ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "sudo systemctl status nginx --no-pager -l"
    exit 1
fi

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
