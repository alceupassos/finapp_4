# 📚 Contexto Completo - Importação F360 FinApp

**Data:** 2025-01-XX  
**Última Atualização:** Após importação completa DFC batches

---

## 🎯 RESUMO EXECUTIVO

### Status Atual
- ✅ **DFC Importado:** 1.497 registros de 13 empresas (setembro-novembro 2025)
- ⚠️ **DRE Parcial:** 66 registros de 1 empresa (apenas despesas)
- ❌ **Receitas/Entradas:** Faltando completamente

### Problema Principal
- Dados de **receitas** (DRE) e **entradas** (DFC) não foram importados
- Apenas **despesas** (DRE) e **saídas** (DFC) foram processadas
- 12 empresas VOLPE sem dados DRE

---

## 📊 DADOS IMPORTADOS

### DFC (Demonstração do Fluxo de Caixa)
```
Total de Registros: 1.497
Empresas: 13/13 (100%)
Período: 01/09/2025 a 10/11/2025
Total Saídas: R$ 16.756.019,26
Total Entradas: R$ 0,00
```

**Empresas com DFC:**
- ✅ VOLPE MATRIZ (26888098000159)
- ✅ VOLPE ZOIAO (26888098000230)
- ✅ VOLPE MAUÁ (26888098000310)
- ✅ VOLPE DIADEMA (26888098000400)
- ✅ VOLPE GRAJAÚ (26888098000582)
- ✅ VOLPE SANTO ANDRÉ (26888098000663)
- ✅ VOLPE CAMPO LIMPO (26888098000744)
- ✅ VOLPE BRASILÂNDIA (26888098000825)
- ✅ VOLPE POÁ (26888098000906)
- ✅ VOLPE ITAIM (26888098001040)
- ✅ VOLPE PRAIA GRANDE (26888098001120)
- ✅ VOLPE ITANHAÉM (26888098001201)
- ✅ VOLPE SÃO MATHEUS (26888098001392)

### DRE (Demonstração do Resultado do Exercício)
```
Total de Registros: 66
Empresas: 1/13 (7,7%)
Período: Setembro 2025
Total Despesas: R$ 8.184.235,09
Total Receitas: R$ 0,00
```

**Empresas com DRE:**
- ✅ VOLPE MATRIZ (26888098000159) - 66 registros

**Empresas SEM DRE:**
- ❌ VOLPE ZOIAO (26888098000230)
- ❌ VOLPE MAUÁ (26888098000310)
- ❌ VOLPE DIADEMA (26888098000400)
- ❌ VOLPE GRAJAÚ (26888098000582)
- ❌ VOLPE SANTO ANDRÉ (26888098000663)
- ❌ VOLPE CAMPO LIMPO (26888098000744)
- ❌ VOLPE BRASILÂNDIA (26888098000825)
- ❌ VOLPE POÁ (26888098000906)
- ❌ VOLPE ITAIM (26888098001040)
- ❌ VOLPE PRAIA GRANDE (26888098001120)
- ❌ VOLPE ITANHAÉM (26888098001201)
- ❌ VOLPE SÃO MATHEUS (26888098001392)

---

## 🔧 PROCESSO DE IMPORTAÇÃO REALIZADO

### 1. Geração de SQL Batches

**Script Principal:** `scripts/import_f360_direct_mcp.mjs`

**Processo:**
1. Busca dados do F360 via API
2. Processa e normaliza dados
3. Remove duplicatas baseado em constraints únicas
4. Gera arquivos SQL em batches de 500 registros
5. Inclui `ON CONFLICT DO UPDATE` para upsert

**Arquivos Gerados:**
- `import_dfc_batch_1.sql` (502 linhas)
- `import_dfc_batch_2.sql` (502 linhas)
- `import_dfc_batch_3.sql` (500 linhas)
- `import_dre_batch_1.sql` (66 registros)

### 2. Aplicação via MCP Supabase

**Estratégia:**
- Dividir batches grandes em chunks de ~200 registros
- Aplicar via `mcp_supabase_apply_migration`
- Cada chunk inclui headers SQL completos e `ON CONFLICT`

**Batches Aplicados:**
- DFC Batch 1: 3 chunks (linhas 1-200, 201-400, 401-502)
- DFC Batch 2: 3 chunks (linhas 1-200, 201-400, 401-502)
- DFC Batch 3: 3 chunks (linhas 1-200, 201-400, 401-500)

**Total:** 9 migrations aplicadas com sucesso

### 3. Constraints e Validações

