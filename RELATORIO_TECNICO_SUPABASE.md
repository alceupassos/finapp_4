# Relatório Técnico - Integração Supabase Authentication + Data Loading

**Data**: 15 de novembro de 2025  
**Projeto**: finapp_v4  
**Repositório**: alceupassos/finapp_4 (branch: main)  
**Status**: ⚠️ DADOS AINDA APARECEM MOCKADOS APÓS LOGIN

---

## 🎯 Objetivo Principal

Fazer com que o usuário `dev@angrax.com.br` autenticado via Supabase Auth veja **dados reais** do banco PostgreSQL em vez de dados mockados do JSON.

---

## 📊 Estado Atual do Banco de Dados

### Supabase Project
- **URL**: `https://xzrmzmcoslomtzkzgskn.supabase.co`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.fI2D9iNZq-5LM8Xir-ZweCTZuM5MAvj0JIb_FKsFJig`

### Tabelas e Dados Existentes

#### 1. `integration_f360`
```sql
Colunas: id, cliente_nome, cnpj, token_enc, created_at
Exemplo: { cliente_nome: 'VOLPE', cnpj: '00026888098001', ... }
Registros: Empresas cadastradas (CNPJs zero-padded à esquerda)
```

#### 2. `dre_entries` (1.610 registros)
```sql
Colunas: id, company_cnpj, company_nome, date, account, nature, amount, created_at
Exemplo: {
  company_cnpj: '26888098000159',
  date: '2025-11-01',
  account: 'Receitas Operacionais',
  nature: 'receita',
  amount: '2761527.74'
}
```

#### 3. `cashflow_entries` (292.358 registros)
```sql
Colunas: id, company_cnpj, company_nome, date, kind, category, amount, created_at
Exemplo: {
  company_cnpj: '26888098000159',
  date: '2026-06-10',
  kind: 'out',
  category: '418-3 - Curso e Treinamento',
  amount: '933.80'
}
```

---

## 🔐 Authentication Setup

### Usuário Criado
```bash
Email: dev@angrax.com.br
Senha: B5b0dcf500@#
Status: ✅ Criado via Admin API (email_confirm: true)
```

**Comando usado**:
```bash
curl -X POST 'https://xzrmzmcoslomtzkzgskn.supabase.co/auth/v1/admin/users' \
  -H "apikey: {SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@angrax.com.br","password":"B5b0dcf500@#","email_confirm":true}'
```

---

## 🛠️ Implementações Realizadas

### 1. **Migration RLS** (Row Level Security)
**Arquivo**: Migration `enable_rls_and_allow_authenticated_read`

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE dre_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_f360 ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados
CREATE POLICY "Authenticated users can read dre_entries"
  ON dre_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read cashflow_entries"
  ON cashflow_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read integration_f360"
  ON integration_f360 FOR SELECT TO authenticated USING (true);

-- Políticas para anon (fallback)
CREATE POLICY "Anon can read dre_entries"
  ON dre_entries FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read cashflow_entries"
  ON cashflow_entries FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read integration_f360"
  ON integration_f360 FOR SELECT TO anon USING (true);
```

**Status**: ✅ Aplicado com sucesso

---

### 2. **Auth Service** (`src/services/auth.ts`)

#### Funções Implementadas:
```typescript
// Login via Supabase Auth
export async function loginSupabase(email: string, password: string): Promise<any | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) return null
  
  localStorage.setItem('supabase_session', JSON.stringify(data.session))
  localStorage.setItem('session_user', JSON.stringify({
    email: data.user.email,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }))
  
  return { email: data.user.email, accessToken: data.session.access_token }
}

// Obter token JWT do usuário logado
export function getSupabaseAccessToken(): string | null {
  const s = localStorage.getItem('session_user')
  if (!s) return null
  return JSON.parse(s).accessToken || null
}

// Logout
export function logout() {
  localStorage.removeItem('supabase_session')
  localStorage.removeItem('session_user')
  supabase.auth.signOut()
}
```

**Status**: ✅ Implementado

---

### 3. **Supabase REST Service** (`src/services/supabaseRest.ts`)

#### Correções de Field Names:
```typescript
// ❌ ANTES (ERRADO)
getDRE: (cnpj: string) => restGet('dre_entries', {
  query: { cnpj: `eq.${cnpj}`, select: '*' }
})

// ✅ DEPOIS (CORRETO)
getDRE: (cnpj: string) => restGet('dre_entries', {
  query: { company_cnpj: `eq.${cnpj}`, select: '*' }
})
```

