## Objetivos
- Corrigir sobreposição da Sidebar e harmonizar fundo com gradiente/pattern leve.
- Reacender contraste dos gráficos, espaços e tipografia do Dashboard.
- Criar novas páginas: Contas a Pagar/Receber, Oráculo de IA Executivo, Notícias/Concorrentes/Tendências, Login, Dados Profundos (DRE/DFC) com mapa 12 meses.
- Seleção/agrupamento de empresas com flags, default GRUPO VOLPE.
- Integrar Supabase (db.md) e ERPs F360/Omie (volpe.md e avant/erp), com RAG e Edge Functions.
- Adotar execução com MCP para PostgREST/HTTP e conectores, mantendo qualidade e segurança.

## Diagnóstico (referências)
- Sidebar: `src/components/ModernSidebar.tsx` com `w-72` fixa e `z-50`, sobrepondo conteúdo (`App.tsx:21` usa `ml-64`).
- Topbar: `src/components/ModernTopbar.tsx` está `sticky z-40` — mantém hierarquia.
- Dashboard/Charts: `src/components/ModernCashflowChart.tsx` (Recharts) e `src/components/DashboardOverview.tsx` (@tremor/react) — tons escuros.
- Avant: `/avant` contém integração detalhada (`INDEX_INTEGRACAO_F360.md`, `ROTEIRO_INTEGRACAO_F360.md`, auditorias Omie) e tokens (`volpe.md`), Supabase (`db.md`).

## UI/UX Refinamentos
- Sidebar
  - Ajustar largura (`w-64`), `z-index` e `ml` coerentes; usar `grid`/`flex` wrapper para evitar sobreposição.
  - Inserir gradiente sutil e pattern discreto (CSS layered gradient/mask) e hover com micro-motions em ícones (Framer Motion + `tailwindcss-animate`).
  - Colapsável com breakpoint (sm/md), badges e breadcrumbs.
- Fundo e Pattern
  - Em `App` e `index.css`, padronizar `bg-gradient-to-br` com `charcoal/graphite/gold` e overlay `mask-image: radial-gradient(...)` para textura leve.
  - Utilitário `.pattern-soft` para aplicar onde há grandes áreas escuras.
- Gráficos
  - Recharts/Tremor: clarear gridlines, labels e barras/áreas com paleta semântica (`success/warning/info`) e opacidade; tooltips legíveis.
  - Adicionar modo comparativo (YoY/MoM) e pequenos deltas; reduzir espaçamento e fonte para densidade informativa.

## Novas Páginas e Seções
- Rotas com `react-router-dom`:
  - `APAR` (Contas a Pagar/Receber): tabelas com filtros, status, anexos; cartões de indicadores.
  - `Oráculo de IA (Executivo)`: prompt rápido, respostas concisas, atalhos de tarefas (classificar lançamento, reconciliação, previsão), sempre citando fontes (Supabase/ERP).
  - `Notícias` (abas): Grupo/Empresas selecionadas, Concorrentes (Brasil), Tendências (nacional/global); ordenação decrescente por data; título, 2 linhas resumo (LLM jornalismo), polaridade (positiva/negativa), fonte e link.
  - `Login/Selecionador de LLMs`: auth visual condizente, escolha de provedores e modelos para tarefas (classificação, narrativa, previsão, busca web).
  - `Dados Profundos (DRE/DFC)`: KPIs + modal com mapa 12 meses (tabela hierárquica expansível), gráficos interativos; agregador/seletor de empresas e agrupamento.
  - `Configurações/Admin`: RBAC, API_KEYS LLMs e serviços (APIDOG, etc.), painel de tráfego/telemetria, redes, acessos, cidades, mapa de logins.

## Seleção/Agrupamento de Empresas
- Estado global (React Query + Zustand) com `selectedCompanies[]` e flag `grouped=true/false`.
- Default: cliente GRUPO VOLPE (de `avant/volpe.md`).
- Seletor no Topbar/Sidebar; aplica filtros em todas páginas (queries parametrizadas).

## Supabase (db.md) e RAG
- Client: usar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (do `db.md`).
- Edge Functions:
  - `scheduled-sync-erp`: cron 2x/dia; incremental via botão “Atualizar agora”.
  - `seed-realistic-data`: popular dados iniciais (se necessário).
- RAG:
  - Tabelas vetoriais (pgvector) para documentos financeiros e notícias; upsert 2x/dia.
  - Consulta contextual por empresa/grupo; sempre citar fontes.

## Integração ERP (F360/Omie) com MCP
- F360
  - Token: `avant/volpe.md` (`223b065a-1873-4cfe-a36b-f092c602a03e`).
  - Mapear endpoints (INDEX/ROTEIRO F360), normalizar para tabelas `integration_f360`, `dre_entries`, `cashflow_entries`.
- Omie
  - App Keys no `avant/erp/DADOS_REAIS_E_SIMULADORES.md`; endpoints JSON; rate limits.
- MCP
  - PostgREST (MCP Postgrest): leituras/escritas tipadas em Supabase.
  - Playwright/HTTP (MCP) para validações de flows quando necessário.
  - Docker (MCP) opcional para sandbox de jobs ETL.

## Segurança e Acessos
- RBAC: tipos de usuário — cliente, franqueado, personalizado, admin.
- Auditoria e redaction; criptografia de colunas sensíveis; variáveis seguras (service_role só em server-side).

## Entregáveis por Fase
- Fase 2 (1–2 semanas)
  - Corrigir Sidebar e fundo/pattern; recontraste de gráficos; micro-motions.
  - Introduzir roteamento, criar páginas AP/AR, Oráculo IA (mínimo viável), Dados Profundos (modal 12 meses protótipo).
  - Seletor/agrupamento de empresas com default GRUPO VOLPE.
- Fase 3 (2–4 semanas)
  - Integração Supabase (queries, React Query), Edge Functions de sync e botão incremental.
  - Conectores F360/Omie com MCP, mapeamento de tabelas (dre/cashflow/integration_*).
  - Notícias/Concorrentes/Tendências com busca web e RAG (pgvector) 2x/dia.
  - Login/LLM selector; RBAC básico.

## Critérios de Sucesso
- Sidebar não sobrepõe conteúdo; gradiente/pattern discreto e responsivo.
- Gráficos legíveis no dark mode, densos e informativos.
- Páginas executivas úteis com Oráculo IA e notícias confiáveis.
- Integrações Supabase/ERP estáveis com atualização programada e incremental.

## Próximos Passos
- Confirmar tons e intensidade do pattern/gradiente.
- Validar páginas prioritárias e campos principais de AP/AR.
- Autorizar uso das credenciais do `db.md` e tokens do `volpe.md` para iniciar integrações (server-side).