**DFC:**
```sql
CREATE UNIQUE INDEX unique_dfc_entry 
ON dfc_entries (company_cnpj, date, kind, category, bank_account);
```

**DRE:**
```sql
CREATE UNIQUE INDEX unique_dre_entry 
ON dre_entries (company_cnpj, date, account, natureza);
```

**Nota Importante:** `bank_account` deve ser string vazia (`''`) quando NULL para constraint funcionar.

---

## 🔍 ANÁLISE DO PROBLEMA

### Por que apenas despesas/saídas?

**Hipóteses:**
1. **Script não processa receitas/entradas**
   - Função `determinarNatureza()` pode estar classificando tudo como despesa
   - Filtro no processamento pode estar excluindo receitas

2. **F360 não retorna receitas no período**
   - Dados de receitas podem estar em período diferente
   - API pode requerer parâmetros diferentes

3. **Mapeamento incorreto**
   - Campos de receitas podem ter nomes diferentes
   - Estrutura de dados pode ser diferente

### Evidências
- DRE: 66 registros, todos com `natureza = 'despesa'`
- DFC: 1.497 registros, todos com `kind = 'out'`
- Nenhum registro com `natureza = 'receita'` ou `kind = 'in'`

---

## 📋 PRÓXIMOS PASSOS TÉCNICOS

### 1. Investigar Script de Importação

**Arquivo:** `scripts/import_f360_process_and_insert.mjs`

**Verificar:**
- [ ] Função `determinarNatureza()` - como classifica receitas/despesas?
- [ ] Filtros que podem estar excluindo receitas
- [ ] Mapeamento de campos do F360
- [ ] Estrutura de dados retornada pela API

### 2. Testar API F360 Diretamente

**Verificar:**
- [ ] Endpoint retorna dados de receitas?
- [ ] Parâmetros necessários para receitas?
- [ ] Estrutura de resposta para receitas vs despesas

### 3. Ajustar Script

**Ações:**
- [ ] Corrigir `determinarNatureza()` se necessário
- [ ] Adicionar processamento de receitas/entradas
- [ ] Validar mapeamento de campos
- [ ] Re-executar importação completa

### 4. Importar DRE para 12 Empresas Faltantes

**Ações:**
- [ ] Executar importação DRE para todas as empresas
- [ ] Validar integridade dos dados
- [ ] Verificar se receitas aparecem

---

## 🗂️ ARQUIVOS E SCRIPTS

### Scripts de Importação
- `scripts/import_f360_direct_mcp.mjs` - Geração de SQL batches
- `scripts/import_f360_process_and_insert.mjs` - Processamento de dados
- `scripts/apply_dfc_batches.mjs` - Helper para aplicar batches
- `scripts/execute_batches.mjs` - Helper para executar batches
- `scripts/diagnose_and_import.mjs` - Diagnóstico e importação
- `scripts/import_f360_via_mcp.mjs` - Importação via MCP
- `scripts/import_via_fetch.mjs` - Teste via fetch direto

### Arquivos SQL Gerados
- `import_dfc_batch_1.sql` - 502 registros DFC
- `import_dfc_batch_2.sql` - 502 registros DFC
- `import_dfc_batch_3.sql` - 500 registros DFC
- `import_dre_batch_1.sql` - 66 registros DRE (apenas VOLPE MATRIZ)

### Documentação
- `STATUS_IMPORTACAO.md` - Status atual e pendências
- `CONTEXTO_COMPLETO_IMPORTACAO.md` - Este arquivo

---

## 🔑 INFORMAÇÕES TÉCNICAS

### Token F360 Grupo Volpe
```
Token: eb0e1ef3-516c-4e4a-a043-5b1e45794f42
Login: volpe.matriz@ifinance.com.br
Base URL: https://financas.f360.com.br
```

### Endpoints F360 Utilizados
- `POST /PublicLoginAPI/DoLogin` - Autenticação
- `POST /PublicRelatorioAPI/GerarRelatorio` - Gerar relatório contábil
- `GET /PublicRelatorioAPI/Download?id={id}` - Download relatório
- `GET /ContaBancariaPublicAPI/ListarContasBancarias` - Listar contas

### Estrutura de Dados

**DFC Entry:**
```typescript
{
  company_cnpj: string (14 dígitos)
  date: string (YYYY-MM-DD)
  kind: 'in' | 'out'
  category: string
  amount: number
  bank_account: string ('' quando NULL)
  description: string
  source_erp: 'F360'
  source_id: string | null
}
```