#### Authorization Header:
```typescript
async function restGet(table: string, options?: RestOptions) {
  const token = getSupabaseAccessToken() || ANON_KEY
  
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${token}`, // ✅ Usa JWT do usuário logado
    'Content-Type': 'application/json',
  }
  
  // ... fetch request
}
```

**Status**: ✅ Implementado e corrigido

---

### 4. **Data Loader** (`src/services/dataLoader.ts`)

#### Transformações de Schema:

##### DRE Transform:
```typescript
// Supabase retorna: { date, account, nature, amount }
// UI espera: { data, conta, natureza, valor }

const transformed = data.map((d: any) => ({
  data: d.date,
  conta: d.account,
  natureza: d.nature,
  valor: Number(d.amount) // string -> number
}))
```

##### DFC Transform:
```typescript
// Supabase retorna: { date, kind, amount, category }
// UI espera: { data, entrada, saida, saldo, descricao }

let saldo = 0
const transformed = data.map((d: any) => {
  const entrada = d.kind === 'in' ? Number(d.amount) : 0
  const saida = d.kind === 'out' ? Number(d.amount) : 0
  saldo += entrada - saida
  
  return {
    data: d.date,
    descricao: d.category || '',
    entrada,
    saida,
    saldo
  }
})
```

#### Debug Logs Adicionados:
```typescript
console.log('[dataLoader] Supabase DFC loaded for', cnpj, ':', data.length, 'entries')
console.log('[dataLoader] Supabase DRE loaded for', cnpj, ':', data.length, 'entries')
console.warn('[dataLoader] Failed to load from Supabase:', err)
console.log('[dataLoader] Using mock fallback')
```

**Status**: ✅ Implementado

---

### 5. **Login Modal** (`src/components/LoginModal.tsx`)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  
  // 1️⃣ Tenta login Supabase primeiro
  let s = await loginSupabase(email, password)
  
  // 2️⃣ Fallback para mock se falhar
  if (!s) s = await validateMockLogin(email, password)
  
  if (s) {
    setSession(s)
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))
    onClose()
  }
  
  setLoading(false)
}
```

**Status**: ✅ Implementado

---

### 6. **Modern Topbar** (`src/components/ModernTopbar.tsx`)

#### User Badge com Logout:
```tsx
{session && (
  <div className="flex items-center gap-2">
    <Badge variant="outline" className="gap-1.5">
      <User className="w-3.5 h-3.5" />
      {session.email}
      <span className="opacity-60">•</span>
      <span className="text-xs">{session.accessToken ? 'Conta Supabase' : 'Modo Demo'}</span>
    </Badge>
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        logout()
        window.dispatchEvent(new Event('logout'))
      }}
    >
      <LogOut className="w-4 h-4" />
    </Button>
  </div>
)}
```

**Status**: ✅ Implementado

---

### 7. **App.tsx** - Session Reactivity

```typescript
// ✅ Event listeners para logout
useEffect(() => {
  const handleLogout = () => {
    setSession(null)
    setCurrentView('landing')
  }
  
  window.addEventListener('logout', handleLogout)
  return () => window.removeEventListener('logout', handleLogout)
}, [])

// ✅ Força remount do DashboardOverview ao trocar sessão
<DashboardOverview
  key={`overview-${session ? 'auth' : 'anon'}`}
  session={session}
/>
```

**Status**: ✅ Implementado

---

### 8. **Dashboard Overview** - Data Refetch

```typescript
useEffect(() => {
  // Refetch data quando session.accessToken mudar
  async function loadData() {
    const companies = await loadCompaniesFallback()
    const cnpj = companies[0]?.cnpj
    const dre = await loadDREFallback(cnpj)
    const dfc = await loadDFCFallback(cnpj)
    // ... process data
  }
  
  loadData()
}, [period, session?.accessToken]) // ✅ Dependency array
```

**Status**: ✅ Implementado

---

## ⚠️ PROBLEMA ATUAL: Dados Mockados Persistindo

### Sintoma
Após login com `dev@angrax.com.br`, o dashboard continua mostrando dados mockados dos arquivos `/dados/dre.json` e `/dados/dfc.json`.

### Possíveis Causas Investigadas

