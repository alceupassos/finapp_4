#!/bin/bash
# Script para aplicar um batch SQL via MCP Supabase
# Uso: ./apply_batch_via_mcp.sh import_dre_batch_1.sql

BATCH_FILE=$1
if [ -z "$BATCH_FILE" ]; then
  echo "❌ Erro: Especifique o arquivo batch"
  echo "Uso: $0 <arquivo_batch.sql>"
  exit 1
fi

if [ ! -f "$BATCH_FILE" ]; then
  echo "❌ Erro: Arquivo $BATCH_FILE não encontrado"
  exit 1
fi

echo "📥 Aplicando $BATCH_FILE..."
echo "📊 Tamanho: $(wc -c < "$BATCH_FILE" | xargs) bytes"
echo "📝 Linhas: $(wc -l < "$BATCH_FILE" | xargs)"

# O conteúdo será lido e aplicado via mcp_supabase_execute_sql
cat "$BATCH_FILE"

