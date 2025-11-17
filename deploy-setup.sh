#!/bin/bash

# Script para preparar e executar deploy no VPS
# Este script interativo ajuda na primeira configuração

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║     🚀 Deploy Finapp Dashboard para VPS            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se já existe .deploy-config
if [ -f ".deploy-config" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .deploy-config já existe!${NC}"
    echo ""
    cat .deploy-config
    echo ""
    echo -e "${YELLOW}Deseja usar estas configurações? (y/n)${NC}"
    read -r use_existing
    
    if [[ "$use_existing" =~ ^[Yy]$ ]]; then
        source .deploy-config
        echo -e "${GREEN}✅ Usando configurações existentes${NC}"
    else
        rm .deploy-config
    fi
fi

# Coletar informações se não existir
if [ ! -f ".deploy-config" ]; then
    echo -e "${BLUE}📝 Vamos configurar seu VPS${NC}"
    echo ""
    
    echo -n "Usuário SSH (ex: root): "
    read -r vps_user
    
    echo -n "IP ou domínio do VPS (ex: 192.168.1.100): "
    read -r vps_host
    
    echo -n "Porta SSH (padrão 22): "
    read -r vps_port
    vps_port=${vps_port:-22}
    
    echo -n "Caminho no VPS (padrão /var/www/finapp): "
    read -r vps_path
    vps_path=${vps_path:-/var/www/finapp}
    
    echo -n "Domínio da aplicação (opcional, ex: finapp.com): "
    read -r app_domain
    app_domain=${app_domain:-$vps_host}
    
    # Salvar configurações
    cat > .deploy-config << EOF
VPS_USER="$vps_user"
VPS_HOST="$vps_host"
VPS_PORT="$vps_port"
VPS_PATH="$vps_path"
APP_DOMAIN="$app_domain"
EOF
    
    echo -e "${GREEN}✅ Configurações salvas em .deploy-config${NC}"
    
    # Carregar as configs
    source .deploy-config
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Resumo da Configuração                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  VPS:      ${GREEN}$VPS_USER@$VPS_HOST:$VPS_PORT${NC}"
echo -e "  Caminho:  ${GREEN}$VPS_PATH${NC}"
echo -e "  Domínio:  ${GREEN}$APP_DOMAIN${NC}"
echo ""

# Testar conexão SSH
echo -e "${BLUE}🔐 Testando conexão SSH...${NC}"
if ssh -p $VPS_PORT -o ConnectTimeout=5 -o BatchMode=yes $VPS_USER@$VPS_HOST exit 2>/dev/null; then
    echo -e "${GREEN}✅ Conexão SSH OK!${NC}"
else
    echo -e "${RED}❌ Não foi possível conectar via SSH${NC}"
    echo -e "${YELLOW}Verifique:${NC}"
    echo "  1. Suas credenciais estão corretas?"
    echo "  2. O VPS está ligado e acessível?"
    echo "  3. Você tem chave SSH configurada?"
    echo ""
    echo -e "${YELLOW}Para configurar chave SSH:${NC}"
    echo "  ssh-copy-id -p $VPS_PORT $VPS_USER@$VPS_HOST"
    echo ""
    echo -e "${YELLOW}Deseja continuar mesmo assim? (y/n)${NC}"
    read -r continue_anyway
    if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar se Nginx está instalado
echo ""
echo -e "${BLUE}🔍 Verificando Nginx no VPS...${NC}"
if ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "which nginx" &>/dev/null; then
    echo -e "${GREEN}✅ Nginx encontrado${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx não encontrado no VPS${NC}"
    echo -e "${YELLOW}Deseja instalar agora? (y/n)${NC}"
    read -r install_nginx
    
    if [[ "$install_nginx" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}📦 Instalando Nginx...${NC}"
        ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'EOF'
            sudo apt update
            sudo apt install nginx -y
            sudo systemctl start nginx
            sudo systemctl enable nginx
            echo "✅ Nginx instalado e iniciado!"
EOF
        echo -e "${GREEN}✅ Nginx instalado com sucesso!${NC}"
    else
        echo -e "${RED}❌ Nginx é necessário para o deploy. Instalando...${NC}"
        ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'EOF'
            sudo apt update
            sudo apt install nginx -y
            sudo systemctl start nginx
            sudo systemctl enable nginx
EOF
    fi
fi

# Build local
echo ""
echo -e "${BLUE}📦 Fazendo build da aplicação...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build falhou!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build concluído!${NC}"

# Confirmar deploy
echo ""
echo -e "${YELLOW}🚀 Pronto para fazer deploy!${NC}"
echo -e "${YELLOW}Confirma o deploy para $VPS_HOST? (y/n)${NC}"
read -r confirm_deploy

if [[ ! "$confirm_deploy" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deploy cancelado${NC}"
    exit 0
fi

# Executar deploy
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🚀 INICIANDO DEPLOY                                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"

# Criar estrutura no VPS
echo -e "${BLUE}1/5 - Criando estrutura no VPS...${NC}"
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    mkdir -p $VPS_PATH
    
    if [ -d "$VPS_PATH/current" ]; then
        timestamp=\$(date +%Y%m%d_%H%M%S)
        mv $VPS_PATH/current $VPS_PATH/backup_\$timestamp
        echo "✅ Backup criado: backup_\$timestamp"
    fi
    
    mkdir -p $VPS_PATH/current
EOF

# Upload arquivos
echo -e "${BLUE}2/5 - Enviando arquivos...${NC}"
rsync -avz --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude .env.local \
    --exclude '*.log' \
    -e "ssh -p $VPS_PORT" \
    ./dist/ \
    $VPS_USER@$VPS_HOST:$VPS_PATH/current/

# Upload .env
scp -P $VPS_PORT .env.production $VPS_USER@$VPS_HOST:$VPS_PATH/current/.env

# Configurar Nginx
echo -e "${BLUE}3/5 - Configurando Nginx...${NC}"
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    # Criar config do Nginx
    sudo tee /etc/nginx/sites-available/finapp > /dev/null << 'NGINXCONF'
server {
    listen 80;
    listen [::]:80;
    server_name $APP_DOMAIN;

    root $VPS_PATH/current;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    access_log /var/log/nginx/finapp-access.log;
    error_log /var/log/nginx/finapp-error.log;
}
NGINXCONF

    # Ativar site
    sudo ln -sf /etc/nginx/sites-available/finapp /etc/nginx/sites-enabled/finapp
    
    # Testar config
    sudo nginx -t
EOF

# Ajustar permissões
echo -e "${BLUE}4/5 - Ajustando permissões...${NC}"
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    sudo chown -R www-data:www-data $VPS_PATH/current
    sudo chmod -R 755 $VPS_PATH/current
EOF

# Reiniciar Nginx
echo -e "${BLUE}5/5 - Reiniciando Nginx...${NC}"
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
    sudo systemctl reload nginx
EOF

# Verificação final
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ DEPLOY CONCLUÍDO COM SUCESSO!                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 Aplicação disponível em:${NC}"
echo -e "   ${BLUE}http://$VPS_HOST${NC}"
if [ "$APP_DOMAIN" != "$VPS_HOST" ]; then
    echo -e "   ${BLUE}http://$APP_DOMAIN${NC}"
fi
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo ""
echo -e "1️⃣  ${GREEN}Configurar SSL/HTTPS:${NC}"
echo "   ssh $VPS_USER@$VPS_HOST"
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo "   sudo certbot --nginx -d $APP_DOMAIN"
echo ""
echo -e "2️⃣  ${GREEN}Para deploys futuros (rápido):${NC}"
echo "   ./deploy-quick.sh"
echo ""
echo -e "3️⃣  ${GREEN}Ver logs:${NC}"
echo "   ssh $VPS_USER@$VPS_HOST 'sudo tail -f /var/log/nginx/finapp-access.log'"
echo ""
