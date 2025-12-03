# Snapshot de Estado – 2025-11-15

## Contexto
- Branch: `main`
- Objetivo: Migrar login mock para autenticação real via Supabase mantendo fallback demo.
- Usuário criado: `dev@angrax.com.br` (confirmado) senha provisionada.

## Variáveis de Ambiente Atuais (`.env.local`)
- `VITE_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co`
- `VITE_SUPABASE_ANON_KEY=...anon jwt...`
- `SUPABASE_SERVICE_ROLE_KEY=...service role jwt...`

## Arquivos Modificados
1. `src/services/auth.ts`
   - Adicionado `loginSupabase()` usando `supabase.auth.signInWithPassword`.
   - Mantido `validateMockLogin` para modo demo (`fin-demo`).
   - Persistência da sessão: `supabase_session` + `session_user`.
2. `src/components/LoginModal.tsx`
   - Fluxo de submit tenta Supabase primeiro; fallback para mock.
   - Texto de ajuda atualizado.
3. `src/services/supabaseRest.ts`
   - Incluído `getSupabaseAccessToken()` para enviar `Authorization: Bearer <user_token>`.

## Próximos Passos Possíveis
- Adicionar botão/indicador de usuário logado no topo.
- Revisar políticas RLS para garantir acesso às tabelas conforme papel do usuário.
- Adicionar fluxo de recuperação de senha real.
- Implementar logout explícito e expiração de sessão.

## Teste Rápido Após Reinício
```bash
pnpm install
pnpm run dev
# Abrir http://localhost:5173 e login com dev@angrax.com.br / B5b0dcf500@#
```

## Observações
- Se requisições REST retornarem 400, verificar RLS; token agora é do usuário.
- Fallback demo permanece operacional para e-mails do arquivo `public/dados/mock_users.json`.
