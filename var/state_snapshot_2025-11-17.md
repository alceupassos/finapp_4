# Snapshot • 2025-11-17

## Preview
- Local: http://127.0.0.1:4173/

## Ambiente
- VITE_SUPABASE_URL: https://xzrmzmcoslomtzkzgskn.supabase.co
- VITE_SUPABASE_ANON_KEY: configurado
- VITE_CNPJ_MATRIZ: 26888098000159

## Autenticação
- Fluxo: GoTrue REST
  - POST /auth/v1/token?grant_type=password
  - Fallback: POST /auth/v1/signin
- Mensagens de erro surfacem via `lastLoginError`

## Dados (Supabase REST)
- Empresas: `integration_f360` (filtrado pela matriz)
- DRE: `dre_entries` (company_cnpj=eq.26888098000159)
- DFC: `cashflow_entries` (company_cnpj=eq.26888098000159)
- Regras DFC:
  - Considera apenas status contendo "conciliado"
  - Remove entradas com status "baixado/baixados/renegociado/renegociados"
  - Valores e saldos exibidos como positivos

## UI/UX
- Matriz única fixa (26888098000159) em Dashboard/Relatórios/Extrato/Clientes
- DRE mensal (Jan–Dez) em Análises, agrupado por natureza/conta
- Extrato com seleção removida, exibindo apenas CNPJ da matriz

## Arquivos-chave
- src/services/supabaseRest.ts: define `MATRIZ_CNPJ` e filtra endpoints
- src/services/auth.ts: normaliza base, login com fallback
- src/components/DREMonthlyTable.tsx: pivot Jan–Dez para DRE
- src/components/AnalisesPage.tsx: inclui DREMonthlyTable
- src/components/DashboardOverview.tsx: KPIs/gráfico mensal da matriz
- src/components/ReportsPage.tsx: contagens reais da matriz
- src/components/ModernTransactionsTable.tsx: extrato filtrado e normalizado

## Pendências sugeridas
- Mapear PlanoDeContas.xlsx em grupos DRE para espelhar exatamente o Excel
- Diagnóstico visual de `.env` no overlay de login