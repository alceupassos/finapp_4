## Objetivo
Criar e executar um agente de pesquisa profunda para coletar exemplos reais de implementação de F360 e Omie em bancos de dados, com foco em plano de contas e conciliação.

## Escopo da Pesquisa
- F360: modelos de dados (plano de contas, centros de custo), uso de webhooks/API, integração de cupons/títulos, conciliação bancária/cartões.
- Omie: estrutura de cadastros/lançamentos, App Keys, endpoints, padrões de conciliação e mapeamento contábil.
- Casos práticos: artigos técnicos, repositórios GitHub, tutoriais/postman collections, integrações com ERPs/bancos.

## Metodologia
1. Consultar documentação oficial e coleções Postman.
2. Buscar guias de implementação (esquemas de tabelas, chaves funcionais, upsert/idempotência).
3. Investigar práticas de conciliação (Open Finance, plugins, passos operacionais) e mapeamento do plano de contas (BR GAAP/IFRS).
4. Coletar exemplos de migração/ETL (CSV, DB read‑only) e estratégias de validação.

## Entregáveis
- Relatório estruturado com:
  - Modelos de dados sugeridos (F360/Omie) e chaves.
  - Fluxos de conciliação (operacional/investimentos/financiamentos).
  - Boas práticas (idempotência, validação, segurança de tokens).
  - Referências e links para cada fonte.

## Execução
- Após aprovação, executo o agente de pesquisa (somente leitura), consolido resultados e entrego o relatório com fontes.
