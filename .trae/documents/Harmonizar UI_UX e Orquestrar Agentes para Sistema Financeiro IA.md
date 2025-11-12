## Objetivo
- Harmonizar visual, movimentos e usabilidade da aplicação, elevando a qualidade para padrão premium.
- Introduzir orquestração multiagentes especializada (BPO, Contábil, Fluxo de Caixa, Compliance, Insights) para gestão financeira com IA.
- Preservar o stack atual (React+Vite+TS+Tailwind+Radix+Framer Motion) e evoluir incrementalmente.

## Diagnóstico Atual
- Front: React 18 + Vite + TypeScript; Tailwind, Radix UI, padrões shadcn-like, Framer Motion, Recharts; uma SPA central em `src/App.tsx`.
- Sem back-end, auth, DB, i18n, testes; importação Excel existente.
- Design tokens e tema em `tailwind.config.js` e `src/index.css`; base de componentes em `src/components/ui/*`.

## Stack Proposta
- Front-end: manter React+Vite; acrescentar `react-router` para rotas e code-splitting; `@tanstack/react-query` para dados; `@tanstack/react-virtual` para listas.
- UI: continuar Radix + componentes `ui/*`; aproveitar `@tremor/react` (já instalado) para dashboards e KPIs avançados.
- Motion: padronizar micro-interações com Framer Motion (variantes, timings, spring/anticipation) e `tailwindcss-animate`.
- Back-end: Hono (HTTP) + Node (Edge-friendly) ou FastAPI (Python) para serviços; Postgres + Prisma; Redis para cache; fila com BullMQ.
- Orquestração IA: LangGraph (LangChain) para orquestração com agentes; OpenAI/Anthropic como LLM; embeddings (pgvector) para memória.
- E2E types: tRPC ou OpenAPI bem tipada; logging com Pino; métricas com OpenTelemetry.

## Arquitetura de Agentes (Multiagente)
- Agente Orquestrador: planeja, decompõe tarefas e roteia chamadas.
- Agente Contábil (DRE/DFC): consolidação, classificação e reconciliação (partidas dobradas).
- Agente Fluxo de Caixa: projeção, cenários, stress tests e alertas de liquidez.
- Agente Compliance/Risco: regras fiscais, conformidade, KYC/AML, políticas.
- Agente Insights/BI: storytelling financeiro, recomendações e explicabilidade.
- Agente UX/Assistente: guia o usuário no fluxo, cria playbooks.
- Barramento de eventos (Kafka/Redis Streams) para comunicação; memória vetorial de contexto por agente.

## Harmonização UI/UX
- Design System
  - Unificar tokens (cores, tipografia, espaçamentos, radii, sombras) em `tailwind.config.js` e `src/index.css`.
  - Escalas: 4/8/12; radii suaves; sombras subtis (glass/soft-neuromorphism) com contraste acessível.
  - Paleta: ampliar tema `graphite/charcoal/gold` com estados (hover/active/focus) e modo escuro/claro.
- Componentes
  - Normalizar `button`, `card`, `input`, `dropdown`, `select`, `tooltip`, `table` em `src/components/ui/*` para variações consistentes via `cva`.
  - Estados de carregamento/sucesso/erro padronizados; skeletons e placeholders elegantes.
- Layout
  - Introduzir roteamento; separar páginas: Dashboard, Lançamentos, DRE, DFC, Importação, Configurações.
  - Topbar/Sidebar modernos (`ModernTopbar.tsx`, `ModernSidebar.tsx`) com colapsar, breadcrumbs e busca global.
- Motion
  - Guia de animação: 120–220ms (UI), 300–450ms (transições); easing cúbica; spring leve.
  - Variantes reutilizáveis para fade/slide/stagger; foco em entradas, tooltips e feedbacks.
- Acessibilidade
  - Radix primitives; foco visível; contrastes; navegação por teclado; ARIA nos componentes.

## Visualização e Charts
- Recharts para gráficos custom; Tremor para blocos de dashboard (KPI, Bar, Line, Area, Donut).
- Tooltips com aggregação (média, soma, YOY); legendas responsivas; zoom/pan onde útil.
- Temas de gráficos alinhados aos tokens; formatos financeiros (`R$`, abreviação K/M, datas).

## Dados, Backend e Integradores
- Modelo financeiro: plano de contas, lançamentos, categorias, centros de custo, documentos; DRE/DFC derivadas.
- ETL/Conectores: Excel (já), CNAB, Open Banking, ERPs (Omie/ContaAzul/QuickBooks) via integradores.
- Auth: e-mail+senha e OAuth; RBAC (Admin/Analista/Viewer); auditoria de ações.

## IA Aplicada (BPO)
- Classificação automática de lançamentos (zero-shot + few-shot + regras).
- Reconciliação bancária assistida; explicações e trilhas de auditoria.
- Análise de anomalias e previsões de fluxo (Prophet/LSTM/Exponential Smoothing) com fallback estatístico.
- Geração de narrativas financeiras (relatórios gerenciais) com citações e fontes.

## Performance e Qualidade
- Code-splitting por rota; lazy components; Suspense + skeletons.
- React Query com caching, revalidação; otimização de tabelas com virtualização.
- ESLint + Prettier; testes unitários (Vitest) e e2e (Playwright).

## Segurança e Compliance
- Sanitização/validação com Zod; proteção contra XSS/CSRF; storage seguro.
- Criptografia em repouso (Postgres TDE/colunas sensíveis); logs com redaction.
- Trilhas de auditoria e retenção; LGPD: consentimento, direitos do titular, eliminação.

## Entregáveis por Fase
- Fase 1 (2–3 semanas):
  - Roteamento, estrutura de páginas e code-splitting.
  - Harmonização de `ui/*` e tokens; guia de motion; acessibilidade base.
  - Dashboard com Tremor+Recharts; import Excel refinado; skeletons.
- Fase 2 (3–5 semanas):
  - Back-end básico (Hono/Node), Postgres+Prisma, Auth RBAC.
  - React Query; tabelas virtualizadas; integradores iniciais (CNAB/ERP mock).
  - Primeiro agente (Classificação de lançamentos) em LangGraph; memória vetorial.
- Fase 3 (4–6 semanas):
  - Agentes Fluxo de Caixa, Compliance e Insights; orquestrador.
  - Previsão de caixa; reconciliação assistida; relatórios narrativos.
  - Testes e2e, métricas observabilidade, hardening segurança.

## Critérios de Sucesso
- UI coesa, responsiva e acessível; 60fps em transições.
- Dashboards claros, com insights acionáveis.
- Agentes entregam tarefas com explicabilidade e auditoria.
- Integração de dados robusta e segura; satisfação de usuários BPO.

## Próximos Passos
- Validar prioridades de páginas e KPIs do dashboard.
- Selecionar provedor LLM e infra de dados.
- Confirmar se avançamos com Tremor e React Router; iniciar Fase 1.