## Objetivo
Criar um botão/aba “NOC” no dashboard para monitoramento em tempo real do sistema: saúde das APIs, filas (WhatsApp), uso de LLM, bancos, integrações ERP (F360/Omie), e dados por empresa/grupo. Incluir alertas, ações rápidas e trilhas de auditoria.

## Escopo Funcional
- **Painéis em tempo real**: métricas (latência, taxa de erro, throughput) por serviço/endpoint/empresa.
- **Status de integrações**: F360/Omie, Supabase, WhatsApp, LLM (provendo “UP/DEGRADED/DOWN”).
- **Filas e jobs**: envios WhatsApp, sincronizações ERP, jobs de consolidação.
- **Sessões e concorrência**: usuários ativos por empresa, sessões simultâneas, taxa de login/erro.
- **Alertas e ações**: thresholds configuráveis, notificações (email/WhatsApp), botões de pausar, reprocessar, alternar fonte de dados.
- **Auditoria & NOC logs**: registros de incidentes, ações, resoluções.

## Arquitetura Técnica
- **Coleta**:
  - Logs e métricas em Supabase (`api_usage`, `app_logs`, `jobs`, `sessions`), integrados a coletores (Apidog/OpenAPI, hooks nos serviços).
  - Health-check endpoints para serviços externos (F360/Omie/LLM/WhatsApp).
- **Agregação**:
  - Workers que agregam métricas por janela (1m/5m/1h) e empresa; armazenam em `metrics_agg`.
- **Streaming**:
  - SSE/WebSocket para atualizar a UI do NOC em tempo real (canal por empresa/grupo e global).
- **UI**:
  - Next.js/React com Tremor/Recharts para gráficos em tempo real; shadcn/ui para tabelas e modais.
- **Alertas**:
  - Módulo de regras: latência média > X, erros > Y%, fila WhatsApp > Z, saúde LLM = DOWN.
  - Notification service (email/WhatsApp) e badges em tempo real.

## Dados e Esquema (Supabase)
- `api_usage`: endpoint, method, status, latency_ms, company_cnpj, user_id, timestamp.
- `service_health`: service_name, status (UP|DEGRADED|DOWN), details, company_cnpj|null, checked_at.
- `queue_whatsapp`: message_id, company_cnpj, status (queued|sent|failed), attempts, created_at, updated_at.
- `jobs`: job_type, company_cnpj, status (running|success|failed), started_at, finished_at, error.
- `noc_alerts`: alert_id, rule_id, severity, target (service/company), state (open|ack|closed), opened_at, closed_at.
- `noc_actions`: action_id, alert_id|null, actor, action (pause_queue|reprocess|switch_source|notify), payload, created_at.
- `sessions`: user_id, company_cnpj, started_at, last_seen_at, ip, ua.
- `metrics_agg`: window (1m/5m/1h), company_cnpj, endpoint, p50/p95 latency, error_rate, count.

## UI • Componentes NOC
- **Header**: filtros (empresa/grupo, serviço, janela), botão global “NOC”.
- **Cards KPI**:
  - Latência p95 global e por endpoint
  - Taxa de erro (HTTP 4xx/5xx)
  - Throughput (req/min)
  - Fila WhatsApp (pendentes/falhas)
  - Saúde LLM (UP/DEGRADED/DOWN)
- **Gráficos**:
  - Time series de latência/erros/throughput
  - Heatmap por endpoint
- **Tabelas**:
  - Alertas ativos e históricos; ações tomadas
  - Jobs em execução/histórico
  - Sessões por empresa
- **Ações rápidas**:
  - Pausar fila WhatsApp (empresa)
  - Reprocessar job (empresa/tipo)
  - Alternar fonte de dados (Mock/Supabase) para mitigação
  - Notificar grupo (email/WhatsApp)
- **Auditoria**:
  - Modal com trilha de incidentes, timeline e responsáveis

## Regras e Alertas (exemplos)
- Latência p95 > 1200ms (DEGRADED), > 2000ms (DOWN).
- Error rate > 5% (DEGRADED), > 10% (DOWN).
- Fila WhatsApp pendente > 100 (DEGRADED), > 500 (DOWN).
- Health check LLM = DOWN → alerta crítico.

## Segurança e Multi-tenant
- RLS: todas as tabelas filtradas por `company_cnpj` (ou nulas para global).
- Roles: admin (global), franqueado (grupo/empresas), cliente (sua empresa). Ações NOC restritas a admin/franqueado.
- Segredos de integrações (LLM/WhatsApp) servidos apenas em backend.

## Integrações
- **Apidog/OpenAPI**: coletar métricas de chamadas e gerar dashboards de endpoints.
- **WhatsApp**: APIs de envio e status; fila e retries.
- **LLM**: health-check e seleção de modelo (rápido/poderoso).
- **ERP**: F360/Omie health-check e contagens de sincronização.

## Botão NOC (UX)
- Sempre visível na NavBar; badge de estado (verde/amarelo/vermelho) resumindo saúde.
- Ao abrir:
  - Visão resumida + drill-down por serviço/empresa.
  - Ações rápidas em cada painel.

## Plano de Entrega
1. Esquemas e RLS no Supabase.
2. Coletores e jobs de agregação (metrics_agg, service_health).
3. API streaming (SSE/WebSocket). 
4. UI NOC MVP: KPIs, gráficos, alertas e ações rápidas.
5. Integrações (WhatsApp/LLM/Apidog) e health checks.
6. Testes de carga/alerta e documentação de operação.

## Testes e Evidências
- Simular erro/latência e fila grande; verificar alertas, badges e ações.
- Provar multi-tenant: ver apenas dados da empresa quando cliente.
- Prints e métricas coletadas; logs de ações NOC.

## Dependências
- Supabase (PostgREST, RLS), Next.js/React, Tremor/Recharts, shadcn/ui, SSE/WebSocket.
- Serviços externos: WhatsApp provider, LLM provider(s), Apidog.

## Próximo Passo
Após confirmação, inicio implementação de esquemas, coletores e UI NOC integrando com métricas existentes, e preparo relatório de evidências com cenários de falha e recuperação.