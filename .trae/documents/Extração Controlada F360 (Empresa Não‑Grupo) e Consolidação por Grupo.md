## Objetivo
- Selecionar uma empresa NÃO‑grupo (CNPJ específico) e extrair um lote controlado do F360 para validar mapeamento DRE/DFC.
- Definir e testar a lógica de consolidação por grupo (empresa somada), evitando duplicações textuais.
- Persistir no Supabase de forma idempotente e entregar relatório de consistência para aprovação antes de ligar ao front.

## Seleção de Token e Empresa
1. Ler `avant/DADOS_REAIS_E_SIMULADORES.md` e identificar um token de empresa NÃO‑grupo (ex.: dentro do token Dex Invest, escolher uma empresa com CNPJ presente).
2. Consultar `integration_f360` (Supabase) para listar empresas desse token, sem bater no ERP; se vazio, usar um Excel local para confirmar o CNPJ alvo.

## Extração Piloto (1–2 meses)
1. Endpoints F360: lançamentos, contas/categorias e saldos por período (janela controlada).
2. Rate limit e segurança: concorrência máxima 2–3, backoff exponencial, cache “último bom”.
3. Normalização BR: remover “R$”, separadores, trocar “,” por “.”; datas em competência mensal.
4. Mapeamento:
   - DRE: `company_cnpj`, `company_name`, `group_name`, `date`, `account`, `type`, `value`.
   - DFC: `company_cnpj`, `company_name`, `group_name`, `date`, `description`, `entrada`, `saida`, `saldo`.

## Persistência (Supabase)
- Upsert idempotente:
  - `dre_entries`: chave por `(company_cnpj, date, account)`.
  - `cashflow_entries`: chave por `(company_cnpj, date, description)`.
- Índices: `(company_cnpj, date)`, `(group_name, date)`.

## Consolidação por Grupo
1. Entidade lógica “Grupo <nome> (Consolidado)” sem CNPJ.
2. DRE: somar `value` por `account` e mês entre empresas do grupo.
3. DFC: somar `entrada`, `saida` e `saldo` por mês.
4. Textos: não duplicar; usar conjunto canônico (nomes de empresas, contas/descrições). Cada linha consolidada guarda os CNPJs fonte.

## Validação e Relatório
- Validações automáticas:
  - DRE: soma de contas = total por mês.
  - DFC: `saldo_n` ≈ `saldo_{n-1}` + `entradas` − `saídas` (tolerância de centavos).
  - Detecção de nulos/tipos inválidos.
- Entregar relatório com:
  - Colunas reais e exemplos
  - Totais por mês
  - Discrepâncias e correções propostas

## Integração ao Front (após aprovação)
- Ligar Mapa/DRE/DFC aos dados validados; manter cache e evitar chamadas ao ERP.
- Ativar job de consolidação por grupo (2×/dia + “Atualizar agora” incremental).

## Critérios de Sucesso
- Extração válida com empresa NÃO‑grupo; DRE/DFC populados e consistentes.
- Consolidação por grupo correta e auditável.
- Relatório aprovado para ligação no front.