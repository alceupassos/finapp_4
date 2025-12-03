# REGRAS IMUTÁVEIS DO PROJETO

> **IMPORTANTE**: Este arquivo contém regras fundamentais que NÃO devem ser alteradas sem consenso da equipe. Estas regras garantem a consistência e manutenibilidade do projeto.

---

## 🔐 REGRAS DE TOKENS E CREDENCIAIS

### 1. Tokens F360 NUNCA vão no `.env.local`

**REGRA CRÍTICA**: Tokens de integração F360 são específicos por empresa/grupo e devem ser armazenados **APENAS** na tabela `companies.token_f360` do banco de dados.

**O que vai no `.env.local`**:
- ✅ `VITE_SUPABASE_URL` - URL do projeto Supabase
- ✅ `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço do Supabase (apenas para scripts)
- ✅ `VITE_ENABLE_ADMIN` - Flag de habilitação de admin

**O que NÃO vai no `.env.local`**:
- ❌ `F360_TOKEN` - Token F360 de empresa específica
- ❌ `F360_CNPJ` - CNPJ de empresa específica
- ❌ `F360_WEBHOOK_*` - URLs de webhook F360
- ❌ `VOLPE_TOKEN_*` - Tokens específicos do grupo Volpe

**Motivo**: Tokens F360 variam por empresa. Se colocados no `.env.local`, só funcionariam para uma empresa. No banco, cada empresa tem seu próprio token.

**Como usar tokens F360**:
```typescript
// ✅ CORRETO: Buscar token do banco
const { data: company } = await supabase
  .from('companies')
  .select('token_f360')
  .eq('cnpj', cnpj)
  .single()

const token = company?.token_f360

// ❌ ERRADO: Usar token do .env
const token = process.env.F360_TOKEN // NUNCA FAZER ISSO
```

---

## 👥 REGRAS DE ASSOCIAÇÃO USUÁRIO-EMPRESA

### 2. Empresas são associadas via `user_companies`

**REGRA**: A tabela `user_companies` é a única fonte de verdade para determinar quais empresas um usuário pode acessar.

**Estrutura**:
```sql
CREATE TABLE user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- ID do usuário do Supabase Auth
  company_cnpj TEXT NOT NULL,  -- CNPJ da empresa (sem formatação)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Como funciona**:
1. Usuário faz login → obtém `user_id` do Supabase Auth
2. Sistema busca em `user_companies` todas as empresas associadas ao `user_id`
3. Selector de empresas mostra apenas as empresas encontradas

**NUNCA**:
- ❌ Filtrar empresas por token F360 no código
- ❌ Assumir que todas as empresas estão disponíveis para todos os usuários
- ❌ Usar `companies.client_id` para determinar acesso do usuário

**SEMPRE**:
- ✅ Usar `user_companies` para determinar acesso
- ✅ Verificar `user_id` do usuário logado antes de buscar empresas
- ✅ Associar empresas ao usuário correto ao criar/importar empresas

---

## 🏗️ ESTRUTURA DE TABELAS PRINCIPAIS

### 3. Tabela `companies` - Estrutura Base

**Campos obrigatórios**:
- `id` (UUID) - Identificador único
- `cnpj` (TEXT) - CNPJ sem formatação (14 dígitos)
- `razao_social` (TEXT) - Razão social da empresa
- `token_f360` (TEXT, nullable) - Token F360 da empresa (se tiver integração F360)
- `erp_type` (TEXT) - Tipo de ERP: 'F360', 'OMIE', ou 'BOTH'
- `active` (BOOLEAN) - Se empresa está ativa

**Campos importantes**:
- `client_id` (UUID) - Referência ao grupo empresarial em `clients`
- `is_group` (BOOLEAN) - Se é um grupo (true) ou empresa individual (false)
- `group_token` (TEXT) - Token F360 do grupo (para grupos)
- `parent_company_id` (UUID) - ID da empresa pai (para empresas filhas)

**Regras**:
- CNPJ deve ser único (constraint UNIQUE)
- Token F360 deve ser armazenado aqui, não no `.env`
- Empresas do mesmo grupo compartilham `client_id`

### 4. Tabela `clients` - Grupos Empresariais

**Estrutura**:
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT,  -- Nome do grupo (ex: "Grupo Volpe")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Uso**: Agrupa empresas relacionadas (ex: 13 empresas Volpe)

### 5. Tabelas de Dados Financeiros

**DRE**: `dre_entries`
- `company_cnpj` - CNPJ da empresa
- `date` - Data da entrada
- `account` - Nome da conta
- `valor` - Valor monetário
- `natureza` - 'receita' ou 'despesa'

