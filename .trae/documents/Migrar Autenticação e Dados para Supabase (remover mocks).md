## Objetivo
- Remover todo uso de dados mockados, garantir logout consistente e operar exclusivamente com dados reais via Supabase.

## Escopo de Alterações
- Autenticação, sessão e logout.
- Consumo de dados (empresas, DRE, DFC, extrato/lançamentos).
- UI/UX: indicadores de status real, mensagens de erro e estados vazios.

## Autenticação (real)
- `src/services/auth.ts`
  - Remover `validateMockLogin` do fluxo padrão; manter apenas para ambiente explícito `VITE_USE_DEMO=true`.
  - Forçar login real (`loginSupabase`) e persistir `supabase_session` + `session_user`.
  - Expor `logout()` e `getSession()` centralizados.
- `src/components/LoginModal.tsx`
  - Remover fallback automático para mock; exibir erro se credenciais inválidas.
  - Mostrar alerta quando variáveis `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` não estiverem definidas.

## Logout Consistente
- `src/components/Sidebar.tsx` e `src/components/ModernSidebar.tsx`
  - Usar `logout()` do serviço e disparar `window.dispatchEvent(new CustomEvent('logout'))`.
  - Garantir limpeza de `localStorage` e redirecionar para tela inicial.
- `src/components/Topbar.tsx`
  - Adicionar botão/ação de sair usando o mesmo serviço.

## Supabase REST (dados reais)
- `src/services/supabaseRest.ts`
  - Usar `Authorization: Bearer <access_token>` quando houver sessão Supabase; `anon` como fallback controlado.
  - Endpoints:
    - Empresas: `integration_f360` (campos: `grupo_empresarial, cliente_nome, cnpj`).
    - DRE: `dre_entries` (filtros por `cnpj`).
    - DFC: `cashflow_entries` (filtros por `cnpj`).
- Políticas RLS (referência operacional, sem alterar código): garantir SELECT para usuários autenticados nas três tabelas.

## Remoção de Mocks
- Arquivo: `public/dados/mock_users.json`
  - Desativar uso por padrão; manter apenas quando `VITE_USE_DEMO=true`.
- Componentes que leem mocks:
  - Remover leituras diretas de JSON público.

## UI/UX e Terminologia
- Menu “Conciliação” → “Extrato de Lançamentos” (mantendo rota `/extrato-lancamentos`).
- Indicador “Dados reais” no Topbar:
  - Exibe OK/Verificando/Off e contagem de empresas quando disponível.
  - Botão “Atualizar” refaz chamada `SupabaseRest.getCompanies()`.
- Estados vazios e mensagens claras quando Supabase retornar 0 registros.

## Páginas e Consumo de Dados
- `src/components/DashboardOverview.tsx`: trocar dados estáticos por chamadas agregadas se aplicável.
- `src/components/ConciliacaoPage.tsx` (Extrato): listar lançamentos reais por CNPJ selecionado.
- `src/components/ReportsPage.tsx`: DRE/DFC reais via Supabase.
- Filtro de empresa (CNPJ) aplicado em todas as páginas que exibem dados financeiros.

## Configuração de Ambiente
- `.env.local` (não commitar):
  - `VITE_SUPABASE_URL=...`
  - `VITE_SUPABASE_ANON_KEY=...`
  - `VITE_USE_DEMO=false` para desativar mocks.

## Validação e Testes
- Smoke tests manuais:
  - Login com credenciais reais → indicador “Dados reais OK”.
  - Abrir “Extrato de Lançamentos” → registros carregados do REST.
  - DRE/DFC com filtro por CNPJ.
  - Logout limpa sessão e volta à tela de login.
- Log de erros:
  - `src/services/supabaseRest.ts` reporta falhas com detalhes (status/endpoint).

## Rollback e Segurança
- Sem deploy até sua aprovação no preview.
- Feature flag `VITE_USE_DEMO` para reativar mock temporariamente se necessário.
- Revisão de RLS e mínimos privilégios no Supabase antes de ativar produção.

## Entregáveis
- Código sem referências a mocks por padrão.
- UI com “Extrato de Lançamentos” e indicador de dados reais.
- Preview validado com login real, consumo de empresas/DRE/DFC, e logout funcional.

Confirma que posso aplicar estas alterações e preparar o preview para validação com dados reais? 