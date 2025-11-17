# 🗄️ Proposta de Schema Multi-Tenant para Supabase

## 📋 Estrutura Atual (Grupo Volpe)

### Limitações:
- ❌ Plano de contas fixo (PlanoDeContas.xlsx único)
- ❌ Centro de custos fixo (CentroDeCustos.xlsx único)
- ❌ Não suporta múltiplos grupos empresariais
- ❌ Não rastreia origem dos dados (qual plano/centro foi usado)

---

## 🎯 Nova Estrutura Multi-Tenant

### 1. Tabela: `corporate_groups` (Grupos Empresariais)

```sql
CREATE TABLE corporate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemplo:
INSERT INTO corporate_groups (name, slug) VALUES
  ('Grupo Volpe', 'grupo-volpe'),
  ('Grupo XYZ', 'grupo-xyz');
```

### 2. Tabela: `companies` (Empresas)

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_group_id UUID REFERENCES corporate_groups(id),
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_matriz BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_cnpj ON companies(cnpj);
CREATE INDEX idx_companies_group ON companies(corporate_group_id);
```

### 3. Tabela: `chart_of_accounts` (Planos de Contas)

```sql
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_group_id UUID REFERENCES corporate_groups(id),
  code VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  category TEXT, -- Receitas Operacionais, Despesas, etc
  dre_group TEXT,
  dfc_group TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(corporate_group_id, code)
);

CREATE INDEX idx_coa_group ON chart_of_accounts(corporate_group_id);
CREATE INDEX idx_coa_code ON chart_of_accounts(code);
```

### 4. Tabela: `cost_centers` (Centros de Custo)

```sql
CREATE TABLE cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_group_id UUID REFERENCES corporate_groups(id),
  code VARCHAR(20),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(corporate_group_id, name)
);

CREATE INDEX idx_cc_group ON cost_centers(corporate_group_id);
```

### 5. Tabela: `dre_entries` (Atualizada)

```sql
-- Adicionar colunas
ALTER TABLE dre_entries 
  ADD COLUMN company_id UUID REFERENCES companies(id),
  ADD COLUMN corporate_group_id UUID REFERENCES corporate_groups(id),
  ADD COLUMN account_code VARCHAR(20),
  ADD COLUMN cost_center_id UUID REFERENCES cost_centers(id),
  ADD COLUMN dre_category TEXT; -- Receitas Operacionais, CMV, etc

CREATE INDEX idx_dre_company ON dre_entries(company_id);
CREATE INDEX idx_dre_group ON dre_entries(corporate_group_id);
CREATE INDEX idx_dre_date ON dre_entries(date);
CREATE INDEX idx_dre_category ON dre_entries(dre_category);
```

### 6. Tabela: `cashflow_entries` (Atualizada)

```sql
-- Adicionar colunas
ALTER TABLE cashflow_entries 
  ADD COLUMN company_id UUID REFERENCES companies(id),
  ADD COLUMN corporate_group_id UUID REFERENCES corporate_groups(id),
  ADD COLUMN dfc_category TEXT; -- Categoria do DFC

CREATE INDEX idx_dfc_company ON cashflow_entries(company_id);
CREATE INDEX idx_dfc_group ON cashflow_entries(corporate_group_id);
CREATE INDEX idx_dfc_date ON cashflow_entries(date);
```

### 7. Tabela: `f360_integrations` (Configurações F360)

```sql
CREATE TABLE f360_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) UNIQUE,
  f360_token TEXT NOT NULL,
  webhook_url TEXT,
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_f360_company ON f360_integrations(company_id);
```

---

## 🔄 Migração de Dados Existentes

### Script de Migração:

```javascript
// 1. Criar grupo Volpe
const grupoVolpe = await supabase
  .from('corporate_groups')
  .insert({ name: 'Grupo Volpe', slug: 'grupo-volpe' })
  .select()
  .single()

