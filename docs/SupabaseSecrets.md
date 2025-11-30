# Supabase Secrets

## Passos com Supabase CLI

1. Instale o CLI e faça login:
   - `npm i -g supabase`
   - `supabase login`

2. Vincule ao projeto:
   - `supabase link --project-ref <REF_DO_PROJETO>`

3. Gere o arquivo `.env` de secrets pela área Admin (Chaves → Exportar .env) e rode:
   - `supabase secrets set --env-file supabase-secrets.env`

4. Adicione a chave de criptografia para uso com `pgcrypto`:
   - `supabase secrets set app.encryption_key='<UMA_CHAVE_FORTE>'`

5. Verifique no banco:
   - `SELECT current_setting('app.encryption_key', true);`

## Observações

- Nunca faça commit de secrets no repositório.
- Use RLS e roles apropriadas para endpoints que acessam segredos.
- Em produção, mantenha a área Admin desativada (`VITE_ENABLE_ADMIN=false`) e restrinja o acesso por domínio/papéis.

