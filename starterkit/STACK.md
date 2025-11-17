# FinApp Starter Kit — Stack e Convenções

## Objetivo
- Documentar o formato arquitetural e os padrões UI/UX usados no app, incluindo execução com MCP, integração de dados reais, scripts de desenvolvimento, estrutura de pastas e dependências base para replicação em novos projetos.

## Núcleo da Stack
- Runtime: Node 18+
- Build: Vite 7
- Linguagem: TypeScript (estrito, JSX `react-jsx`)
- UI: React 18
- Estilos: TailwindCSS 3 + `tailwindcss-animate`
- Ícones: `lucide-react`
- Motion: Framer Motion 12
- Charts: Recharts 3
- Dashboards: `@tremor/react` 3
- Formulários: `react-hook-form` + `zod` (validação opcional)
- Componentes base: Radix UI (`dropdown`, `select`, `tooltip`)

## Estrutura de Pastas
- `src/main.tsx`: bootstrap do app, habilita `BrowserRouter` e monta `<App />`
- `src/App.tsx`: layout raiz, topbar, sidebar, gating por sessão (overlay de login), navegação e páginas
- `src/components/`: componentes de UI (sidebar, topbar, cards, páginas)
  - `ModernTransactionsTable.tsx`: extrato com seleção de CNPJ e dados reais
  - `DashboardOverview.tsx`: KPIs e gráfico mensal com dados reais
  - `ReportsPage.tsx`: contagens de DRE/DFC/Clientes via Supabase
  - `ConciliacaoPage.tsx`: wrapper do extrato
  - `CustomersPage.tsx`: listagem de clientes reais
  - `SettingsModal.tsx`: configurações e IA embutida
- `src/services/`: camada de serviços
  - `supabaseRest.ts`: client REST com `Authorization: Bearer` (token da sessão)
  - `auth.ts`: login via GoTrue REST, persistência de sessão, utilitários
- `vite.config.ts`: chunking e otimizações
- `.env.local` (não versionado): credenciais e flags

## UI/UX — Padrões de Design
- Dark-first: superfícies `graphite-*`, bordas sutis, foco em contraste legível
- Neomorphic suave: cartões com borda e sombra discretas; hover com micro-interações
- Micro‑interações: `whileHover`, `whileTap`, transições curtas (200–300ms)
- Hierarquia visual: títulos (`Title`/`Metric`) + subtítulo (`Text`) + conteúdo
- Legibilidade financeira: valores com `toLocaleString('pt-BR', currency 'BRL')`
- Acessibilidade: estados de carregamento, vazio e erro visíveis
- Navegação: sidebar persistente + topbar com status e ações

## Fluxos de Dados e Autenticação
- Autenticação real via Supabase GoTrue REST
  - Endpoint: `POST {VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`
  - Headers: `Content-Type: application/json`, `apikey: {VITE_SUPABASE_ANON_KEY}`, `Accept: application/json`
  - Persistência: `localStorage.supabase_session` (token), `localStorage.session_user` (perfil simplificado)
  - Erros: `auth.ts` expõe `lastLoginError` para mensagens detalhadas na UI
- Consumo de dados via Supabase REST
  - Base: `{VITE_SUPABASE_URL}/rest/v1`
  - Headers: `apikey: {anon}`, `Authorization: Bearer {access_token}` quando logado
  - Endpoints usados:
    - `integration_f360?select=grupo_empresarial,cliente_nome,cnpj` (empresas/clientes)
    - `dre_entries?cnpj=eq.{cnpj}&select=*` (DRE)
    - `cashflow_entries?cnpj=eq.{cnpj}&select=*` (DFC/Extrato)
  - Seleção CNPJ: componentes com `<select>` sincronizam a empresa ativa

## Execução com MCP (Code Execution)
- Testes UI/fluxos: Playwright MCP
  - Gravação de cenários e geração de testes a partir do navegador
  - Útil para validar login real, seleção de CNPJ e rotas principais
- Integrações de dados/tabulares: Excel MCP
  - Leitura/escrita de planilhas para migrações e validações (ex.: F360)
- PostgREST MCP
  - Conversão SQL→REST e execução de requisições contra Supabase/PostgREST
- Docker MCP
  - Orquestração local de serviços auxiliares quando necessário (opcional)

## Scripts e Dev Loop
- `npm run dev`: servidor de desenvolvimento Vite
- `npm run build`: build de produção (TS + Vite)
- `npm run preview`: preview local do build
- Portas: preview padrão em `4173` (fallback para `4174` quando ocupado)

## Configuração do Vite (Chunking/Otimização)
- `chunkSizeWarningLimit: 1000`
- `manualChunks(id)` separa grandes dependências em chunks específicos:
  - `tremor`, `charts`, `supabase`, `motion`, `router`, `icons`, `date`, `state`, `table`, `ocr`, `xlsx`

## Variáveis de Ambiente (`.env.local`)
- `VITE_SUPABASE_URL=https://<project>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<anon_key>`
- `VITE_USE_DEMO=false`

## Dependências Base (Starter Kit)
- Produção
  - `react`, `react-dom`, `vite`, `@vitejs/plugin-react`
  - `tailwindcss`, `tailwindcss-animate`, `postcss`, `autoprefixer`
  - `lucide-react`, `framer-motion`, `@tremor/react`, `recharts`
  - `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-tooltip`
  - `react-hook-form`, `zod`
- Desenvolvimento
  - `typescript`, `@types/react`, `@types/react-dom`, `@types/node`

## Convenções de Código
- Componentes funcionais com `FC` implícita e props tipadas
- Sem `any`; use tipos `Tx`, `Company` e DTOs específicos
- Formatação de valores monetários via helpers (ex: `toLocaleString`)
- Evitar `console.log`; use camada `logger` para eventos relevantes
- Separar UI pura de hooks/serviços; evitar acoplamento forte

## Segurança e Privacidade
- Nunca versionar `.env.local`
- Tokens somente em `localStorage` (escopo cliente)
- Não expor credenciais em logs
- RLS no Supabase: habilitar políticas de leitura por usuário autenticado

## Padrão de Páginas e Interações
- Dashboard: agregações por período com gráfico mensal e KPIs
- Extrato de Lançamentos: tabela com Descrição/Data/Valor/Saldo, seletor de CNPJ e estados de carregamento
- Relatórios: painéis com contagens e seletor de empresa
- Clientes: listagem do endpoint `integration_f360`
- Configurações: modal com regras e IA embutida

## Passos de Instalação (Starter Kit)
- Clonar projeto e criar `.env.local` com `VITE_SUPABASE_*`
- `npm install`
- `npm run dev` para desenvolvimento
- `npm run build && npm run preview` para validação de produção local

## Roadmap de Expansão
- Conectar “Análises” e “Fluxo de Caixa” com agregações (por período e CNPJ)
- Centralizar filtro global de CNPJ e sincronizar entre páginas
- Testes E2E Playwright MCP para login, troca de empresa e navegação principal
- Telemetria e logs de UI com níveis e correlação por usuário/empresa