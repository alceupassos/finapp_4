# RAG Config

- Fonte: Supabase `rag_cache` e documentos em `avant/*`.
- Atualização: incremental via RPC `refresh_rag_cache` e cron duas vezes ao dia.
- Segurança: secrets no Supabase Vault, valores nunca expostos em claro na UI.
- Escopo: respostas limitadas à empresa/grupo selecionado e filtros ativos.
- Observabilidade: métricas de atualização e logs em `app_logs`.
- Prioridade de busca: `rag_cache` → dados operacionais → ERPs (F360/Omie) com transformação antes de indexar.

## Operação

- UI: Admin → RAG → botão “Atualizar” para refresh.
- CLI: `supabase functions invoke refresh_rag_cache` (se exposto) ou `rpc/refresh_rag_cache`.
- Políticas: RLS restringindo acesso por papel e empresa.