**DFC**: `dfc_entries`
- `company_cnpj` - CNPJ da empresa
- `date` - Data da entrada
- `kind` - 'in' (entrada) ou 'out' (saída)
- `category` - Categoria do fluxo
- `amount` - Valor monetário

**Bancos**: `bank_accounts` e `bank_transactions`
- Sempre incluir `company_cnpj` para filtragem
- Usar `company_id` para foreign keys

---

## 🔄 FLUXO DE AUTENTICAÇÃO E AUTORIZAÇÃO

### 6. Fluxo de Login e Acesso

**Passo a passo**:
1. Usuário faz login via Supabase Auth
2. Sistema obtém `user_id` da sessão
3. Busca empresas em `user_companies` WHERE `user_id = ?`
4. Mostra apenas empresas encontradas no selector
5. Ao selecionar empresa, busca dados usando `company_cnpj`

**Código de referência** (`src/services/supabaseRest.ts`):
```typescript
getCompanies: async () => {
  const session = getSession()
  if (session?.id) {
    // Buscar CNPJs do usuário
    const userCnpjs = await getUserCompanies(session.id)
    
    // Buscar detalhes de cada empresa
    const companiesList = []
    for (const cnpj of userCnpjs) {
      const company = await getCompanyDetails(cnpj)
      companiesList.push(company)
    }
    return companiesList
  }
  return []
}
```

**NUNCA**:
- ❌ Assumir que usuário tem acesso a todas as empresas
- ❌ Ignorar `user_companies` e buscar todas as empresas
- ❌ Usar tokens do `.env` para determinar acesso

---

## 📊 REGRAS DE IMPORTAÇÃO DE DADOS

### 7. Importação de Empresas

**Ao importar empresas**:
1. ✅ Criar/atualizar registro em `companies`
2. ✅ Associar ao `client_id` correto (grupo empresarial)
3. ✅ Salvar `token_f360` na tabela `companies`
4. ✅ Criar registro em `user_companies` para usuário correto
5. ❌ NUNCA salvar token no `.env.local`

**Scripts de referência**:
- `scripts/fix_volpe_companies.mjs` - Exemplo de correção de associações
- `scripts/import_volpe_excel.mjs` - Exemplo de importação com associação

### 8. Importação de Dados Financeiros

**Ao importar DRE/DFC/Bancos**:
1. ✅ Sempre incluir `company_cnpj` (sem formatação, 14 dígitos)
2. ✅ Incluir `company_id` (UUID) para foreign keys
3. ✅ Usar `upsert` com `onConflict` apropriado
4. ✅ Validar e corrigir dados antes de inserir
5. ✅ Nunca pular dados - sempre tentar corrigir

**Exemplo de upsert**:
```typescript
await supabase
  .from('dre_entries')
  .upsert(entries, { 
    onConflict: 'company_cnpj,date,account,natureza' 
  })
```

---

## 🚫 ANTI-PADRÕES (NUNCA FAZER)

### 9. Erros Comuns a Evitar

1. **❌ Colocar tokens F360 no `.env.local`**
   - Motivo: Tokens são por empresa, não globais
   - Solução: Usar `companies.token_f360`

2. **❌ Assumir que todas as empresas estão disponíveis**
   - Motivo: Acesso é controlado por `user_companies`
   - Solução: Sempre buscar empresas do usuário logado

3. **❌ Usar `client_id` para determinar acesso do usuário**
   - Motivo: `client_id` agrupa empresas, não controla acesso
   - Solução: Usar `user_companies`

4. **❌ Pular dados inválidos durante importação**
   - Motivo: Perda de dados
   - Solução: Sempre tentar corrigir e importar

5. **❌ Criar empresas sem associar ao usuário**
   - Motivo: Empresas não aparecerão no selector
   - Solução: Sempre criar registro em `user_companies`

---

## 📝 MANUTENÇÃO DESTE ARQUIVO

**Quando atualizar**:
- Adicionar nova regra crítica descoberta
- Documentar padrão que foi violado e causou problema
- Atualizar exemplos de código se estrutura mudar

**NÃO atualizar**:
- Regras fundamentais (tokens, associações)
- Estrutura de tabelas principais (sem migração)
- Fluxo de autenticação (sem mudança de arquitetura)

---

## 🔗 REFERÊNCIAS

- **Tabelas principais**: Ver `supabase/migrations/`
- **Código de referência**: `src/services/supabaseRest.ts`
- **Scripts de exemplo**: `scripts/fix_volpe_companies.mjs`, `scripts/import_volpe_excel.mjs`
- **Documentação Supabase**: Ver `.cursorrules` seção "ARQUITETURA"

---

**Última atualização**: 2025-01-XX
**Versão**: 1.0