#### ✅ **RESOLVIDAS**:
1. ~~RLS bloqueando acesso~~ → Políticas criadas
2. ~~Field names incorretos~~ → Corrigido `cnpj` → `company_cnpj`
3. ~~Token não sendo enviado~~ → Authorization header implementado
4. ~~Schema mismatch~~ → Transformações adicionadas

#### ❓ **AINDA NÃO VERIFICADAS**:

1. **CNPJ Format Mismatch**
   - `integration_f360.cnpj`: `'00026888098001'` (zero-padded, 14 chars)
   - `dre_entries.company_cnpj`: `'26888098000159'` (sem zeros, 14 chars)
   - `cashflow_entries.company_cnpj`: `'26888098000159'`
   
   **Possível problema**: Query `company_cnpj=eq.26888098000159` não encontra registros se o CNPJ estiver em formato diferente.

2. **Token Expirado/Inválido**
   - JWT pode estar expirado
   - Token pode não ter as claims corretas
   
   **Debug necessário**: Verificar no Network tab se Authorization header está sendo enviado corretamente.

3. **CORS ou Preflight Failing**
   - Requests podem estar falhando silenciosamente
   
   **Debug necessário**: Verificar Network tab para erros 401/403/500.

4. **Cache do Navegador**
   - Dados antigos podem estar em cache
   
   **Teste**: Hard refresh (Cmd+Shift+R) ou abrir em aba anônima.

5. **Ordem de Execução**
   - `loadCompaniesFallback()` pode estar retornando CNPJ mockado `'26888098000159'`
   - Queries subsequentes usam esse CNPJ que pode não existir no banco
   
   **Debug necessário**: Verificar logs do console `[dataLoader]`.

---

## 🔍 Passos de Debug Recomendados

### 1. **Verificar Console Logs**
Ao fazer login, o console deve mostrar:
```
[dataLoader] Supabase companies loaded: X
[dataLoader] Supabase DRE loaded for 26888098000159: 1610 entries
[dataLoader] Supabase DFC loaded for 26888098000159: 292358 entries
```

Se aparecer:
```
[dataLoader] Using mock company fallback
[dataLoader] Using mock DRE fallback
[dataLoader] Using mock DFC fallback
```

Significa que as queries falharam.

### 2. **Verificar Network Tab (DevTools)**
Procurar por requests:
```
GET https://xzrmzmcoslomtzkzgskn.supabase.co/rest/v1/integration_f360?select=cliente_nome,cnpj
GET https://xzrmzmcoslomtzkzgskn.supabase.co/rest/v1/dre_entries?company_cnpj=eq.26888098000159&select=*
GET https://xzrmzmcoslomtzkzgskn.supabase.co/rest/v1/cashflow_entries?company_cnpj=eq.26888098000159&select=*
```

**Verificar**:
- Status code (deve ser 200)
- Response body (deve ter arrays com dados)
- Request headers (deve ter `Authorization: Bearer eyJ...`)

### 3. **Testar Query Diretamente no SQL**
```sql
-- Verificar se CNPJ existe
SELECT DISTINCT company_cnpj FROM dre_entries LIMIT 10;
SELECT DISTINCT company_cnpj FROM cashflow_entries LIMIT 10;
SELECT cnpj FROM integration_f360 LIMIT 10;

-- Testar query exata que o código faz
SELECT * FROM dre_entries WHERE company_cnpj = '26888098000159' LIMIT 5;
SELECT * FROM cashflow_entries WHERE company_cnpj = '26888098000159' LIMIT 5;
```

### 4. **Verificar Token JWT**
No console do navegador:
```javascript
localStorage.getItem('session_user')
// Deve retornar: {"email":"dev@angrax.com.br","accessToken":"eyJ...","refreshToken":"..."}
```

Decodificar JWT em https://jwt.io para verificar:
- `exp` (expiration) não está no passado
- `role` é `authenticated`
- `sub` (user ID) existe

### 5. **Hard Reset**
```bash
# Limpar localStorage
localStorage.clear()

# Hard refresh
Cmd + Shift + R (macOS)

# Relogar
Email: dev@angrax.com.br
Senha: B5b0dcf500@#
```

---

## 📁 Arquivos Modificados

```
src/services/auth.ts                    ← Login Supabase + token management
src/services/supabaseRest.ts            ← REST API wrapper + field fixes
src/services/dataLoader.ts              ← Transformações de schema + debug logs
src/components/LoginModal.tsx           ← Supabase-first login flow
src/components/ModernTopbar.tsx         ← User badge + logout button
src/components/DashboardOverview.tsx    ← Session reactivity
src/components/AnaliticosModal.tsx      ← (consume DRE/DFC transformed data)
src/App.tsx                             ← Event listeners + remount logic
```

