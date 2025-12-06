# 📊 ANÁLISE COMPLETA: Scripts e Edge Functions de Importação F360

**Data**: 2025-01-XX  
**Objetivo**: Identificar e categorizar TODOS os scripts/edge functions de importação F360 existentes

---

## 📋 SUMÁRIO EXECUTIVO

### Problema Identificado
- **13 empresas** cadastradas no Supabase (tabela `companies`)
- Tabela `dre_entries` **vazia ou sem dados de Outubro/2025**
- Dashboard mostra **R$ 0** porque não há dados DRE
- **F360 tem comportamento diferente** para GRUPOS vs EMPRESAS SIMPLES:
  - **GRUPOS**: Campo `CNPJ` retorna VAZIO no relatório
  - **EMPRESAS SIMPLES**: Campo `CNPJ` retorna normalmente

### Solução Recomendada
**USAR**: Edge Function `sync-f360` (já implementada e funcional)
- ✅ Suporta SINGLE (empresa única)
- ✅ Suporta GROUP (grupo de empresas)
- ✅ Tratamento correto de `CNPJEmpresas`
- ✅ Logs detalhados em `import_logs`
- ✅ Retry logic implementado

---

## 📁 CATEGORIZAÇÃO DE ARQUIVOS ENCONTRADOS

### 🟢 EDGE FUNCTIONS (Produção)

| Arquivo | Tipo | Trata Grupo? | Trata Empresa? | Status | Recomendação |
|---------|------|-------------|----------------|--------|-------------|
| `supabase/functions/sync-f360/index.ts` | Edge Function | ✅ SIM | ✅ SIM | ✅ FUNCIONAL | **USAR ESTE** |
| `supabase/functions/f360-discover/index.ts` | Edge Function | ✅ SIM | ✅ SIM | ❓ VERIFICAR | Verificar se existe |

**Detalhes `sync-f360/index.ts`**:
- **Rota SINGLE**: `POST /sync-f360` com `{ cnpj, dataInicio, dataFim }`
- **Rota GROUP**: `POST /sync-f360/group` com `{ token, expectedCnpjs, dataInicio, dataFim }`
- **Endpoint F360**: `POST /PublicRelatorioAPI/GerarRelatorio`
- **Como identifica grupo**: Recebe `expectedCnpjs` como parâmetro (não detecta automaticamente)
- **Tratamento CNPJ**: 
  - SINGLE: `CNPJEmpresas: [cnpj]`
  - GROUP: `CNPJEmpresas: []` (vazio = todas empresas)
- **Mapeamento**: Usa `CNPJEmpresa` do relatório para mapear para `company_id`

---

### 🔵 SCRIPTS LOCAIS (Development Only)

#### Scripts que tratam AMBOS (Grupo + Empresa Simples)

| Arquivo | Tipo | Trata Grupo? | Trata Empresa? | Status | Recomendação |
|---------|------|-------------|----------------|--------|-------------|
| `scripts/import_f360_2025_complete.mjs` | Script Local | ✅ SIM | ✅ SIM | ⚠️ HARDCODED VOLPE | Usar como referência |
| `scripts/import_volpe_complete.mjs` | Script Local | ✅ SIM | ❌ NÃO | ⚠️ HARDCODED VOLPE | Usar como referência |
| `scripts2/scripts/import-all-f360.ts` | Script Local | ✅ SIM | ✅ SIM | ✅ GENÉRICO | Usar como referência |
| `src/services/f360ImportService.ts` | Service TypeScript | ✅ SIM | ✅ SIM | ✅ GENÉRICO | Usar como referência |

**Detalhes `import_f360_2025_complete.mjs`**:
- **Hardcoded**: Token Volpe e 13 CNPJs
- **Processamento**: Empresa por empresa, mês por mês
- **Endpoint F360**: `POST /PublicRelatorioAPI/GerarRelatorio`
- **Como identifica grupo**: Não identifica - processa cada CNPJ individualmente
- **Tratamento CNPJ**: `CNPJEmpresas: [normalizeCnpj(companyCnpj)]` (SINGLE sempre)
- **Problema**: Não trata grupos corretamente (processa cada empresa separadamente)

