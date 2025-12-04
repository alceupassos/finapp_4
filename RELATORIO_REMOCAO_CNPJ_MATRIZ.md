# Relatório: Remoção do CNPJ Matriz

## Data: 2025-12-04

## Objetivo
Remover a dependência do CNPJ hardcoded `26888098000159` (Volpe Matriz) do código, garantindo que o sistema funcione exclusivamente com empresas associadas ao usuário via tabela `user_companies`.

## Lógica Atual (Após Remoção)

### Fluxo de Autenticação e Seleção de Empresas

1. **Login do Usuário** (`src/services/auth.ts`)
   - Usuário faz login via Supabase
   - Sistema busca empresas do usuário via `SupabaseRest.getUserCompanies(userId)`
   - Se encontrar empresas: define `defaultCompany` como primeira empresa
   - Se não encontrar: `defaultCompany = null` (não usa fallback)

2. **Carregamento de Empresas** (`src/App.tsx`)
   - `loadCompanies()` busca empresas via `SupabaseRest.getCompanies()`
   - `getCompanies()` busca empresas do usuário logado via `user_companies`
   - Se não houver usuário logado ou empresas: retorna array vazio `[]`
   - **Não há mais fallback para empresa específica**

3. **Seleção de Empresas** (`src/App.tsx`)
   - `selectedCompanies` inicia como array vazio `[]`
   - Após carregar empresas do usuário, todas são selecionadas automaticamente
   - Se não houver empresas: `selectedCompanies` permanece vazio

4. **Componentes e Dados**
   - Todos os componentes verificam se `selectedCompanies.length > 0` antes de buscar dados
   - Se não houver empresas: componentes mostram estado vazio ou mensagem "Nenhuma empresa selecionada"
   - **Não há mais fallback para CNPJ hardcoded**

## Arquivos Modificados

### 1. `src/services/supabaseRest.ts`
- ✅ Removido `export const MATRIZ_CNPJ`
- ✅ `getCompanies()` agora retorna array vazio se não houver empresas do usuário
- ✅ Removido fallback para empresa matriz

### 2. `src/services/auth.ts`
- ✅ Removido import de `MATRIZ_CNPJ`
- ✅ `loginSupabase()` define `defaultCompany = null` se não houver empresas
- ✅ `validateMockLogin()` define `defaultCompany = null` (não mais MATRIZ_CNPJ)

### 3. `src/components/DashboardOverview.tsx`
- ✅ Removido import de `MATRIZ_CNPJ`
- ✅ `companiesToLoad` agora é array vazio se não houver empresas selecionadas
- ✅ Adicionado tratamento para mostrar "Nenhuma empresa selecionada"

### 4. `src/components/ModernTransactionsTable.tsx`
- ✅ Removido import de `MATRIZ_CNPJ`
- ✅ `companiesToLoad` agora é array vazio se não houver empresas selecionadas
- ✅ Adicionado tratamento para não carregar dados se não houver empresas

### 5. `src/components/ReportsPage.tsx`
- ✅ Removido import de `MATRIZ_CNPJ`
- ✅ `selectedCompanies` agora é array vazio por padrão

### 6. `src/components/DREFullModal.tsx`
- ✅ Removido import de `MATRIZ_CNPJ`
- ✅ Agora recebe `cnpj` como prop (não mais usa MATRIZ_CNPJ diretamente)
- ✅ Verifica se `cnpj` existe antes de carregar dados

### 7. `src/components/DREMonthlyTable.tsx`
- ✅ Removido import de `MATRIZ_CNPJ`
- ✅ Agora recebe `cnpj` como prop
- ✅ Verifica se `cnpj` existe antes de carregar dados

### 8. `src/components/ReportFilters.tsx`
- ✅ Removido import de `MATRIZ_CNPJ`
- ✅ Removido fallback para MATRIZ_CNPJ na seleção de empresa

### 9. `src/App.tsx`
- ✅ Removidos todos os fallbacks com CNPJ hardcoded `'26888098000159'`
- ✅ Componentes agora recebem `undefined` se não houver empresa selecionada
- ✅ Componentes verificam se há empresas antes de renderizar dados

### 10. `src/components/AnaliticoDashboard.tsx`
- ✅ Removido fallback para `'26888098000159'`
- ✅ `selectedCompany` agora pode ser `undefined`
- ✅ `loadCompanyData()` e `loadConsolidatedData()` verificam se há empresas antes de carregar

