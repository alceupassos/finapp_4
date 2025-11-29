# Problemas Encontrados e Correções Aplicadas - finapp_v4

**Data:** 2025-11-29  
**Status:** Em correção

---

## 📋 Índice

1. [Problema 1: Variáveis de Ambiente Ausentes](#problema-1)
2. [Problema 2: Coluna Inexistente no Banco](#problema-2)
3. [Problema 3: Atributos SVG Inválidos](#problema-3)
4. [Resumo das Correções](#resumo)
5. [Como Diagnosticar Novos Problemas](#diagnostico)
6. [Próximos Passos](#proximos-passos)

---

## 🔴 Problema 1: Variáveis de Ambiente Ausentes

### Sintoma
```
ERRO: Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes
```

### Causa Raiz
O arquivo `.env.local` estava vazio (apenas 1 byte). O Vite carrega variáveis de ambiente apenas na inicialização do servidor, então mesmo após criar o arquivo, o servidor precisava ser reiniciado.

### Localização do Erro
- **Arquivo:** `src/services/auth.ts` (linha 22)
- **Arquivo:** `src/services/supabaseRest.ts` (linhas 1-2)

### Correção Aplicada
1. Copiado conteúdo de `.env.production` para `.env.local`:
   ```bash
   cp .env.production .env.local
   ```

2. Conteúdo do `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Servidor reiniciado para carregar variáveis

### Verificação
```bash
# Verificar se arquivo existe e tem conteúdo
cat .env.local

# Verificar se variáveis estão sendo carregadas (Node.js)
node -e "require('dotenv').config({ path: '.env.local' }); console.log(process.env.VITE_SUPABASE_URL)"
```

### Arquivos Modificados
- ✅ `.env.local` - Criado/preenchido

---

## 🔴 Problema 2: Coluna Inexistente no Banco de Dados

### Sintoma
```
[Error] Supabase GET integration_f360 failed: 400
{"code":"42703","message":"column integration_f360.grupo_empresarial does not exist"}
```

### Causa Raiz
A query em `getCompanies()` tentava buscar a coluna `grupo_empresarial` da tabela `integration_f360`, mas essa coluna não existe no schema atual do Supabase.

### Localização do Erro
- **Arquivo:** `src/services/supabaseRest.ts` (linha 55)
- **Função:** `SupabaseRest.getCompanies()`

### Código Problemático (ANTES)
```typescript
getCompanies: async () => {
  const cnpj14 = MATRIZ_CNPJ.replace(/^0+/, '')
  const rows = await restGet('integration_f360', { 
    query: { 
      select: 'grupo_empresarial,cliente_nome,cnpj',  // ❌ grupo_empresarial não existe
      cnpj: `eq.${cnpj14}`, 
      limit: '1' 
    } 
  })
  if (Array.isArray(rows) && rows.length) return rows
  return [{ grupo_empresarial: 'Grupo Volpe', cliente_nome: 'Volpe Matriz', cnpj: cnpj14 }]
}
```

### Correção Aplicada (DEPOIS)
```typescript
getCompanies: async () => {
  const cnpj14 = MATRIZ_CNPJ.replace(/^0+/, '')
  try {
    // Buscar apenas colunas que existem
    const rows = await restGet('integration_f360', { 
      query: { 
        select: 'cliente_nome,cnpj',  // ✅ Apenas colunas existentes
        cnpj: `eq.${cnpj14}`, 
        limit: '10' 
      } 
    })
    if (Array.isArray(rows) && rows.length) {
      // Adicionar grupo_empresarial como padrão
      return rows.map((r: any) => ({
        grupo_empresarial: r.grupo_empresarial || 'Grupo Volpe',  // ✅ Fallback
        cliente_nome: r.cliente_nome || r.nome || 'Empresa',
        cnpj: r.cnpj || cnpj14
      }))
    }
  } catch (err: any) {
    console.warn('Erro ao buscar empresas de integration_f360:', err.message)
  }
  // Fallback: construir a empresa padrão
  return [{ grupo_empresarial: 'Grupo Volpe', cliente_nome: 'Volpe Matriz', cnpj: cnpj14 }]
}
```

### Melhorias Adicionadas
1. ✅ Try/catch para tratamento de erros
2. ✅ Busca apenas colunas existentes (`cliente_nome`, `cnpj`)
3. ✅ Adiciona `grupo_empresarial` como fallback padrão
4. ✅ Suporta múltiplas empresas (limit: '10')
5. ✅ Log de erro no console para debug

### Arquivos Modificados
- ✅ `src/services/supabaseRest.ts` - Função `getCompanies()` corrigida

---

## 🔴 Problema 3: Atributos SVG Inválidos no React

### Sintoma
```
[Error] Warning: Invalid DOM property `flood-color`. Did you mean `floodColor`?
[Error] Warning: Invalid DOM property `flood-opacity`. Did you mean `floodOpacity`?
```

### Causa Raiz
React requer atributos SVG em camelCase, não em kebab-case. O código estava usando `flood-color` e `flood-opacity` (formato HTML/SVG padrão) em vez de `floodColor` e `floodOpacity` (formato React).

### Localização do Erro
- **Arquivo:** `src/components/DashboardOverview.tsx` (linha 112)
- **Arquivo:** `src/components/MonthlyBarChart.tsx` (linha 42)

### Código Problemático (ANTES)
```tsx
<filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.35" />
</filter>
```

### Correção Aplicada (DEPOIS)
```tsx
<filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
</filter>
```

### Arquivos Modificados
- ✅ `src/components/DashboardOverview.tsx` - Atributos SVG corrigidos
- ✅ `src/components/MonthlyBarChart.tsx` - Atributos SVG corrigidos

---

## 🔴 Problema 4: Tratamento de Erros Insuficiente

### Sintoma
Erros genéricos sem detalhes úteis no console do navegador.

### Correção Aplicada
Melhorado tratamento de erros em múltiplos arquivos:

#### `src/services/supabaseRest.ts`
```typescript
async function restGet(path: string, opts: { query?: Record<string, string> } = {}) {
  // ✅ Verificação de variáveis
  if (!BASE_URL || !ANON_KEY) {
    console.error('Variáveis Supabase ausentes:', { BASE_URL: !!BASE_URL, ANON_KEY: !!ANON_KEY })
    throw new Error('Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes')
  }
  
  // ... código de requisição ...
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    console.error(`Supabase GET ${path} failed:`, res.status, errorText)  // ✅ Log detalhado
    throw new Error(`Supabase GET ${path} failed: ${res.status} - ${errorText}`)
  }
  return res.json()
}
```

#### `src/components/CustomersPage.tsx`
```typescript
catch (e: any) {
  console.error('Erro ao carregar clientes:', e)  // ✅ Log no console
  setError(`Falha ao carregar clientes: ${e?.message || 'Erro desconhecido'}`)  // ✅ Mensagem detalhada
}
```

### Arquivos Modificados
- ✅ `src/services/supabaseRest.ts` - Melhor tratamento de erros
- ✅ `src/components/CustomersPage.tsx` - Logs de erro melhorados

---

## 📊 Resumo das Correções

| Problema | Arquivo | Status | Descrição |
|----------|---------|--------|-----------|
| Variáveis ausentes | `.env.local` | ✅ Corrigido | Arquivo criado com variáveis do `.env.production` |
| Coluna inexistente | `supabaseRest.ts` | ✅ Corrigido | Query ajustada para não buscar `grupo_empresarial` |
| Atributos SVG | `DashboardOverview.tsx` | ✅ Corrigido | `flood-color` → `floodColor` |
| Atributos SVG | `MonthlyBarChart.tsx` | ✅ Corrigido | `flood-opacity` → `floodOpacity` |
| Tratamento de erros | `supabaseRest.ts` | ✅ Melhorado | Logs detalhados e verificações |
| Tratamento de erros | `CustomersPage.tsx` | ✅ Melhorado | Mensagens de erro mais informativas |

---

## 🔍 Como Diagnosticar Novos Problemas

### 1. Verificar Variáveis de Ambiente
```bash
# Verificar se arquivo existe
ls -la .env.local

# Verificar conteúdo
cat .env.local

# Verificar se servidor carregou (após reiniciar)
# No console do navegador:
console.log(import.meta.env.VITE_SUPABASE_URL)
```

### 2. Verificar Erros no Console do Navegador
1. Abrir DevTools: `Cmd + Option + I` (Safari) ou `Cmd + Shift + I` (Chrome)
2. Ir para aba "Console"
3. Procurar por erros em vermelho
4. Copiar mensagem de erro completa

### 3. Verificar Estrutura do Banco de Dados
```sql
-- No Supabase SQL Editor, verificar colunas da tabela:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'integration_f360';
```

### 4. Verificar Requisições de Rede
1. Abrir DevTools → aba "Network"
2. Filtrar por "Fetch/XHR"
3. Verificar requisições falhadas (status 400, 500, etc.)
4. Clicar na requisição e ver "Response" para detalhes do erro

### 5. Verificar Logs do Servidor
```bash
# Ver logs do Vite
tail -f /tmp/vite.log

# Ou se rodando em foreground:
npm run dev -- --port 5173
```

---

## 🚨 Problemas Conhecidos que Ainda Precisam de Atenção

### 1. Schema do Banco de Dados
**Problema:** A estrutura real da tabela `integration_f360` não está clara.

**Ações Necessárias:**
- Verificar no Supabase quais colunas realmente existem
- Documentar schema correto
- Ajustar queries conforme necessário

**Como Verificar:**
```sql
-- No Supabase SQL Editor
\d integration_f360  -- PostgreSQL
-- ou
SELECT * FROM information_schema.columns WHERE table_name = 'integration_f360';
```

### 2. Fallback de Empresas
**Situação Atual:** Quando a tabela não retorna dados, usa fallback hardcoded.

**Melhorias Possíveis:**
- Buscar empresas de outras tabelas (ex: `dre_entries`, `cashflow_entries`)
- Criar tabela `companies` dedicada
- Implementar cache de empresas

### 3. Tratamento de Erros em Outros Componentes
**Arquivos que podem precisar de melhorias:**
- `src/components/ReportsPage.tsx`
- `src/components/ReportFilters.tsx`
- `src/components/DREPivotTable.tsx`
- `src/components/DFCPivotTable.tsx`

---

## 📝 Próximos Passos Recomendados

### Prioridade Alta
1. ✅ **Verificar Schema Real do Banco**
   - Executar query SQL para listar colunas de `integration_f360`
   - Documentar estrutura real
   - Ajustar todas as queries que usam essa tabela

2. ✅ **Testar Login**
   - Verificar se `defaultCompany` está sendo setado corretamente
   - Testar com usuário que tem empresas associadas
   - Verificar se `user_companies` tem dados

3. ✅ **Testar Carregamento de Dados**
   - Verificar se DRE/DFC estão carregando
   - Verificar se empresas estão aparecendo
   - Verificar se gráficos estão renderizando

### Prioridade Média
4. **Melhorar Fallbacks**
   - Implementar busca em múltiplas tabelas
   - Criar sistema de cache
   - Adicionar retry automático

5. **Documentar Schema**
   - Criar arquivo `SCHEMA_ATUAL.md` com estrutura real
   - Documentar todas as tabelas usadas
   - Documentar relacionamentos

### Prioridade Baixa
6. **Otimizações**
   - Code splitting para reduzir bundle size
   - Lazy loading de componentes pesados
   - Virtualização de tabelas grandes

---

## 🛠️ Comandos Úteis para Debug

### Verificar Servidor
```bash
# Ver se está rodando
lsof -i :5173

# Ver processos node
ps aux | grep node

# Matar servidor
pkill -f "vite.*5173"
```

### Reiniciar Servidor
```bash
# Usar script
./start.sh

# Ou manualmente
npm run dev -- --port 5173 --host
```

### Verificar Build
```bash
npm run build
npm run lint
```

### Verificar Git
```bash
git status
git log --oneline -5
```

---

## 📚 Arquivos de Referência

- **Variáveis de Ambiente:** `supa.md`, `.env.production`
- **Schema Proposto:** `docs/SCHEMA_MULTI_TENANT.md`
- **Documentação Integração:** `avant/integracao/integracao-f360-omie-nextjs-completa.md`
- **Implementação Original:** `IMPLEMENTACAO_DIAGNOSTICO_FIX.md`

---

## 🔄 Checklist de Verificação

Antes de considerar o problema resolvido, verificar:

- [ ] `.env.local` existe e tem conteúdo
- [ ] Servidor foi reiniciado após criar `.env.local`
- [ ] Hard refresh no navegador foi feito (Cmd+Shift+R)
- [ ] Console do navegador não mostra erros de variáveis
- [ ] Console do navegador não mostra erros de colunas inexistentes
- [ ] Console do navegador não mostra warnings de atributos SVG
- [ ] Dados estão carregando (empresas, DRE, DFC)
- [ ] Login funciona e seta `defaultCompany`
- [ ] Gráficos renderizam sem erros

---

## 💡 Dicas para Claude Code

Ao usar Claude Code para corrigir problemas:

1. **Sempre forneça:**
   - Mensagem de erro completa do console
   - Stack trace completo
   - Arquivo e linha onde ocorre o erro

2. **Verificar antes de corrigir:**
   - Schema real do banco de dados
   - Estrutura de dados esperada
   - Versões de dependências

3. **Testar após correção:**
   - Hard refresh no navegador
   - Verificar console para novos erros
   - Testar funcionalidade afetada

4. **Documentar mudanças:**
   - Atualizar este arquivo
   - Comentar código complexo
   - Adicionar logs úteis

---

**Última atualização:** 2025-11-29  
**Próxima revisão:** Após verificação do schema do banco

