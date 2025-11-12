## Objetivo
- Elevar a área "Analíticos Dashboard" com visualizações avançadas e densas para DRE/DFC sem perder legibilidade.
- Criar uma área completa de "Gerenciamento • Logs" para observabilidade (UI, API, Edge Functions), com filtros e gráficos.

## Stack e Princípios
- Manter Recharts/@tremor/react como base; adicionar ECharts apenas para Sankey/Heatmap se necessário.
- Tema e tokens existentes (Tailwind) em `tailwind.config.js` e `src/index.css`.

## Analíticos • Gráficos (DRE/DFC)
- Waterfall (DRE): decompõe resultado operacional (receita→deduções→custos→lucro). Implementar com Recharts (`ComposedChart` ou waterfall custom com `BarChart`).
- Treemap (DRE): composição por contas/categorias (tamanho=valor). Recharts `Treemap`.
- Sankey (DFC): fluxos de entrada/saída e origem/destino (Clientes, Fornecedores, Folha, Tributos). Usar Recharts `Sankey`; caso limitação, usar `echarts-for-react`.
- Heatmap de caixa (DFC): mês×dia/hora para padrões de liquidez. Preferir ECharts `Heatmap` para performance; paleta alinhada ao tema.
- Small multiples (sparklines): série de mini linhas/áreas por KPI (12 meses), usando Recharts + `ResponsiveContainer` em grid.
- Interações: tooltips concisos, legenda responsiva, modo agrupado/individual (flags de empresas) e alternância MoM/YoY.
- Tabs/Seções: manter `Mapa`, `DRE`, `DFC` e adicionar "Visões Avançadas" (Waterfall, Treemap, Sankey, Heatmap).

## Dados e Estado
- Usar `SupabaseRest` (já criado) para `integration_f360`, `dre_entries`, `cashflow_entries`.
- Estado global (React) com `selectedCompanies[]` e `grouped` aplicados nas queries.
- Default: GRUPO VOLPE; coerência por CNPJ; consolidado somando empresas e exibindo agregados.

## Gerenciamento • Logs
- Página nova "Gerenciamento > Logs":
  - Tabela com filtros: período, nível (info/warn/error), serviço (UI/API/Edge), empresa/usuário.
  - Gráficos:
    - Série temporal por nível (stacked area).
    - Top endpoints (bar horizontal).
    - Latência por endpoint (boxplot/histograma).
    - Mapa de logins por cidade (se houver geodados futuramente).
- Coleta de logs (frontend): util `logger` que envia para Supabase `app_logs` via PostgREST (campos: ts, level, context, userId, companyCnpj, service, message, metadata).
- Edge/Backend: preparar função de ingestão/stream para logs de integrações (F360/Omie) e scheduler (2x/dia e "Atualizar agora").
- Configuração: seletor de nível de logs e redaction de dados sensíveis.

## Segurança e RBAC
- Exposição somente de `anon` no cliente; `service_role` restrito a Edge Functions.
- Perfis de acesso: cliente/franqueado/personalizado/admin controlam visibilidade da aba de Logs e escopos.

## Entregáveis por Etapas
- Etapa 1 (UI):
  - Adicionar abas "Visões Avançadas" em `AnaliticosModal` com Waterfall, Treemap, Sankey, Heatmap.
  - Ajustes de tooltips/legendas e densidade visual.
- Etapa 2 (Dados):
  - Conectar Supabase nas telas Analíticos (DRE/DFC) com filtros por empresa e agrupamento.
  - Consolidar Grupo Volpe e checar coerência cruzada (DRE×DFC).
- Etapa 3 (Logs):
  - Criar página "Gerenciamento • Logs" com tabela e gráficos; util `logger` e persistência em `app_logs`.
  - Botão "Atualizar agora" para sync incremental; cron 2x/dia.

## Critérios de Sucesso
- Grupo Volpe carregado (todas empresas) com DRE/DFC consolidadas e coerentes.
- Visualizações avançadas legíveis e responsivas, com 60fps nas interações.
- Página de Logs com consultas por período/nível e gráficos úteis para operações.

## Próximos Passos
- Confirmar se preferimos Recharts-only (Sankey disponível) ou incluir ECharts para Heatmap e Sankey.
- Autorizar uso das credenciais (env) para ligar as queries reais nas telas Analíticos e Logs.