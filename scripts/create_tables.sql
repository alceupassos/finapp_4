-- Criar tabela de plano de contas
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  account_type VARCHAR(50),
  parent_code VARCHAR(50),
  level INTEGER,
  is_analytical BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chart_code ON chart_of_accounts(code);

-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
  id BIGSERIAL PRIMARY KEY,
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  is_holding BOOLEAN DEFAULT false,
  parent_cnpj VARCHAR(14),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Políticas para chart_of_accounts
DROP POLICY IF EXISTS "auth_read_chart" ON chart_of_accounts;
CREATE POLICY "auth_read_chart" ON chart_of_accounts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_chart" ON chart_of_accounts;
CREATE POLICY "anon_read_chart" ON chart_of_accounts FOR SELECT TO anon USING (true);

-- Políticas para companies
DROP POLICY IF EXISTS "auth_read_companies" ON companies;
CREATE POLICY "auth_read_companies" ON companies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_companies" ON companies;
CREATE POLICY "anon_read_companies" ON companies FOR SELECT TO anon USING (true);
