-- Adicionar constraints UNIQUE para evitar duplicações em dre_entries e cashflow_entries

-- Verificar e criar constraint para dre_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_dre_entry'
  ) THEN
    ALTER TABLE dre_entries 
    ADD CONSTRAINT unique_dre_entry 
    UNIQUE (company_cnpj, date, account);
    
    CREATE UNIQUE INDEX IF NOT EXISTS ux_dre_entries_unique 
    ON dre_entries(company_cnpj, date, account);
  END IF;
END $$;

-- Verificar e criar constraint para cashflow_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_cashflow_entry'
  ) THEN
    ALTER TABLE cashflow_entries 
    ADD CONSTRAINT unique_cashflow_entry 
    UNIQUE (company_cnpj, date, kind, category);
    
    CREATE UNIQUE INDEX IF NOT EXISTS ux_cashflow_entries_unique 
    ON cashflow_entries(company_cnpj, date, kind, category);
  END IF;
END $$;

