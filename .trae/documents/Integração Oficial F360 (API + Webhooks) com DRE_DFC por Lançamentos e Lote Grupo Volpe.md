## Visão Geral
- Usar a documentação oficial da F360 (Postman: https://documenter.getpostman.com/view/68066/Tz5m8Kcb) para integrar:
  - API Pública (GET) via **login** e JWT
  - Webhooks (POST) via **token** do cliente na URL + Bearer no header
- Montar DRE e DFC **somando lançamentos**; publicar no Supabase com **upsert** e snapshots.
- Processar **múltiplas empresas** sob um único token (Grupo Volpe) em **lote**.

## Ambiente e Segredos
- `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (públicas)
- `.env.secret` (ou vars de ambiente):
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Por cliente/grupo F360: `F360_TOKEN` e, quando necessário para API, `F360_LOGIN_TOKEN`
  - Opcional: `F360_CNPJS` (lista de CNPJs em lote) e `F360_GROUP` (Grupo Volpe)

## API Pública (GET) — Fluxo Oficial
1. **Login** (Postman: `{{URL}}/PublicLoginAPI/DoLogin`):
   - Body: `{ "token": "{{token_login}}" }`
   - Retorno: `Token` (JWT) para usar em `Authorization: Bearer <JWT>` nas APIs públicas.
2. **Cadastros** (GET com Bearer JWT):
   - Plano de Contas, Centros de Custo, Contas Bancárias, Clientes/Fornecedores.
   - Persistir (opcional) ou usar apenas para validar nomes/IDs antes de enviar webhooks.

## Webhooks (POST) — Inserção Oficial
- Base: `https://webhook.f360.com.br/{F360_TOKEN}/...`
- Headers: `Authorization: Bearer {F360_TOKEN}`, `Content-Type: application/json`.
- Endpoints:
  - Cupom Fiscal: `.../f360-cupom-fiscal`
  - Títulos (AP/AR): `.../f360-{id}-titulos` (ajustar `{id}` conforme coleção do Postman)
- Validação automática usando os CSVs fornecidos (campos obrigatórios, tipo, formato).
- **Idempotência local**:
  - Cupom: `CNPJEmitente + dia(Data) + NumeroCupom`
  - Título: `cnpj + tipoTitulo + numeroTitulo`

## Montagem DRE/DFC por Lançamentos
- DRE (`dre_entries` Supabase):
  - `company_cnpj` (só dígitos), `date` (ISO), `account`, `amount`, `nature` (receita|despesa)
  - Upsert: `company_cnpj,date,account`
- DFC (`cashflow_entries`):
  - `company_cnpj`, `date`, `category`, `kind` (`in`|`out`), `amount` (positivo)
  - Upsert: `company_cnpj,date,kind,category,amount`
- **Somatório**: receitas (+), despesas (–); DFC `in/out` com valores positivos.
- Snapshots: `var/snapshots/import_*.json` e `publish_*.json`.

## Lote — Grupo Volpe
- Token do Grupo Volpe: `223b065a-1873-4cfe-a36b-f092c602a03e`.
- Obter CNPJs:
  - Preferencial: Supabase REST `integration_f360?grupo_empresarial=eq.Grupo Volpe&select=company_cnpj` (Service Role)
  - Alternativas: `F360_CNPJS` no env ou CSV `avant/integracao/grupo_volpe_empresas.csv`
- Para cada CNPJ:
  - Publicar Cupom/Título via webhook
  - Inserir DRE/DFC equivalentes no Supabase com upsert
  - Gerar snapshot de execução com status dos webhooks

## Higienização da Base
- Evitar duplicidade na origem (não reenviar chaves repetidas).
- Upsert nas tabelas destino conforme chaves funcionais.
- Sanidade: CNPJ dígitos; datas ISO; validação de somatórios por período.

## Execução
- Cliente AES (token já fornecido): publicar evento real/teste e inserir DRE/DFC.
- Grupo Volpe: rodar batch com token de grupo e lista de CNPJs (Supabase/CSV/env).
- Entregar relatórios e snapshots.

## Confirmação
- Ao aprovar, executo:
  - Login e consumo de cadastros via API Pública (quando necessário)
  - Webhooks e publicação dos eventos (AES + Grupo Volpe)
  - Importação e upsert DRE/DFC com snapshots
  - Relatórios consolidados (contagens/totais por empresa/período).