**Detalhes `import_volpe_complete.mjs`**:
- **Hardcoded**: Token Volpe e 13 CNPJs
- **Processamento**: Gera relatório único para todas empresas (GROUP)
- **Endpoint F360**: `POST /PublicRelatorioAPI/GerarRelatorio`
- **Como identifica grupo**: Hardcoded como grupo
- **Tratamento CNPJ**: `CNPJEmpresas: []` (vazio = todas empresas)
- **Mapeamento**: Usa `CNPJEmpresa` do relatório para mapear para `company_id`
- **Status**: ✅ Funciona para grupos, mas hardcoded

**Detalhes `scripts2/scripts/import-all-f360.ts`**:
- **Genérico**: Lê tokens de `tokens_f360.json`
- **Processamento**: Detecta automaticamente SINGLE vs GROUP
- **Endpoint F360**: Múltiplos (ListarContasBancarias, GerarRelatorioContabil)
- **Como identifica grupo**: 
  1. ListarContasBancarias → extrai CNPJs
  2. Se > 1 CNPJ → GRUPO
  3. Se 1 CNPJ → SINGLE
- **Tratamento CNPJ**: 
  - SINGLE: `CNPJEmpresas: [cnpj]`
  - GROUP: `CNPJEmpresas: []`
- **Status**: ✅ Mais completo, mas complexo

**Detalhes `f360ImportService.ts`**:
- **Service TypeScript**: Classe reutilizável
- **Processamento**: Detecta automaticamente SINGLE vs GROUP
- **Endpoint F360**: `POST /PublicRelatorioAPI/GerarRelatorio`
- **Como identifica grupo**: Via `getContasBancarias()` → conta CNPJs únicos
- **Tratamento CNPJ**: 
  - SINGLE: `cnpjEmpresas: [companyCnpj]`
  - GROUP: `cnpjEmpresas: []`
- **Status**: ✅ Bom para uso em código TypeScript

---

#### Scripts que tratam APENAS EMPRESAS SIMPLES

| Arquivo | Tipo | Trata Grupo? | Trata Empresa? | Status | Recomendação |
|---------|------|-------------|----------------|--------|-------------|
| `scripts/import_f360_robust.mjs` | Script Local | ❌ NÃO | ✅ SIM | ⚠️ ANTIGO | Não usar |
| `scripts/import_f360_process_and_insert.mjs` | Script Local | ❌ NÃO | ✅ SIM | ⚠️ ANTIGO | Não usar |
| `scripts/import_f360_direct_mcp.mjs` | Script Local | ❌ NÃO | ✅ SIM | ⚠️ ANTIGO | Não usar |
| `scripts/import_f360_via_mcp.mjs` | Script Local | ❌ NÃO | ✅ SIM | ⚠️ ANTIGO | Não usar |
| `scripts/import_f360_final.mjs` | Script Local | ❌ NÃO | ✅ SIM | ⚠️ ANTIGO | Não usar |
| `scripts/import_f360_fixed.mjs` | Script Local | ❌ NÃO | ✅ SIM | ⚠️ ANTIGO | Não usar |
| `scripts/import_f360_2025_mcp.mjs` | Script Local | ❌ NÃO | ✅ SIM | ⚠️ ANTIGO | Não usar |
| `scripts/import_f360_2025_direct_mcp.mjs` | Script Local | ❌ NÃO | ✅ SIM | ⚠️ ANTIGO | Não usar |
| `scripts/import_f360_2025_via_mcp.mjs` | Script Local | ❌ NÃO | ✅ SIM | ⚠️ ANTIGO | Não usar |

**Padrão comum**: Todos usam `CNPJEmpresas: [normalizeCnpj(cnpj)]` (SINGLE sempre)

