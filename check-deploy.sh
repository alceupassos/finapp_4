#!/bin/bash

# Script de verificação pré-deploy
# Verifica se tudo está pronto para fazer deploy

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔍 Verificação Pré-Deploy                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

errors=0
warnings=0

# Verificar Node.js
echo -n "🔍 Verificando Node.js... "
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo -e "${GREEN}✅ $node_version${NC}"
else
    echo -e "${RED}❌ Node.js não encontrado!${NC}"
    errors=$((errors + 1))
fi

# Verificar npm
echo -n "🔍 Verificando npm... "
if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    echo -e "${GREEN}✅ v$npm_version${NC}"
else
    echo -e "${RED}❌ npm não encontrado!${NC}"
    errors=$((errors + 1))
fi

# Verificar dependências instaladas
echo -n "🔍 Verificando node_modules... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Instalado${NC}"
else
    echo -e "${YELLOW}⚠️  Não encontrado. Execute: npm install${NC}"
    warnings=$((warnings + 1))
fi

# Verificar .env.production
echo -n "🔍 Verificando .env.production... "
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✅ Encontrado${NC}"
    
    # Verificar se tem as variáveis necessárias
    if grep -q "VITE_SUPABASE_URL" .env.production && grep -q "VITE_SUPABASE_ANON_KEY" .env.production; then
        echo "   ✅ Variáveis Supabase configuradas"
    else
        echo -e "   ${YELLOW}⚠️  Variáveis Supabase não encontradas${NC}"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${RED}❌ Não encontrado!${NC}"
    errors=$((errors + 1))
fi

# Verificar build
echo -n "🔍 Testando build... "
if npm run build > /tmp/build-test.log 2>&1; then
    echo -e "${GREEN}✅ Build OK${NC}"
    if [ -d "dist" ]; then
        dist_size=$(du -sh dist | cut -f1)
        echo "   📦 Tamanho: $dist_size"
    fi
else
    echo -e "${RED}❌ Build falhou!${NC}"
    echo "   Ver log: /tmp/build-test.log"
    errors=$((errors + 1))
fi

# Verificar Git
echo -n "🔍 Verificando Git... "
if command -v git &> /dev/null; then
    branch=$(git branch --show-current)
    echo -e "${GREEN}✅ Branch: $branch${NC}"
    
    # Verificar alterações não commitadas
    if [[ -n $(git status -s) ]]; then
        echo -e "   ${YELLOW}⚠️  Há alterações não commitadas${NC}"
        warnings=$((warnings + 1))
    else
        echo "   ✅ Working tree limpo"
    fi
else
    echo -e "${YELLOW}⚠️  Git não encontrado${NC}"
    warnings=$((warnings + 1))
fi

# Verificar SSH (se .deploy-config existe)
if [ -f ".deploy-config" ]; then
    source .deploy-config
    echo ""
    echo -e "${BLUE}🔐 Testando conexão VPS...${NC}"
    echo "   VPS: $VPS_USER@$VPS_HOST:$VPS_PORT"
    
    if ssh -p $VPS_PORT -o ConnectTimeout=5 -o BatchMode=yes $VPS_USER@$VPS_HOST exit 2>/dev/null; then
        echo -e "   ${GREEN}✅ Conexão SSH OK${NC}"
        
        # Verificar Nginx no VPS
        if ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "which nginx" &>/dev/null; then
            echo "   ✅ Nginx instalado no VPS"
        else
            echo -e "   ${YELLOW}⚠️  Nginx não encontrado no VPS${NC}"
            warnings=$((warnings + 1))
        fi
    else
        echo -e "   ${RED}❌ Não foi possível conectar ao VPS${NC}"
        errors=$((errors + 1))
    fi
else
    echo ""
    echo -e "${YELLOW}⚠️  Arquivo .deploy-config não encontrado${NC}"
    echo "   Execute deploy-setup.sh primeiro"
    warnings=$((warnings + 1))
fi

# Resumo
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📊 Resumo da Verificação                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ Tudo OK! Pronto para fazer deploy.${NC}"
    echo ""
    echo -e "${GREEN}Execute:${NC}"
    echo "  ./deploy-setup.sh  (primeira vez)"
    echo "  ./deploy-quick.sh  (deploy rápido)"
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $warnings avisos encontrados${NC}"
    echo "   Você pode continuar, mas verifique os avisos acima."
    exit 0
else
    echo -e "${RED}❌ $errors erros encontrados${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $warnings avisos encontrados${NC}"
    fi
    echo "   Corrija os erros antes de fazer deploy."
    exit 1
fi