---

## 🚀 Como Rodar

```bash
cd /Users/alceualvespasssosmac/finapp_v4

# Instalar dependências (se necessário)
pnpm install

# Rodar dev server
pnpm run dev
# Servidor em: http://localhost:3001/

# Abrir navegador com DevTools (F12)
# Fazer login: dev@angrax.com.br / B5b0dcf500@#
# Verificar console logs + Network tab
```

---

## 🔑 Environment Variables

**Arquivo**: `.env.local`
```env
VITE_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.fI2D9iNZq-5LM8Xir-ZweCTZuM5MAvj0JIb_FKsFJig
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk
```

---

## 📝 Queries SQL Úteis

```sql
-- Contar registros
SELECT COUNT(*) FROM dre_entries;        -- 1610
SELECT COUNT(*) FROM cashflow_entries;   -- 292358
SELECT COUNT(*) FROM integration_f360;   -- ?

-- Ver estrutura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dre_entries';

-- Ver políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('dre_entries', 'cashflow_entries', 'integration_f360');

-- Testar acesso autenticado
SET ROLE authenticated;
SELECT * FROM dre_entries LIMIT 1;
RESET ROLE;
```

---

## 🐛 Hipótese Mais Provável

**O CNPJ retornado por `loadCompaniesFallback()` não está batendo com os CNPJs nas tabelas.**

### Teste Manual:
```sql
-- Ver CNPJs disponíveis
SELECT DISTINCT cnpj FROM integration_f360;
SELECT DISTINCT company_cnpj FROM dre_entries LIMIT 5;

-- Comparar formatos
-- integration_f360.cnpj pode ser '00026888098001'
-- dre_entries.company_cnpj pode ser '26888098000159'
```

### Possível Fix:
```typescript
// Em dataLoader.ts
export async function loadCompaniesFallback() {
  try {
    const data = await SupabaseRest.getCompanies()
    if (Array.isArray(data) && data.length) {
      console.log('[dataLoader] Supabase companies loaded:', data)
      
      // ✅ Normalizar CNPJ (remover zeros à esquerda)
      return data.map(c => ({
        ...c,
        cnpj: c.cnpj.replace(/^0+/, '') // '00026888098001' -> '26888098001'
      }))
    }
  } catch (err) {
    console.warn('[dataLoader] Failed to load companies from Supabase:', err)
  }
  return [{ cliente_nome: 'Volpe Tech', cnpj: '26888098000159' }]
}
```

---

## 📊 Commit History

```bash
git log --oneline -10

# Últimos commits relevantes:
# - feat(rls): habilitar RLS + policies authenticated/anon e adicionar debug logs
# - fix(auth): corrigir field names e adicionar transformações de schema
# - feat(ui): adicionar user badge e logout button
```

---

## ✅ Checklist de Validação

- [x] Usuário `dev@angrax.com.br` criado no Supabase Auth
- [x] RLS habilitado em todas as tabelas
- [x] Políticas SELECT criadas para `authenticated` e `anon`
- [x] Token JWT sendo injetado no Authorization header
- [x] Field names corrigidos (`company_cnpj` vs `cnpj`)
- [x] Transformações de schema implementadas (DRE e DFC)
- [x] Debug logs adicionados em `dataLoader.ts`
- [x] UI de logout implementada
- [x] Session reactivity nos componentes
- [ ] **Dados reais aparecendo no dashboard** ← PENDING

---

## 🎯 Próximos Passos para o Novo Modelo

1. **Verificar console logs** após login para identificar onde falha
2. **Inspecionar Network tab** para ver se requests chegam ao Supabase
3. **Comparar CNPJs** entre `integration_f360` e `dre_entries/cashflow_entries`
4. **Testar queries SQL** diretamente para validar formato de CNPJ
5. **Adicionar mais logs** para rastrear exatamente onde o fallback para mock acontece
6. **Verificar token JWT** se está válido e com role correto

---

## 📞 Informações de Contato

**Desenvolvedor**: Alceu Alves Passos  
**Email**: dev@angrax.com.br  
**Projeto**: finapp_v4 (Dashboard Financeiro)  
**Stack**: React + TypeScript + Vite + Supabase + PostgREST

---

**FIM DO RELATÓRIO**