---

#### Scripts de Teste

| Arquivo | Tipo | Trata Grupo? | Trata Empresa? | Status | Recomendação |
|---------|------|-------------|----------------|--------|-------------|
| `scripts/tests/test_f360_group.mjs` | Teste | ✅ SIM | ❌ NÃO | ✅ FUNCIONAL | Usar para validar grupos |
| `scripts/tests/test_f360_single.mjs` | Teste | ❌ NÃO | ✅ SIM | ✅ FUNCIONAL | Usar para validar empresas |
| `scripts/tests/test_f360_login.mjs` | Teste | ❌ NÃO | ❌ NÃO | ✅ FUNCIONAL | Usar para validar login |
| `scripts/tests/test_f360_persistence.mjs` | Teste | ❌ NÃO | ❌ NÃO | ✅ FUNCIONAL | Usar para validar persistência |

---

## 🔍 ANÁLISE DETALHADA: Como cada script identifica GRUPO vs EMPRESA SIMPLES

### Método 1: Via `ListarContasBancarias` (Mais Confiável)
**Usado por**: `scripts2/scripts/import-all-f360.ts`, `f360ImportService.ts`

```typescript
// 1. Listar contas bancárias
const contas = await f360Client.getContasBancarias()

// 2. Extrair CNPJs únicos
const cnpjs = new Set()
for (const conta of contas) {
  const cnpj = (conta.CNPJ || conta.cnpj || '').replace(/\D/g, '')
  if (cnpj && cnpj.length === 14) {
    cnpjs.add(cnpj)
  }
}

// 3. Determinar tipo
const isGroup = cnpjs.size > 1
```

**Vantagens**:
- ✅ Funciona para grupos (retorna múltiplos CNPJs)
- ✅ Funciona para empresas simples (retorna 1 CNPJ)
- ✅ Não requer relatório prévio

**Desvantagens**:
- ⚠️ Depende de contas bancárias cadastradas

---

### Método 2: Via `is_group` na tabela `companies` (Recomendado)
**Usado por**: Edge Function `sync-f360` (parcialmente)

```sql
-- Verificar se empresa é grupo
SELECT is_group, group_token, parent_company_id 
FROM companies 
WHERE cnpj = ?
```

**Vantagens**:
- ✅ Fonte de verdade no banco
- ✅ Não requer chamada API
- ✅ Rápido

**Desvantagens**:
- ⚠️ Requer que campo `is_group` esteja preenchido corretamente

---

### Método 3: Via `CNPJEmpresas` vazio no relatório (Usado em grupos)
**Usado por**: `import_volpe_complete.mjs`, `sync-f360/group`

```typescript
// Para grupos: CNPJEmpresas vazio = todas empresas
const relatorioBody = {
  CNPJEmpresas: [], // Vazio = todas empresas do grupo
}
```

**Vantagens**:
- ✅ Retorna dados de todas empresas do grupo
- ✅ Relatório consolidado

**Desvantagens**:
- ⚠️ Campo `CNPJEmpresa` no relatório pode estar vazio (problema conhecido)

---

## 🎯 RECOMENDAÇÃO FINAL

### ✅ SOLUÇÃO RECOMENDADA: Edge Function `sync-f360`

**Por quê?**
1. ✅ Já implementada e funcional
2. ✅ Suporta SINGLE e GROUP
3. ✅ Logs detalhados em `import_logs`
4. ✅ Retry logic implementado
5. ✅ Validação de dados antes de salvar
6. ✅ Tratamento de erros individual
7. ✅ Pode ser chamada do frontend ou via CRON

**Como usar:**

#### Para EMPRESA SIMPLES (SINGLE):
```typescript
// Chamada do frontend ou script
const response = await fetch(`${supabaseUrl}/functions/v1/sync-f360`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    cnpj: '26888098000159', // CNPJ da empresa
    dataInicio: '2025-10-01',
    dataFim: '2025-10-31',
  }),
})
```

