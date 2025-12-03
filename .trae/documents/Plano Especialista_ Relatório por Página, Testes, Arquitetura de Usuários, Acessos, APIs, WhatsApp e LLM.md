## Relatório por Página e Matriz de Testes
- **Objetivo**: confirmar que todas as páginas carregam dados **reais** após login, com badge correto (Real/Demo/Erro) e sem caminhos mock inadvertidos.
- **Páginas**: Login, Dashboard Overview, DRE, DFC, Tabelas (lançamentos, títulos), Configurações.
- **Checklist por página**:
  - Fonte de dados utilizada (Supabase vs Mock)
  - CNPJ ativo aplicado
  - Consultas (endpoints, filtros, cabeçalhos Authorization)
  - Badge exibido (Real/Demo/Erro)
- **Matriz de testes**:
  - Cenários: Login real, Login demo, Sem login, Erro Supabase
  - Evidências: respostas HTTP (200/401/404), prints de UI, dumps de requests
  - Critérios de sucesso: todos os componentes usam **Supabase** quando Real; Demo somente quando selecionado; Erro não cai em mock silencioso

## Arquitetura de Usuários e Acessos
- **Modelos**:
  - `users`: id, nome, email, role (admin|franqueado|cliente), status
  - `companies`: id, cnpj, nome, grupo_id
  - `groups`: id, nome, descrição
  - `user_company_roles`: user_id, company_id, role (viewer|editor|owner)
  - `group_members`: user_id, group_id, role
  - `feature_toggles`: company_id|group_id|user_id, chave, valor
- **Fluxos**:
  - Criação/Edição de usuários (admin)
  - Vincular usuário → empresa(s) e/ou grupo(s)
  - Atribuir direitos por escopo (empresa/grupo)
- **Tenancy**: filtros por `company_id/cnpj` em todas as consultas; RLS no banco

## Árvore de Diretórios (Módulos principais)
```
src/
  modules/
    auth/
      pages/Login.tsx
      hooks/useAuth.ts
      services/auth.service.ts
    users/
      pages/UsersList.tsx
      pages/UserEdit.tsx
      components/UserForm.tsx
      services/users.service.ts
    access/
      pages/AccessMatrix.tsx
      components/CompanyAccessEditor.tsx
      components/GroupAccessEditor.tsx
      services/access.service.ts
    companies/
      pages/CompanyList.tsx
      pages/CompanyEdit.tsx
      services/companies.service.ts
    groups/
      pages/GroupList.tsx
      pages/GroupEdit.tsx
      services/groups.service.ts
    dashboard/
      pages/Overview.tsx
      components/KpiCards.tsx
      components/Charts.tsx
      hooks/useDre.ts
      hooks/useDfc.ts
    toggles/
      pages/Toggles.tsx
      components/ToggleSwitch.tsx
      services/toggles.service.ts
    messaging/
      pages/WhatsAppConfig.tsx
      components/TemplateEditor.tsx
      services/whatsapp.service.ts
    llm/
      pages/LLMSettings.tsx
      components/LLMSelector.tsx
      components/RightPaneChat.tsx
      services/llm.service.ts
    apis/
      pages/ApiUsageDashboard.tsx
      components/ApiUsageChart.tsx
      services/api-usage.service.ts
  ui/
    components/DataBadge.tsx
    components/CompanySelector.tsx
    components/NavBar.tsx
    design/tokens.ts
```

## Menu e Direitos de Acesso
- **NavBar**:
  - Usuários, Empresas, Grupos, Acessos
  - Dashboard, DRE, DFC, Tabelas
  - Configurações: Toggles, WhatsApp, LLM, APIs
- **AccessMatrix**:
  - Tabela por usuário × empresa (viewer|editor|owner)
  - Edição inline com validação
  - Import/Export CSV para operações em massa

## Dashboard de Uso de APIs
- **Métricas**: chamadas por endpoint, latência, sucesso/erro, por empresa/usuário
- **Fontes**: logs Supabase, Apidog/OpenAPI collectors
- **Charts**: Recharts/Tremor; filtros por período/empresa
- **Alertas**: thresholds e notificações (email/WhatsApp) se taxa de erro > X

## Toggles e Botões de Liga/Desliga
- **Feature toggles** por empresa/usuário/grupo:
  - Fonte de dados (Mock/Supabase)
  - WhatsApp ativo
  - Chat LLM (direita/streaming)
  - Relatórios avançados para franqueado
- **UI**: ToggleSwitch com persistência em `feature_toggles`

## WhatsApp (Mensageria)
- **Config**: token, número, templates
- **Envio**: fila assíncrona; estados (queued|sent|failed)
- **Compliance**: opt-in/opt-out; auditoria
- **Botão**: ligar/desligar por empresa

## LLM: Seleção de Modelo e Chat
- **Modelos**: rápido (WhatsApp/respostas curtas) vs poderoso (relatórios profundos)
- **UI**:
  - Selector (GPT/Claude/Local)
  - Chat streaming na direita (habilitado para “cliente” quando permitido)
  - Ícone IA com estrelas no NavBar quando habilitado
- **Contexto**: seleção por empresa/usuário; tokens guardados server-side

## Logs, Concorrência e Governança
- **Logs**:
  - app_logs: usuário, empresa, ação, status, detalhes
  - api_usage: endpoint, latência, resultado
- **Concorrência**:
  - Sessões simultâneas por empresa; rate limit por usuário
- **Atualizações**:
  - Jobs diários para sincronizações e validações de dados
- **RLS e privacidade**:
  - Filtrar por empresa; mascarar PII; segredos no servidor

## Testes e Evidências
- **Passos**:
  - Login real/demo; selecionar empresa; alternar toggles
  - Capturar prints: badge, dados em cada página, API dashboard
  - Logs de requests e contagens Supabase (DRE/DFC)
- **Resultados**: anexo por página e cenário

## Entregáveis
- Código com contexto de fonte, seletor de empresa, badge e hooks unificados
- Relatório por página e matriz de testes com evidências
- Dashboard de uso de APIs, toggles, WhatsApp e LLM configuráveis
