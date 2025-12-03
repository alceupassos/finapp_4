# Resumo do estado em 14/11/2025 19:12:05

- **Contexto:** a tentativa mais recente de executar `node scripts/import_volpe_exportado.mjs` falhou (exit code 1) antes de terminar porque o script ainda não estava operacional no repo anterior. O novo arquivo foi escrito para substituir a versão duplicada e manter uma única estrutura confiável.
- **Git status:** alterações listadas gerando novo arquivo em `avant/exportado`, diversas planilhas e scripts ainda não rastreadas, além de modificações em `.DS_Store` e `package.json`.
- **O que foi feito:** o script `scripts/import_volpe_exportado.mjs` foi criado do zero, com leitura da pasta `avant/exportado`, inferência de naturezas via `PlanoDeContas.xlsx`, envio em lotes para Supabase (quando configurado), snapshot dos resultados e mensagens no console.
- **Próximos passos:** confirmar variáveis `VITE_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY`, validar arquivos em `avant/exportado`, rodar `pnpm run import:volpe-exportado` e registrar o output `var/snapshots`.

## Resumo do estado em 14/11/2025 19:24:58

- **Contexto:** executei `pnpm run import:volpe-exportado` com o script novo. Ele conectou `avant/exportado`, gerou 1.705 registros de DRE e 682.891 de DFC e tentou subir no Supabase.
- **Resultado:** o upload abortou durante `cashflow_entries` com `500 deadlock detected`. Nenhum registro foi confirmado no banco, mas existe o snapshot `var/snapshots/volpe_exportado_<timestamp>.json` com o que já havia sido preparado.
- **Próximos passos:** executar o `delete`/`truncate` em `dre_entries` e `cashflow_entries` para higienizar tudo, aceitar o upload dividido (por CNPJ ou chunks menores) e reexecutar o import após a limpeza com variáveis de ambiente corretas.