#### Para GRUPO (GROUP):
```typescript
// Chamada do frontend ou script
const response = await fetch(`${supabaseUrl}/functions/v1/sync-f360/group`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42', // Token do grupo
    expectedCnpjs: [
      '26888098000159',
      '26888098000230',
      // ... todas as empresas do grupo
    ],
    dataInicio: '2025-10-01',
    dataFim: '2025-10-31',
  }),
})
```

---

## 🛠️ IMPLEMENTAÇÃO: Script Unificado de Importação

Criar script que:
1. ✅ Busca todas empresas ativas do banco
2. ✅ Identifica se é grupo ou empresa simples
3. ✅ Chama Edge Function apropriada
4. ✅ Logs detalhados por empresa
5. ✅ Tratamento de erros individual

**Arquivo**: `scripts/import_f360_unified.mjs` (criar)

---

## 📝 PRÓXIMOS PASSOS

1. ✅ **Verificar schema `companies`**: Adicionar campos `is_group`, `group_id`, `parent_cnpj` se não existirem
2. ✅ **Atualizar empresas existentes**: Marcar grupos com `is_group = true`
3. ✅ **Criar script unificado**: `scripts/import_f360_unified.mjs`
4. ✅ **Testar importação**: Outubro/2025 para todas empresas
5. ✅ **Validar dados**: Verificar `dre_entries` após importação

---

## 🔧 CORREÇÕES NECESSÁRIAS

### 1. Edge Function `sync-f360` - Bug no Login
**Problema**: Linha 119 duplica código de login
```typescript
// Linha 79-110: Login com retry
// Linha 119: Duplica login (erro)
const { Token: jwt } = await loginResponse.json() as F360LoginResponse
```

**Correção**: Remover linha 119 (já está logado nas linhas 79-110)

### 2. Edge Function `sync-f360` - Detecção Automática de Grupo
**Problema**: Não detecta automaticamente se é grupo
**Solução**: Adicionar lógica para verificar `is_group` na tabela `companies`

---

## 📊 COMPARAÇÃO: Edge Function vs Scripts Locais

| Característica | Edge Function `sync-f360` | Scripts Locais |
|----------------|---------------------------|----------------|
| **Produção** | ✅ Sim | ❌ Não |
| **Chamada do Frontend** | ✅ Sim | ❌ Não |
| **Logs no Banco** | ✅ Sim | ⚠️ Parcial |
| **Retry Logic** | ✅ Sim | ⚠️ Parcial |
| **Validação de Dados** | ✅ Sim | ⚠️ Parcial |
| **Tratamento de Erros** | ✅ Sim | ⚠️ Parcial |
| **SINGLE** | ✅ Sim | ✅ Sim |
| **GROUP** | ✅ Sim | ⚠️ Parcial |

**Conclusão**: Edge Function é superior para produção.

---

## 🎓 LIÇÕES APRENDIDAS

1. **F360 GRUPOS**: Campo `CNPJ` no relatório pode estar vazio → usar `CNPJEmpresas` vazio no payload
2. **F360 SINGLE**: Campo `CNPJ` retorna normalmente → usar `CNPJEmpresas: [cnpj]`
3. **Detecção de Grupo**: Melhor via `ListarContasBancarias` → contar CNPJs únicos
4. **Mapeamento**: Usar `CNPJEmpresa` do relatório para mapear para `company_id` no banco
5. **Validação**: Sempre validar dados antes de salvar (não confiar 100% na API F360)

---

## 📚 REFERÊNCIAS

- **Edge Function**: `supabase/functions/sync-f360/index.ts`
- **Service TypeScript**: `src/services/f360ImportService.ts`
- **Scripts2**: `scripts2/scripts/import-all-f360.ts`
- **Testes**: `scripts/tests/test_f360_*.mjs`
- **Documentação F360**: `docs/F360_API_INDEX.md`

---

**FIM DO DOCUMENTO**



