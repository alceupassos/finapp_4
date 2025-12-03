## Objetivo
- Extrair dados do F360 de uma empresa NÃO‑grupo para mapear campos reais.
- Projetar a lógica de consolidação por grupo (empresa "somada") evitando duplicações e definindo regras para campos não numéricos.
- Persistir no Supabase com estrutura idempotente e segura, sem alterar páginas até aprovação.

## Realidade dos Tokens
- Tokens de grupo (ex.: "Grupo Volpe") frequentemente não possuem CNPJ/dados no F360 e atuam só como marcador lógico.
- Conclusão: usar tokens de empresas individuais para ingestão e criar uma entidade consolidada de grupo por soma/regras.

## Extração Inicial (F360)
1. Seleção de token NÃO‑grupo:
   - Fonte: `avant/DADOS_REAIS_E_SIMULADORES.md` (lista de empresas F360 e tokens).
   - Critério: empresa com CNPJ presente; não conter "Grupo" no nome.
2. Leitura de campos via F360 API (fase controlada):
   - Endpoints alvo: lançamentos, contas/categorias, saldos/caixa, períodos.
   - Paginação e janelas por data; campos mínimos: `company_cnpj`, `company_name`, `date`, `account`, `category`, `type (receita|despesa)`, `value`, `balance`.
3. Mapeamento para DRE/DFC:
   - DRE: `conta`, `valor`, `tipo` (se aplicável), `competência`.
   - DFC: `descricao`, `entrada`, `saida`, `saldo`, `competência`.
4. Testar com 1–2 meses de dados para validar o pipeline e esquema.

## Modelo de Dados (Supabase)
- Tabelas (sugestão):
  - `dre_entries(company_cnpj, company_name, group_name, date, account, type, value, created_at)`
  - `cashflow_entries(company_cnpj, company_name, group_name, date, description, entrada, saida, saldo, created_at)`
  - `companies(cnpj, name, group_name, active)`
- Índices: `(company_cnpj, date)`, `(group_name, date)`; chaves idempotentes por `(company_cnpj, date, account|description)`.

## Normalização e Agrupamento
- Numéricos: soma por `group_name` + `date` + `account/description`.
- Não‑numéricos (texto):
  - `company_name`: manter lista única por grupo.
  - `account/description`: normalizar por dicionário (casefold, espaços, sinônimos) e usar chave canônica.
- Datas: padronizar para competência mensal.
- Duplicatas: detecção por chave canônica + tolerância a variações de R$; aplicar idempotência na escrita (upsert por chave).

## Empresa Consolidada (Grupo)
- Criar entidade lógica "Grupo <nome> (Consolidado)" sem CNPJ, com:
  - `company_cnpj = NULL`, `group_name` = nome do grupo.
  - DRE: somatório de `valor` por `account` e mês.
  - DFC: somatório de `entrada`, `saida` e `saldo` por mês.
- Regras:
  - Campos não numéricos: não duplicar, usar conjunto (ex.: nomes de empresas, contas canônicas).
  - Referência: cada registro consolidado aponta itens fonte (array de `company_cnpj`s) para auditoria.

## Pipeline de Ingestão
1. Coleta (F360 API) por empresa não‑grupo → buffer local.
2. Transformação (normalização BR, canônicos, competência).
3. Carga (Supabase PostgREST): upsert idempotente.
4. Consolidação por grupo: job que lê empresas do grupo e grava a entidade consolidada.
5. Logs/observabilidade: gravar status e contagens (linhas, totais, erros) em `app_logs`.

## Rate Limit e Segurança
- Backoff exponencial + jitter; limite de concorrência 2–3 requisições simultâneas.
- Janela de sincronização: 2×/dia + botão manual “Atualizar agora” (incremental).
- Cache “último bom” em Supabase; rollback em caso de inconsistências.
- Não usar `service_role` no cliente; operações sensíveis via Edge Functions.

## Validação e Relatório
- Validação automática após ingestão:
  - DRE: total por mês vs. soma de contas; tolerância a centavos.
  - DFC: `saldo_n` ≈ `saldo_{n-1}` + `entradas` − `saídas` (com tolerância).
  - Discrepâncias documentadas; lista de linhas com tipos inválidos/nulos.
- Entregar relatório: colunas reais e exemplos; mapeamento final; estatísticas (linhas/meses/totais).

## Entregáveis
- Parser e fetcher F360 com token não‑grupo.
- Esquema Supabase confirmado (já temos de notícias; adicionar se necessário para DRE/DFC).
- Job de consolidação por grupo (lógica de soma e não duplicação de texto).
- Relatório de validação e consistência para você aprovar antes de ligar às telas.

## Critérios de Sucesso
- Extração válida com um token de empresa não‑grupo; DRE/DFC populados no Supabase.
- Consolidação por grupo correta (somas e não duplicações).
- Relatório de consistência sem erros críticos; aprovação sua para ligar ao front.

## Próximos Passos
- Selecionar um token NÃO‑grupo no `DADOS_REAIS_E_SIMULADORES.md` e iniciar a extração controlada.
- Produzir relatório de mapeamento/consistência e enviar para aprovação.
- Após ok, ligar telas Mapa/DRE/DFC e habilitar job de consolidação por grupo.