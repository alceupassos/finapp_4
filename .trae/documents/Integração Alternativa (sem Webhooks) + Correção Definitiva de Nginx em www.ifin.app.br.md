## Objetivo
Resolver a integração de forma robusta sem depender dos webhooks que retornam 404, e corrigir definitivamente o 502/Bad Request do Nginx em www.ifin.app.br.

## Integração (sem webhooks)
- ETL servidor‑side (idempotente):
  - **Fontes**: DB read‑only do ERP (quando disponível) e **CSV** (exportação do ERP/PDV) como fallback imediato.
  - **Eventos**: títulos (AP/AR), lançamentos de caixa, vendas/recebíveis; `raw_payload` guardado para auditoria.
  - **Chaves**: `company_cnpj + external_id` (por entidade) e chaves funcionais por lançamento (data + valor + ref).
  - **Publicação**: Supabase `dre_entries` e `cashflow_entries` via upsert.
- Bridge HTTP (opcional):
  - **Serviço backend** `integration-bridge` (HTTPS), recebe eventos do ERP/PDV (JSON) e grava no Supabase.
  - **Tokens** por cliente (F360/Omie) guardados server‑side; **frontend nunca vê segredos**.
- API Pública F360/Omie (consulta):
  - Usar **login/JWT** para cadastros (plano de contas, centros, contas bancárias, clientes/fornecedores).
  - Validar nomes/códigos antes de persistir títulos/lancamentos (sem criar via webhook).

## Montagem DRE/DFC (somatório de lançamentos)
- **DRE**: receitas (+), despesas (–) por período/conta; upsert `company_cnpj,date,account,nature`.
- **DFC (direto)**: entradas `in` e saídas `out` (valores positivos), por período/categoria; upsert `company_cnpj,date,kind,category,amount`.
- **Rateios**: tabela auxiliar para centros/plano de contas; validar soma de percentuais/valores.

## Auditoria e RAG
- **Snapshots** por execução em `var/snapshots/` (contagens/totais por CNPJ/período).
- **RAG** indexa documentos/CSV (campos F360/Omie, normas DRE/DFC) para o agente contábil BR validar lançamentos e mapeamentos.

## Correção Definitiva do Nginx
- **Vhost SPA** (HTTPS):
```
server {
  listen 443 ssl;
  server_name www.ifin.app.br ifin.app.br;
  ssl_certificate /etc/letsencrypt/live/www.ifin.app.br/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/www.ifin.app.br/privkey.pem;

  root /var/www/finapp;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
  location ^~ /.well-known/acme-challenge/ { default_type text/plain; root /var/www/letsencrypt; }
  location ^~ /api/ { return 204; }
}
server {
  listen 80 default_server;
  server_name _;
  location ^~ /.well-known/acme-challenge/ { default_type text/plain; root /var/www/letsencrypt; }
  return 301 https://$host$request_uri;
}
```
- **Remover** quaisquer `proxy_pass` para dev ports (5173/3000) e upstreams inexistentes.
- **Validação**: `nginx -t` → reload → `curl -I https://www.ifin.app.br/` → `200 OK`.

## Execução
1) Ativar ETL (CSV imediato) e preparar DB read‑only quando disponível.
2) Publicar DRE/DFC por somatório (AES + Grupo Volpe já processados).
3) Aplicar vhost Nginx SPA, reload e validar sem 502.
4) Gerar relatórios consolidados (contagens/totais) por CNPJ/período.

## Entregáveis
- Base consolidada (DRE/DFC) por lançamentos com snapshots.
- Nginx corrigido (SPA servindo, sem 502) e `/api` isolado até backend.
- Relatórios por CNPJ (AES + Grupo Volpe) e guia de operação.