**DRE Entry:**
```typescript
{
  company_cnpj: string (14 dígitos)
  date: string (YYYY-MM-DD)
  account: string
  natureza: 'receita' | 'despesa'
  valor: number
  description: string
  source_erp: 'F360'
  source_id: string | null
}
```

---

## 📈 MÉTRICAS E ESTATÍSTICAS

### Cobertura de Dados
- **DFC:** 100% das empresas (13/13)
- **DRE:** 7,7% das empresas (1/13)
- **Receitas:** 0% (nenhuma empresa)
- **Entradas:** 0% (nenhuma empresa)

### Volume de Dados
- **DFC:** 1.497 registros
- **DRE:** 66 registros
- **Total Importado:** 1.563 registros

### Valores Financeiros
- **Total Despesas (DRE):** R$ 8.184.235,09
- **Total Saídas (DFC):** R$ 16.756.019,26
- **Total Receitas (DRE):** R$ 0,00
- **Total Entradas (DFC):** R$ 0,00

---

## 🚨 PROBLEMAS CONHECIDOS

### 1. Ausência de Receitas/Entradas
**Severidade:** 🔴 CRÍTICO  
**Impacto:** Dashboard mostra apenas despesas/saídas  
**Status:** Investigação necessária

### 2. DRE Incompleto
**Severidade:** 🟡 ALTO  
**Impacto:** Apenas 1 empresa com dados DRE  
**Status:** Importação pendente para 12 empresas

### 3. Validação de Integridade
**Severidade:** 🟡 MÉDIO  
**Impacto:** Não sabemos se dados estão corretos  
**Status:** Testes pendentes

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Dados Importados
- [x] DFC importado para todas as empresas
- [x] DRE importado para VOLPE MATRIZ
- [ ] DRE importado para outras 12 empresas
- [ ] Receitas importadas (DRE)
- [ ] Entradas importadas (DFC)

### Integridade
- [ ] Validar totais DRE: Receitas - Despesas = Resultado
- [ ] Validar totais DFC: Entradas - Saídas = Variação Caixa
- [ ] Verificar ausência de duplicatas
- [ ] Validar consolidação de múltiplas empresas
- [ ] Verificar filtros por período

### Frontend
- [ ] Dashboard mostra valores reais
- [ ] Gráficos DRE funcionam
- [ ] Gráficos DFC funcionam
- [ ] Filtros funcionam corretamente
- [ ] Consolidação funciona

---

## 🔄 COMANDOS ÚTEIS

### Verificar Dados
```sql
-- Status geral
SELECT 
  'DRE' as tabela,
  COUNT(*) as registros,
  COUNT(DISTINCT company_cnpj) as empresas,
  SUM(CASE WHEN natureza = 'receita' THEN valor ELSE 0 END) as receitas,
  SUM(CASE WHEN natureza = 'despesa' THEN valor ELSE 0 END) as despesas
FROM dre_entries
UNION ALL
SELECT 
  'DFC' as tabela,
  COUNT(*) as registros,
  COUNT(DISTINCT company_cnpj) as empresas,
  SUM(CASE WHEN kind = 'in' THEN amount ELSE 0 END) as receitas,
  SUM(CASE WHEN kind = 'out' THEN amount ELSE 0 END) as despesas
FROM dfc_entries;

-- Empresas sem DRE
SELECT c.cnpj, c.razao_social
FROM companies c
LEFT JOIN dre_entries d ON d.company_cnpj = c.cnpj
WHERE c.cnpj LIKE '268880980%' AND d.company_cnpj IS NULL;
```

### Limpar e Reimportar
```sql
-- CUIDADO: Isso apaga todos os dados!
TRUNCATE TABLE dfc_entries CASCADE;
TRUNCATE TABLE dre_entries CASCADE;
```

---

## 📝 NOTAS IMPORTANTES

1. **Tokens F360:** Sempre buscar do banco (`companies.token_f360`), nunca do `.env`
2. **Empresas:** Sempre filtrar por `user_companies` para acesso do usuário
3. **Constraints:** `bank_account` deve ser `''` quando NULL
4. **Upsert:** Usar `ON CONFLICT DO UPDATE` para evitar duplicatas
5. **Batches:** Dividir em chunks de ~200 registros para evitar limites de token

---

**Status Final:** 🟡 **PARCIALMENTE COMPLETO**
- DFC: ✅ Completo (mas só saídas)
- DRE: ⚠️ Incompleto (1 empresa, só despesas)
- Receitas/Entradas: ❌ Faltando completamente

**Próxima Ação Crítica:** Investigar e importar receitas/entradas

