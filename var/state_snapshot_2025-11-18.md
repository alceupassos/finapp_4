# Snapshot • 2025-11-18

## Preview
- Local: http://127.0.0.1:4173/
- Status: ativo

## Ambiente (.env.local)
- VITE_SUPABASE_URL: https://xzrmzmcoslomtzkzgskn.supabase.co
- VITE_SUPABASE_ANON_KEY: configurado
- VITE_CNPJ_MATRIZ: 26888098000159
- VITE_USE_DEMO: false

## Autenticação
- Fluxo: GoTrue REST
  - POST /auth/v1/token?grant_type=password (base normalizada)
  - Fallback: POST /auth/v1/signin
- Erros exibidos pelo overlay via `lastLoginError`
- Sessão: `localStorage.supabase_session`, `localStorage.session_user`

## Dados (Supabase REST)
- Base REST: {VITE_SUPABASE_URL}/rest/v1
- Headers: `apikey`, `Authorization: Bearer <access_token>` quando logado
- Tabelas usadas:
  - `integration_f360` (empresas)
  - `dre_entries` (DRE)
  - `cashflow_entries` (DFC)
- Regras DFC em UI:
  - Considerar apenas status contendo “conciliado”
  - Remover ‘baixado/baixados/renegociado/renegociados’
  - Valores brutos e saldo sempre exibidos positivos

## Fallback de Importação (Excel)
- Serviço: `src/services/excelImport.ts`
  - `importMatrizFromExcel()` lê:
    - `public/dados/PlanoDeContas.xlsx` (mapa natureza por conta)
    - `public/dados/DREDFC_VOLPE.xlsx` (consolidado)
    - `public/dados/26888098000159.xlsx` (Matriz)
  - `importFromPath('/dados/26888098000159.xlsx')` para importação direta
  - Converte cabeçalhos de meses Jan–Dez, detecta ano, normaliza valores
- Integração em `AnaliticoDashboard`: usa Excel quando Supabase vazio e possui botões:
  - “Importar Matriz (Excel)” (consolidado)
  - “Importar 26888098000159.xlsx” (arquivo específico)

## Matriz Única
- CNPJ fixo: 26888098000159
- Remoção de seletores onde aplicável (Dashboard/Relatórios/Extrato/Clientes)
- Exibição do CNPJ no cabeçalho das páginas

## UI/UX
- Análises
  - Aba DRE com tabela mensal por conta e seletor de mês
  - Botão “Detalhe” abre modal DRE detalhado
  - Botão “DRE Completo” abre o mesmo modal forçando “Todos os meses”
- DRE Detalhe (`src/components/DREDetailModal.tsx`)
  - Fonte reduzida (`text-[11px]`)
  - Cabeçalho dos meses “MMM/AA” (ex.: Abr/25)
  - Agrupamento por grupo DRE com toggles “+/–”
  - Totais por grupo e total geral
- DRE Completo (`src/components/DREFullModal.tsx`)
  - Modal full-screen com pivot Jan–Dez, exportação XLSX
- Extrato (`ModernTransactionsTable`)
  - Filtra DFC pela regra, exibe valor bruto positivo, saldo positivo
- Dashboard (`DashboardOverview`)
  - KPIs Receita/Despesas/Lucro calculados com valores positivos, CNPJ fixo
- Relatórios (`ReportsPage`)
  - Contagens DRE/DFC e clientes com CNPJ fixo

## Navegação/Layout
- `BrowserRouter` habilitado em `src/main.tsx`
- Sidebar e Topbar clássicos ativos

## Código alterado recentemente
- `src/components/AnaliticoDashboard.tsx` (botões de importação, DRE Completo, fallback Excel)
- `src/components/DREDetailModal.tsx` (fonte/cabeçalhos/agrupamento)
- `src/components/DREFullModal.tsx` (pivot/export)
- `src/services/excelImport.ts` (importadores)
- `src/services/supabaseRest.ts` (CNPJ matriz, normalização)
- `src/services/auth.ts` (GoTrue REST e mensagens)
- `src/components/DREMonthlyTable.tsx` (botão DRE Completo no bloco)

## Known Issues
- Dependência de nomes/abas nas planilhas Excel pode variar; parser usa heurística de cabeçalhos de meses/ano.
- Chunk grande no bundle; manualChunks desativado para evitar conflitos de React.

## Próximos Passos sugeridos
- Persistir dados importados no Supabase (`dre_entries`/`cashflow_entries`) após importação
- Mapear PlanoDeContas para grupos/subgrupos com subtotais (Receita Líquida, Lucro Bruto, Resultado Operacional)
- Diagnóstico visual de `.env` no overlay de login
- Centralizar filtro global de período (Ano/Mês/Semana/Dia) com CNPJ fixo