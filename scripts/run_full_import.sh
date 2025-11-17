#!/bin/bash

echo "🚀 IMPORTAÇÃO COMPLETA - GRUPO VOLPE"
echo "===================================="
echo ""

# Verificar se .env.local existe
if [ ! -f .env.local ]; then
  echo "❌ Arquivo .env.local não encontrado"
  echo "   Crie o arquivo com as variáveis:"
  echo "   VITE_SUPABASE_URL=..."
  echo "   SUPABASE_SERVICE_ROLE_KEY=..."
  exit 1
fi

echo "📋 Fase 1: Importar Empresas do Grupo"
echo "--------------------------------------"
node scripts/import_group_companies.mjs
if [ $? -ne 0 ]; then
  echo "❌ Erro ao importar empresas"
  exit 1
fi
echo ""

echo "📚 Fase 2: Importar Plano de Contas"
echo "--------------------------------------"
node scripts/import_chart_of_accounts.mjs
if [ $? -ne 0 ]; then
  echo "❌ Erro ao importar plano de contas"
  exit 1
fi
echo ""

echo "💳 Fase 3: Importar Transações de Todas Empresas"
echo "--------------------------------------"
node scripts/import_all_transactions.mjs
if [ $? -ne 0 ]; then
  echo "❌ Erro ao importar transações"
  exit 1
fi
echo ""

echo "📊 Fase 4: Importar DRE e DFC Consolidados (Matriz)"
echo "--------------------------------------"
node scripts/import_consolidated_reports.mjs
if [ $? -ne 0 ]; then
  echo "❌ Erro ao importar relatórios consolidados"
  exit 1
fi
echo ""

echo "✅ Fase 5: Validação"
echo "--------------------------------------"
node scripts/validate_import.mjs
echo ""

echo "🎉 IMPORTAÇÃO COMPLETA!"
echo "======================"
