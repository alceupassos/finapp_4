## Objetivo
- Criar login simples com usuários mockados para garantir apresentação do sistema mesmo sem dados reais.
- Após logado, habilitar um botão “Popular Dados” para gravar mock (Notícias e Excel local) no Supabase de forma segura.
- Não tocar nas telas financeiras até aprovarmos os dados extraídos (gate de visualização).

## Abordagem
- Sem router: usar gate de sessão no `App.tsx` e modal de login.
- Persistência de sessão leve em `localStorage` (chave `session_user`).
- Usuários mock com perfis: `admin`, `cliente`, `franqueado`, `personalizado`.
- Default ao entrar: cliente “GRUPO VOLPE” (apenas marcação lógica; dados exibidos via mock até validação).

## Implementação (UI)
1. Componente `LoginModal.tsx` (novo):
   - Campos: e‑mail, senha (mock), seleção de perfil (opcional), empresa/grupo (opcional).
   - Botões: Entrar, Ver modo demo.
   - Valida credenciais contra lista mock local (`public/dados/mock_users.json`).
2. Gate no `App.tsx`:
   - Se não há `session_user`, renderiza `LoginModal`.
   - Se há, renderiza app normalmente e injeta `role` para Sidebar (ex.: logs só para admin).
3. Botão “Popular Dados” (pós login):
   - Localização: Topbar (ao lado do ícone de IA) ou em Configurações.
   - Ações:
     - Grava `news_items` e `news_indicators` (já implementados).
     - Lê Excel local (avant/vant/public/dados) e grava DRE/DFC no Supabase via PostgREST com upsert idempotente (apenas após confirmação).
   - Confirmação: modal com resumo de quantidades antes de submeter.

## Mock de Dados
- Arquivo `public/dados/mock_users.json`:
  - Campos: `email`, `password`, `name`, `role`, `companies` (lista com `cnpj`, `name`, `group`), `defaultCompany`.
- Dados exibidos nas telas:
  - Dashboard/Análises: permanecem com mock/local até a validação de Excel.
  - News: já grava em Supabase (com `.env.local`).

## Segurança e Operação
- Sem `service_role` no cliente; PostgREST com `anon` apenas.
- Rate limit: “Popular Dados” usa lotes pequenos e upserts; logs de execução básicos.
- Sessão: apenas demo/poC; depois pode trocar por auth real (Supabase Auth/OAuth).

## Critérios de Sucesso
- Login mock autenticando e guardando sessão; role refletida no app (Sidebar/admin-only).
- Botão “Popular Dados” grava notícias e prepara import de DRE/DFC (com resumo e confirmação).
- App apresenta telas completas com mock sem dependência do ERP.

## Entregáveis
- `LoginModal.tsx` e `mock_users.json`.
- Gate de sessão em `App.tsx`.
- Botão “Popular Dados” com modal de confirmação.
- Funções de import Excel→Supabase já referenciadas (após sua aprovação de dados).