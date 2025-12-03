## Objetivo
Construir um RAG para organizar e recuperar conhecimento contábil (BR GAAP/IFRS, DRE/DFC, F360/OMIE, regras de lançamentos) e criar um agente especialista que use esse contexto para estruturar a base (eventos → DRE/DFC), validar lançamentos e orientar integrações.

## Escopo do RAG
- Fontes:
  - Documentos internos: `DADOS_REAIS_E_SIMULADORES.md`, CSVs em `avant/integracao/f360`, `tokens_omie_f360..txt`, guias operacionais.
  - Normas/explicações: textos de DRE/DFC, BR GAAP/IFRS (fornecidos por você).
  - Esquemas/tabelas: `integration_f360`, `integration_omie`, dicas de upsert e chave funcional.
- Pipeline:
  - Ingestão: leitura de arquivos, chunking (1k–2k chars), limpeza, normalização (remover PII sensível dos tokens na versão indexada).
  - Embeddings: gerar vetores (provider configurável) e armazenar em Supabase (tabela `kb_embeddings`).
  - Metadados: fonte, caminho, tipo, data, tags (ex.: "f360", "omie", "dre", "dfc", "webhooks").
- Consulta runtime:
  - API simples (`/rag/query`) que recebe pergunta, busca top‑k chunks e retorna contexto + citações.
  - Cache de consultas frequentes.

## Esquema de Dados (Supabase)
- `kb_documents(id, title, path, type, tags[], created_at)`
- `kb_chunks(id, doc_id, chunk_index, content, tokens, tags[], created_at)`
- `kb_embeddings(id, chunk_id, vector)`
- `kb_faq(id, question, answer, tags[], updated_at)` (opcional)
- Governança: marcar campos com PII/sigilosos e excluir do índice RAG; tokens ficam apenas em tabelas de integrações com acesso Service Role.

## Agente Especialista (Contabilidade BR)
- Funções:
  - Montagem DRE: somar lançamentos por natureza/conta (receitas +, despesas –), aplicar plano de contas (mapa).
  - Montagem DFC (método direto): classificar `in/out` para eventos caixa, seções (operacional/investimentos/financiamentos).
  - Validação: chaves funcionais, idempotência, sanidade (datas ISO, CNPJ dígitos), somatórios por período.
  - Integrações: F360/OMIE (webhooks e consumo de cadastros), DB ERP read‑only.
- Ferramentas do agente:
  - Retriever RAG: busca chunks relevantes (normas, guias, CSVs de campos, endpoints).
  - Consultas Supabase (REST) para `integration_*` e tabelas destino (DRE/DFC), com Service Role.
  - Validador de payloads (CSV de campos para webhooks).
  - Montadores: `assembleDRE(events)`, `assembleDFC(events)`.
- Fluxos suportados:
  - Por cliente (token único): publicar evento → inserir DRE/DFC.
  - Por grupo (token compartilhado): obter CNPJs → publicar lote → inserir DRE/DFC.

## Segurança
- Tokens/keys: ficam fora do índice RAG; só em `.env.secret`/tabelas de integrações.
- RAG indexa apenas conteúdo público/operacional (especificações, schemas, guias), nunca segredos.
- Rate limiting e logs com máscaras.

## Implementação
- Scripts (read‑only ingestion):
  - `scripts/rag_ingest.mjs`: varre pastas, gera chunks, embeddings e popula `kb_*`.
  - `scripts/rag_query.mjs`: consulta top‑k e imprime contexto.
- Serviço (`/rag/query`): expõe endpoint para o agente usar.
- Agente:
  - Módulo `src/agents/accountingBr.ts` com orquestração e ferramentas (retriever, supabaseREST, montadores).
- Integração com comandos existentes (`publish:f360`, `publish:f360:batch`, `import:f360`, `import:db`). O agente chama estes quando necessário.

## Testes e Validação
- Cenários: AES e Grupo Volpe (multiplas empresas com um token), OMIE (app keys), DB ERP read‑only.
- Checagens: contagens por CNPJ/período, totais DRE/DFC, snapshots.
- Avaliação: precisão do RAG (recall) com perguntas frequentes e respostas citadas.

## Entregáveis
- Tabelas `kb_*` e pipeline de ingestão.
- Serviço de consulta RAG.
- Agente `accountingBr` com montadores DRE/DFC e validadores.
- Documentação de uso (comandos e variáveis).

## Próximo Passo
- Indexar os documentos/CSVs e subir o agente contábil.
- Em seguida, rodar os fluxos AES e Grupo Volpe com o agente usando o RAG como contexto, e gerar relatórios/snapshots.
