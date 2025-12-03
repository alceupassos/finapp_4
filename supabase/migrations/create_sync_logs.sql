-- Tabela para logs de sincronização diária
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  companies_processed INTEGER NOT NULL DEFAULT 0,
  companies_valid INTEGER NOT NULL DEFAULT 0,
  companies_invalid INTEGER NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para consultas por data
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_date ON sync_logs(sync_date DESC);

-- RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON sync_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role write" ON sync_logs
  FOR INSERT USING (true);