// 2. Importar empresas
const empresas = loadEmpresas('empresas.csv')
for (const emp of empresas) {
  await supabase.from('companies').insert({
    corporate_group_id: grupoVolpe.id,
    cnpj: emp.cnpj,
    name: emp.nome,
    is_matriz: emp.cnpj.endsWith('0159')
  })
}

// 3. Importar plano de contas
const planContas = loadPlanContas('PlanoDeContas.xlsx')
for (const [code, name] of Object.entries(planContas)) {
  const { dreGroup, dfcGroup } = categorizarConta(name, code)
  await supabase.from('chart_of_accounts').insert({
    corporate_group_id: grupoVolpe.id,
    code,
    name,
    dre_group: dreGroup,
    dfc_group: dfcGroup
  })
}

// 4. Importar centros de custo
const centroCustos = loadCentroCustos('CentroDeCustos.xlsx')
for (const name of Object.keys(centroCustos)) {
  await supabase.from('cost_centers').insert({
    corporate_group_id: grupoVolpe.id,
    name
  })
}

// 5. Atualizar dre_entries existentes
const companies = await supabase.from('companies').select('*')
for (const company of companies) {
  await supabase
    .from('dre_entries')
    .update({
      company_id: company.id,
      corporate_group_id: grupoVolpe.id
    })
    .eq('company_cnpj', company.cnpj)
}
```

---

## 📊 Benefícios da Nova Estrutura

### ✅ Multi-Tenant Real
- Suporta múltiplos grupos empresariais
- Cada grupo tem seu próprio plano de contas
- Cada grupo tem seus centros de custo

### ✅ Rastreabilidade
- Sabe qual plano foi usado para cada lançamento
- Histórico de mudanças
- Auditoria completa

### ✅ Escalabilidade
- Adicionar novos grupos sem impactar existentes
- Planos de contas independentes
- Facilita white-label

### ✅ Performance
- Índices otimizados
- Queries mais eficientes com foreign keys
- Agregações por grupo/empresa

### ✅ Manutenção
- Centraliza regras de negócio
- Facilita atualizações de plano
- Versionamento de contas

---

## 🔐 Row Level Security (RLS)

```sql
-- Exemplo de policy para multi-tenant
CREATE POLICY "Users can only see their group's data"
  ON dre_entries
  FOR SELECT
  USING (
    corporate_group_id IN (
      SELECT corporate_group_id 
      FROM user_groups 
      WHERE user_id = auth.uid()
    )
  );
```

---

## 📝 Queries Exemplo

### Consolidado por Grupo:
```sql
SELECT 
  cg.name as grupo,
  c.name as empresa,
  SUM(CASE WHEN nature = 'receita' THEN amount ELSE 0 END) as receitas,
  SUM(CASE WHEN nature = 'despesa' THEN amount ELSE 0 END) as despesas
FROM dre_entries de
JOIN companies c ON de.company_id = c.id
JOIN corporate_groups cg ON c.corporate_group_id = cg.id
WHERE date >= '2025-01-01' AND date < '2025-02-01'
GROUP BY cg.name, c.name;
```

### Por Categoria DRE:
```sql
SELECT 
  dre_category,
  SUM(amount) as total
FROM dre_entries
WHERE corporate_group_id = 'grupo-volpe-uuid'
  AND date >= '2025-01-01'
GROUP BY dre_category
ORDER BY total DESC;
```

---

## 🚀 Próximos Passos

1. **Criar tabelas novas** no Supabase
2. **Rodar script de migração** para dados existentes
3. **Atualizar ETL** (`processar_grupo_volpe.mjs`) para usar novo schema
4. **Atualizar frontend** para usar relações corretas
5. **Implementar RLS** para segurança multi-tenant
6. **Testar** com grupo Volpe
7. **Adicionar novo grupo** de teste (empresa não-Volpe)

---

**Versão:** 1.0  
**Data:** 17/11/2024  
**Status:** Proposta - Aguardando Aprovação
