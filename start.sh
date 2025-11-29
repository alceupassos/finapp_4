#!/bin/bash

# Script de inicialização finapp_v4
# Porta fixa: 5173

set -e

PORT=5173
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Iniciando finapp_v4..."
echo "📁 Diretório: $PROJECT_DIR"
echo "🔌 Porta: $PORT"

# Matar processos nas portas conflitantes
echo ""
echo "🧹 Limpando portas 3000, 4173, 5173..."
lsof -ti :3000,:4173,:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
pkill -f "vite preview" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Verificar se porta está livre
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Porta $PORT ainda em uso, tentando liberar..."
    lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Navegar para diretório do projeto
cd "$PROJECT_DIR"

# ✅ FIX: Garantir que .env.local tenha as variáveis Supabase
if [ ! -f ".env.local" ] || [ ! -s ".env.local" ] || ! grep -q "VITE_SUPABASE_URL" .env.local; then
    echo "🔧 Sincronizando variáveis de ambiente..."
    if [ -f ".env.production" ]; then
        cp .env.production .env.local
        echo "✅ .env.local atualizado a partir de .env.production"
    else
        echo "⚠️  .env.production não encontrado, criando .env.local básico..."
        cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI
EOF
    fi
fi

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Build
echo ""
echo "🔨 Executando build..."
npm run build

# Lint
echo ""
echo "✅ Executando lint..."
npm run lint || echo "⚠️  Lint com avisos (continuando...)"

# Iniciar servidor dev na porta fixa
echo ""
echo "🌐 Iniciando servidor na porta $PORT..."
echo "📍 Acesse: http://localhost:$PORT"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

# Abrir navegador após 2 segundos
(sleep 2 && open "http://localhost:$PORT" 2>/dev/null || true) &

# Iniciar servidor
npm run dev -- --port $PORT --host