### 11. `src/components/ModernCashflowChart.tsx`
- ✅ Removido fallback para `'26888098000159'`
- ✅ `companiesToLoad` agora é array vazio se não houver empresas
- ✅ Adicionado tratamento para não carregar dados se não houver empresas

### 12. `src/components/RevenueDistributionGauge.tsx`
- ✅ Removido valor padrão `'26888098000159'`
- ✅ Verifica se `cnpj` existe antes de carregar dados

### 13. `src/components/NoticiasPage.tsx`
- ✅ Removido valor padrão `'26888098000159'`
- ✅ Verifica se `cnpj` existe antes de carregar dados

### 14. `src/hooks/useFinancialData.ts`
- ✅ Removido valor padrão `['26888098000159']`
- ✅ Agora aceita array vazio por padrão
- ✅ Retorna zeros se não houver empresas selecionadas

### 15. `src/components/VolpeLoginModal.tsx`
- ✅ Removido valor padrão `'26888098000159'`
- ✅ `selectedCompany` agora inicia como string vazia

### 16. `src/components/CompanyGroupSelector.tsx`
- ✅ Removido badge "Matriz" hardcoded para CNPJ específico

### 17. `src/components/ModernTopbar.tsx`
- ✅ Removido valor padrão `'26888098000159'`
- ✅ `selectedCompany` agora é opcional

### 18. `src/components/FinancialReportsPage.tsx`
- ✅ Removido valor padrão com empresa Volpe Matriz
- ✅ `empresas` agora é array vazio por padrão

## Variáveis de Ambiente

### `.env.production`
**Ação necessária:** Remover a linha `VITE_CNPJ_MATRIZ=26888098000159`

**Estado atual:**
```
VITE_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_CNPJ_MATRIZ=26888098000159   # ⚠️ REMOVER ESTA LINHA
VITE_USE_DEMO=false
VITE_ENABLE_ADMIN=false
```

**Estado desejado:**
```
VITE_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_USE_DEMO=false
VITE_ENABLE_ADMIN=false
```

## Arquivos que Ainda Contêm Referências (Não Críticos)

Estes arquivos contêm referências ao CNPJ, mas não são críticos para o funcionamento:

1. `src/services/supabaseRest.ts.backup` - Arquivo de backup (não usado)
2. `src/services/excelImport.ts` - Importação de Excel (pode conter referências em dados de exemplo)
3. `src/components/UserManagementTab.tsx` - Dados mockados de exemplo (não afeta produção)

## Comportamento Esperado

### Cenário 1: Usuário com Empresas Associadas
1. Usuário faz login
2. Sistema busca empresas via `user_companies`
3. Empresas são carregadas e selecionadas automaticamente
4. Componentes mostram dados das empresas selecionadas
5. ✅ **Funciona normalmente**

### Cenário 2: Usuário sem Empresas Associadas
1. Usuário faz login
2. Sistema busca empresas via `user_companies`
3. Nenhuma empresa encontrada
4. `selectedCompanies = []`
5. Componentes mostram:
   - "Nenhuma empresa selecionada"
   - "Selecione empresas para visualizar dados"
   - Dados zerados ou vazios
6. ✅ **Não mostra dados de empresa padrão**

### Cenário 3: Usuário Não Autenticado
1. Usuário não está logado
2. `getCompanies()` retorna array vazio
3. `selectedCompanies = []`
4. Componentes mostram estado vazio
5. ✅ **Não mostra dados de empresa padrão**

## Benefícios Alcançados

1. ✅ **Multi-tenant correto**: Cada usuário vê apenas suas empresas
2. ✅ **Sem dados vazados**: Usuários sem empresas não acessam dados de outros
3. ✅ **Código limpo**: Sem hardcoded de CNPJ específico
4. ✅ **Escalável**: Funciona para qualquer cliente, não só Volpe
5. ✅ **Conforme regras**: Alinhado com `.cursorrules` do projeto

## Próximos Passos

1. ✅ **Removido `VITE_CNPJ_MATRIZ` do `.env.production`** - Concluído
2. ✅ Build testado e funcionando - Concluído
3. ⏳ Deploy no VPS
4. ⏳ Testar com usuário `alceu@angra.io` para verificar funcionamento

## Testes Recomendados

1. Login com usuário que tem empresas associadas
2. Login com usuário sem empresas associadas
3. Verificar que não há dados sendo mostrados sem empresas selecionadas
4. Verificar que componentes mostram mensagens apropriadas quando não há empresas

