# Guia para Aplicar Importação F360 Robusta

## Status Atual

✅ **FASE 0**: Correção dos botões de modal DRE - **CONCLUÍDA**
- Modais corrigidos com AnimatePresence e z-index
- Logs de debug adicionados
- Handlers nomeados para melhor rastreamento

✅ **FASE 1**: Script de importação robusta criado
- Arquivo SQL gerado: `import_f360_robust_generated.sql` (2247 linhas)
- Dados de DRE e DFC para empresa 26888098000159 (VOLPE MATRIZ)
- Período: 2024-08 a 2025-02

⚠️ **PENDENTE**: Aplicar SQL no banco de dados

## Arquivos Gerados

1. **`import_f360_robust_generated.sql`** - SQL completo (477KB)
2. **`batch_chunks/import_f360_robust/chunk_*.sql`** - Batches divididos (5 arquivos)

## Como Aplicar o SQL

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo de `import_f360_robust_generated.sql`
4. Execute

### Opção 2: Via MCP Supabase (Em batches)

O arquivo foi dividido em 5 batches:
- `chunk_1.sql` - Cabeçalho (vazio)
- `chunk_2.sql` - DRE entries (primeira parte)
- `chunk_3.sql` - DRE entries (continuação + ON CONFLICT)
- `chunk_4.sql` - DFC entries (primeira parte)
- `chunk_5.sql` - DFC entries (continuação + ON CONFLICT)

Aplicar sequencialmente via `mcp_supabase_execute_sql`:
1. Ler conteúdo de `chunk_2.sql` + `chunk_3.sql`
2. Aplicar via MCP
3. Ler conteúdo de `chunk_4.sql` + `chunk_5.sql`
4. Aplicar via MCP

### Opção 3: Via Script Node.js

```bash
# Criar script que lê arquivo e aplica via Supabase REST API
node scripts/apply_sql_via_mcp.mjs import_f360_robust_generated.sql
```

**Nota**: O script atual precisa ser ajustado para usar a API REST do Supabase corretamente.

## Estrutura do SQL

### DRE Entries
```sql
INSERT INTO dre_entries (company_cnpj, date, account, natureza, valor, description, source_erp, source_id)
VALUES
  (...)
ON CONFLICT (company_cnpj, date, account, natureza) DO UPDATE SET valor = EXCLUDED.valor;
```

### DFC Entries
```sql
INSERT INTO dfc_entries (company_cnpj, date, kind, category, amount, bank_account, description, source_erp, source_id)
VALUES
  (...)
ON CONFLICT (company_cnpj, date, kind, category, COALESCE(bank_account, '')) DO UPDATE SET amount = EXCLUDED.amount;
```

## Validação Pós-Importação

Após aplicar o SQL, executar:

```sql
-- Verificar contagem
SELECT natureza, COUNT(*), SUM(valor) 
FROM dre_entries 
WHERE company_cnpj = '26888098000159'
GROUP BY natureza;

SELECT kind, COUNT(*), SUM(amount) 
FROM dfc_entries 
WHERE company_cnpj = '26888098000159'
GROUP BY kind;
```

## Próximos Passos

1. ✅ Aplicar SQL no banco
2. ✅ Validar dados importados
3. ✅ Testar frontend (DRE e DFC sections)
4. ✅ Verificar se modais abrem corretamente
5. ✅ Importar dados das outras 12 empresas Volpe

## Problemas Conhecidos

1. **Classificação incorreta**: Alguns registros "102-1 - Vendas de Produtos" estão classificados como `despesa` quando deveriam ser `receita`
   - **Solução**: Corrigir no script de importação ou via SQL UPDATE após importação

2. **Dados incompletos**: Apenas empresa MATRIZ importada
   - **Solução**: Executar script para outras 12 empresas

3. **Período limitado**: Dados apenas de agosto 2024 a fevereiro 2025
   - **Solução**: Executar importação para período completo (janeiro 2025 a hoje)

