-- Tabela consolidada para DRE/DFC com agregações mensais
CREATE TABLE IF NOT EXISTS dre_dfc_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  account TEXT,
  category TEXT,
  dre_value NUMERIC(15, 2) DEFAULT 0,
  dfc_in NUMERIC(15, 2) DEFAULT 0,
  dfc_out NUMERIC(15, 2) DEFAULT 0,
  bank_account TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_summary UNIQUE (company_cnpj, period_year, period_month, account, category, bank_account)
);

-- Indexes para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_dre_dfc_summaries_company_period 
  ON dre_dfc_summaries(company_cnpj, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_dre_dfc_summaries_account 
  ON dre_dfc_summaries(account);

CREATE INDEX IF NOT EXISTS idx_dre_dfc_summaries_category 
  ON dre_dfc_summaries(category);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_dre_dfc_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_dre_dfc_summaries_timestamp
  BEFORE UPDATE ON dre_dfc_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_dre_dfc_summaries_updated_at();

-- Tabelas auxiliares para F360
CREATE TABLE IF NOT EXISTS f360_plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  plano_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  codigo TEXT,
  tipo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_plano UNIQUE (company_cnpj, plano_id)
);

CREATE TABLE IF NOT EXISTS f360_contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  conta_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT,
  banco INTEGER,
  agencia TEXT,
  conta TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_conta_bancaria UNIQUE (company_cnpj, conta_id)
);

-- Indexes para tabelas auxiliares
CREATE INDEX IF NOT EXISTS idx_f360_plano_contas_cnpj 
  ON f360_plano_contas(company_cnpj);

CREATE INDEX IF NOT EXISTS idx_f360_contas_bancarias_cnpj 
  ON f360_contas_bancarias(company_cnpj);

-- RLS (Row Level Security) - permitir acesso autenticado
ALTER TABLE dre_dfc_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE f360_plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE f360_contas_bancarias ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar conforme necessário)
CREATE POLICY "Allow authenticated read" ON dre_dfc_summaries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read" ON f360_plano_contas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read" ON f360_contas_bancarias
  FOR SELECT USING (auth.role() = 'authenticated');

