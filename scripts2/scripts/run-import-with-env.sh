#!/bin/bash
# Script wrapper para importação com variáveis de ambiente do supa.txt

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUPA_FILE="$PROJECT_ROOT/supabase/supa.txt"

# Extrair variáveis do supa.txt
if [ -f "$SUPA_FILE" ]; then
  SUPABASE_URL=$(grep "^URL=" "$SUPA_FILE" | cut -d'=' -f2)
  SUPABASE_ANON_KEY=$(grep "^anon public=" "$SUPA_FILE" | cut -d'=' -f2-)
  SUPABASE_SERVICE_ROLE_KEY=$(grep "^service_role=" "$SUPA_FILE" | cut -d'=' -f2-)
  
  export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
  export SUPABASE_URL="$SUPABASE_URL"
  
  echo "✅ Variáveis de ambiente carregadas de supabase/supa.txt"
  echo "   URL: $SUPABASE_URL"
  echo ""
else
  echo "❌ Arquivo supabase/supa.txt não encontrado!"
  exit 1
fi

# Executar o script de importação
cd "$PROJECT_ROOT"
exec npm run import:all "$@"

