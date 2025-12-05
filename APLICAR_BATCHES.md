# 📋 Guia para Aplicar Batches SQL ao Supabase

## ✅ Status Atual

- **28 batches SQL preparados** (14 DRE + 14 DFC)
- **136 chunks criados** em `batch_chunks/` (divididos em lotes de ~100 registros)
- **Função RPC `exec_sql` criada** no Supabase (aguardando atualização de cache)

## 🚀 Opções para Aplicar

### Opção 1: Aplicar Batches Completos via MCP (Recomendado)

Os arquivos originais estão prontos em:
- `import_dre_batch_1.sql` até `import_dre_batch_14.sql`
- `import_dfc_batch_1.sql` até `import_dfc_batch_14.sql`

**Como aplicar:**
1. Use `mcp_supabase_execute_sql` com o conteúdo completo de cada arquivo
2. Cada arquivo tem ~100KB e ~500 registros
3. O Supabase deve conseguir processar esses arquivos diretamente

### Opção 2: Aplicar Chunks Individuais

Os chunks estão em `batch_chunks/` divididos por batch:
- Cada batch foi dividido em ~5 chunks de ~100 registros
- Total: 136 chunks

**Como aplicar:**
1. Use `mcp_supabase_execute_sql` com o conteúdo de cada chunk
2. Aplicar em ordem (chunk_1.sql, chunk_2.sql, etc.)

### Opção 3: Via Supabase Dashboard

1. Acesse o SQL Editor no Supabase Dashboard
2. Cole o conteúdo de cada arquivo SQL
3. Execute

## 📊 Estrutura dos Arquivos

### Batches DRE
- Tabela: `dre_entries`
- Colunas: `company_cnpj`, `date`, `account`, `natureza`, `valor`, `description`, `source_erp`, `source_id`
- ON CONFLICT: `(company_cnpj, date, account, natureza)`

### Batches DFC
- Tabela: `dfc_entries`
- Colunas: `company_cnpj`, `date`, `kind`, `category`, `amount`, `bank_account`, `description`, `source_erp`, `source_id`
- ON CONFLICT: `(company_cnpj, date, kind, category, bank_account)`

## ⚠️ Notas Importantes

1. **Cache do PostgREST**: A função RPC `exec_sql` foi criada, mas o cache pode levar alguns minutos para atualizar
2. **Ordem de Aplicação**: Aplicar batches DRE primeiro, depois DFC
3. **Validação**: Após aplicar, verificar contagens:
   ```sql
   SELECT COUNT(*) FROM dre_entries;
   SELECT COUNT(*) FROM dfc_entries;
   ```

## 📝 Scripts Criados

- `scripts/apply_batches_chunked.mjs` - Divide batches em chunks
- `scripts/apply_all_chunks.mjs` - Aplica chunks via RPC (requer cache atualizado)
- `scripts/apply_batches_via_client.mjs` - Tenta aplicar via Supabase client
- `scripts/apply_all_batches_auto.mjs` - Tenta aplicar via RPC

## 🎯 Próximos Passos

1. Aplicar batches completos via `mcp_supabase_execute_sql`
2. Validar importação verificando contagens
3. Testar queries no dashboard

