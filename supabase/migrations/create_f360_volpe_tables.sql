-- Migration: Criar tabelas para importação F360 Grupo Volpe e área de relatórios
-- Data: 2025-01-XX

-- Tabela para entradas de DRE (Demonstração do Resultado do Exercício)
CREATE TABLE IF NOT EXISTS dre_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_cnpj TEXT NOT NULL,
  date DATE NOT NULL,
  account TEXT NOT NULL,
  account_code TEXT,
  natureza TEXT, -- 'receita', 'despesa', 'custo', etc
  valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
  description TEXT,
  source_erp TEXT DEFAULT 'F360',
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_dre_entry UNIQUE (company_cnpj, date, account, natureza)
);

-- Tabela para entradas de DFC (Demonstração de Fluxo de Caixa)
CREATE TABLE IF NOT EXISTS dfc_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_cnpj TEXT NOT NULL,
  date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('in', 'out')),
  category TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  bank_account TEXT,
  description TEXT,
  source_erp TEXT DEFAULT 'F360',
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_dfc_entry UNIQUE (company_cnpj, date, kind, category, bank_account)
);

-- Tabela para contas bancárias
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_cnpj TEXT NOT NULL,
  f360_account_id TEXT,
  nome TEXT NOT NULL,
  tipo_conta TEXT, -- 'Conta Corrente', 'Poupança', etc
  banco_numero INTEGER,
  agencia TEXT,
  conta TEXT,
  digito_conta TEXT,
  saldo_atual NUMERIC(15, 2) DEFAULT 0,
  saldo_data DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_bank_account UNIQUE (company_cnpj, f360_account_id)
);

-- Tabela para transações bancárias
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_cnpj TEXT NOT NULL,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')),
  balance_after NUMERIC(15, 2),
  reference TEXT,
  source TEXT DEFAULT 'F360',
  source_id TEXT,
  reconciled BOOLEAN DEFAULT false,
  reconciliation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para itens de conciliação bancária
CREATE TABLE IF NOT EXISTS reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_cnpj TEXT NOT NULL,
  bank_transaction_id UUID REFERENCES bank_transactions(id) ON DELETE CASCADE,
  accounting_entry_id UUID REFERENCES accounting_entries(id) ON DELETE SET NULL,
  match_type TEXT CHECK (match_type IN ('auto', 'manual', 'pending')),
  match_confidence NUMERIC(3, 2), -- 0.00 a 1.00
  amount_diff NUMERIC(15, 2) DEFAULT 0,
  date_diff INTEGER, -- diferença em dias
  status TEXT CHECK (status IN ('matched', 'unmatched', 'divergent', 'pending')) DEFAULT 'pending',
  notes TEXT,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_dre_entries_company_date 
  ON dre_entries(company_cnpj, date DESC);

CREATE INDEX IF NOT EXISTS idx_dre_entries_account 
  ON dre_entries(account);

CREATE INDEX IF NOT EXISTS idx_dfc_entries_company_date 
  ON dfc_entries(company_cnpj, date DESC);

CREATE INDEX IF NOT EXISTS idx_dfc_entries_kind_category 
  ON dfc_entries(kind, category);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company 
  ON bank_accounts(company_cnpj);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_company_date 
  ON bank_transactions(company_cnpj, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account 
  ON bank_transactions(bank_account_id);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled 
  ON bank_transactions(reconciled) WHERE reconciled = false;

CREATE INDEX IF NOT EXISTS idx_reconciliation_items_company 
  ON reconciliation_items(company_cnpj);

CREATE INDEX IF NOT EXISTS idx_reconciliation_items_status 
  ON reconciliation_items(status);

-- Funções para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_dre_entries_updated_at
  BEFORE UPDATE ON dre_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dfc_entries_updated_at
  BEFORE UPDATE ON dfc_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_items_updated_at
  BEFORE UPDATE ON reconciliation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE dre_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfc_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permitir acesso autenticado)
CREATE POLICY "Allow authenticated read dre_entries" ON dre_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read dfc_entries" ON dfc_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read bank_accounts" ON bank_accounts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read bank_transactions" ON bank_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read reconciliation_items" ON reconciliation_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- Comentários nas tabelas
COMMENT ON TABLE dre_entries IS 'Entradas de DRE importadas do F360';
COMMENT ON TABLE dfc_entries IS 'Entradas de DFC (fluxo de caixa) importadas do F360';
COMMENT ON TABLE bank_accounts IS 'Contas bancárias cadastradas no F360';
COMMENT ON TABLE bank_transactions IS 'Transações bancárias importadas do F360';
COMMENT ON TABLE reconciliation_items IS 'Itens de conciliação bancária';

