# Higienização pós-import de 14/11/2025

1. **Identifique os CNPJs processados**
   - Rode `node scripts/list_volpe_exported_cnpjs.mjs` para listar todos os documentos na pasta `avant/exportado` e copiar a lista de `company_cnpj` relevantes.

2. **Conecte-se ao Supabase** (via `psql`, `supabase` CLI ou dashboard SQL) e valide o estado atual:
   ```sql
   select count(*) from dre_entries;
   select count(*) from cashflow_entries;
   ```

3. **Apague os dados referentes a esses CNPJs**
   ```sql
   delete from cashflow_entries where company_cnpj in (
     '26888098000159','26888098000230','26888098000310','26888098000400',
     '26888098000582','26888098000663','26888098000744','26888098000825',
     '26888098000906','26888098001040','26888098001120','26888098001201',
     '26888098001392'
   );
   delete from dre_entries where company_cnpj in (
     '26888098000159','26888098000230','26888098000310','26888098000400',
     '26888098000582','26888098000663','26888098000744','26888098000825',
     '26888098000906','26888098001040','26888098001120','26888098001201',
     '26888098001392'
   );
   ```
   *(Atualize a lista acima caso novos arquivos sejam adicionados ao `avant/exportado`.)*

4. **Alternativa: truncar as tabelas**
   ```sql
   truncate table cashflow_entries restart identity;
   truncate table dre_entries restart identity;
   ```
   → use somente se for aceitável apagar todos os dados.

5. **Verifique o efeito**
   ```sql
   select count(*) from dre_entries;
   select count(*) from cashflow_entries;
   ```

6. **Reestabeleça o estado**
   - Após confirmar que os dados antigos foram removidos, rode `pnpm run import:volpe-exportado` com as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` definidas. O script atualizado envia os dados empresa a empresa e grava snapshots em `var/snapshots/volpe_exportado_<timestamp>.json`.