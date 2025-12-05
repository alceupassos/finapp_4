-- Script de Validação de Importação F360
-- Execute após importação para verificar integridade dos dados

-- 1. Verificar distribuição de receitas vs despesas (DRE)
SELECT 
  'DRE' as tabela,
  natureza,
  COUNT(*) as total_registros,
  SUM(valor) as valor_total,
  ROUND(AVG(valor), 2) as valor_medio
FROM dre_entries
WHERE company_cnpj LIKE '26888098%'
GROUP BY natureza
ORDER BY natureza;

-- 2. Verificar distribuição de entradas vs saídas (DFC)
SELECT 
  'DFC' as tabela,
  kind,
  COUNT(*) as total_registros,
  SUM(amount) as valor_total,
  ROUND(AVG(amount), 2) as valor_medio
FROM dfc_entries
WHERE company_cnpj LIKE '26888098%'
GROUP BY kind
ORDER BY kind;

-- 3. Verificar dados por empresa
SELECT 
  c.cnpj,
  c.nome_fantasia,
  (SELECT COUNT(*) FROM dre_entries WHERE company_cnpj = c.cnpj) as dre_count,
  (SELECT COUNT(*) FROM dfc_entries WHERE company_cnpj = c.cnpj) as dfc_count,
  (SELECT SUM(valor) FROM dre_entries WHERE company_cnpj = c.cnpj AND natureza = 'receita') as total_receitas,
  (SELECT SUM(valor) FROM dre_entries WHERE company_cnpj = c.cnpj AND natureza = 'despesa') as total_despesas
FROM companies c
WHERE c.cnpj LIKE '26888098%'
ORDER BY c.cnpj;

-- 4. Verificar distribuição por mês (2025)
SELECT 
  EXTRACT(YEAR FROM date) as ano,
  EXTRACT(MONTH FROM date) as mes,
  natureza,
  COUNT(*) as total,
  SUM(valor) as valor_total
FROM dre_entries
WHERE company_cnpj LIKE '26888098%'
  AND EXTRACT(YEAR FROM date) = 2025
GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), natureza
ORDER BY ano DESC, mes DESC, natureza;

-- 5. Verificar registros sem natureza (problema de classificação)
SELECT 
  COUNT(*) as total_sem_natureza,
  COUNT(DISTINCT account) as contas_afetadas
FROM dre_entries
WHERE company_cnpj LIKE '26888098%'
  AND (natureza IS NULL OR natureza = '');

-- 6. Verificar registros DFC sem kind
SELECT 
  COUNT(*) as total_sem_kind,
  COUNT(DISTINCT category) as categorias_afetadas
FROM dfc_entries
WHERE company_cnpj LIKE '26888098%'
  AND (kind IS NULL OR kind = '');

-- 7. Verificar duplicatas (devem ser zero devido ao ON CONFLICT)
SELECT 
  company_cnpj,
  date,
  account,
  natureza,
  COUNT(*) as duplicatas
FROM dre_entries
WHERE company_cnpj LIKE '26888098%'
GROUP BY company_cnpj, date, account, natureza
HAVING COUNT(*) > 1;

-- 8. Verificar duplicatas DFC
SELECT 
  company_cnpj,
  date,
  kind,
  category,
  COALESCE(bank_account, '') as bank_account,
  COUNT(*) as duplicatas
FROM dfc_entries
WHERE company_cnpj LIKE '26888098%'
GROUP BY company_cnpj, date, kind, category, COALESCE(bank_account, '')
HAVING COUNT(*) > 1;

-- 9. Estatísticas gerais
SELECT 
  'Total DRE' as metrica,
  COUNT(*)::text as valor
FROM dre_entries
WHERE company_cnpj LIKE '26888098%'
UNION ALL
SELECT 
  'Total DFC',
  COUNT(*)::text
FROM dfc_entries
WHERE company_cnpj LIKE '26888098%'
UNION ALL
SELECT 
  'Receitas DRE',
  SUM(valor)::text
FROM dre_entries
WHERE company_cnpj LIKE '26888098%' AND natureza = 'receita'
UNION ALL
SELECT 
  'Despesas DRE',
  SUM(valor)::text
FROM dre_entries
WHERE company_cnpj LIKE '26888098%' AND natureza = 'despesa'
UNION ALL
SELECT 
  'Entradas DFC',
  SUM(amount)::text
FROM dfc_entries
WHERE company_cnpj LIKE '26888098%' AND kind = 'in'
UNION ALL
SELECT 
  'Saídas DFC',
  SUM(amount)::text
FROM dfc_entries
WHERE company_cnpj LIKE '26888098%' AND kind = 'out';

