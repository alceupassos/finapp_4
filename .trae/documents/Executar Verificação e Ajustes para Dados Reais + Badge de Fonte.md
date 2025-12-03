## Objetivo
Garantir que o login carregue dados reais (Supabase) em todas as páginas, eliminar dados mock onde indevido e validar o badge “Dados: Real/Demo/Erro”.

## Pesquisa (somente leitura)
- Localizar pontos de mock:
  - `public/dados/mock_users.json`
  - Componentes que importam `mock_*` ou fetch local
- Identificar provedores/funções de dados:
  - `src/services/auth.ts` (fluxo de login demo x real)
  - Client Supabase (`src/lib/supabase.ts` ou similar)
  - Páginas: Dashboard/DRE/DFC/tabelas (ver uso de Supabase x Mock)

## Ajustes (após aprovação)
1) Contexto global de fonte de dados
- Criar `DataSourceProvider` com estado:
  - `dataSource: 'supabase' | 'mock' | 'error'`
  - `companyCnpj: string`
  - `setDataSource`, `setCompanyCnpj`
- Definir por padrão `supabase` em produção; ler `?cnpj=` e `localStorage.active_company_cnpj`

2) UI de seleção de empresa
- Dropdown “Empresa” (carrega de `integration_f360` via Supabase)
- Salva CNPJ em `localStorage` e atualiza `companyCnpj` no contexto

3) Badge de fonte
- Componente `DataBadge`:
  - Real: verde (success)
  - Demo: azul (info)
  - Erro: vermelho (danger)

4) Unificação de consultas
- Hooks: `useDre(cnpj)`, `useDfc(cnpj)` que consultam Supabase por `company_cnpj`
- Remover/encapsular qualquer uso direto de mock em componentes
- Fallback controlado: se Supabase falhar, mostrar erro e sugerir alternar para Demo

5) Páginas
- Dashboard Overview, DRE/DFC pages: usar os hooks únicos
- Garantir que filtros/series dependem de `companyCnpj`

6) Telemetria opcional
- Corrigir POST `app_logs` (404): criar tabela `public.app_logs` ou ajustar endpoint; emitir logs no backend (Service Role), nunca no frontend

## Testes
- Login real (`admin@ifin.app` / `fin123`) + selecionar CNPJ (ex.: `02723552000153`)
  - Verificar que todas as páginas mostram dados Supabase; Badge = Real
- Login demo (`dev@angrax.com.br` / `fin-demo`)
  - Badge = Demo; alternar para Real via toggle e selecionar CNPJ
- Sem login
  - Comportamento padrão (pedir login ou Demo explícito)
- Erro Supabase
  - Badge = Erro; não cair em mock silencioso

## Entregáveis
- Código com contexto, seletor de empresa, hooks unificados e DataBadge
- Relatório de verificação por página (onde havia mock e como ficou)
- Matriz de testes com evidências (prints/descrições)

## Execução
- Após sua confirmação, aplico os ajustes no código, executo os testes e te entrego os relatórios e evidências.