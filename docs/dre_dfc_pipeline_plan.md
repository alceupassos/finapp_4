# Plano detalhado para geração e reimportação de DRE/DFC

## 1. Objetivos
- Reproduzir exatamente os resultados já presentes em `public/dados/DRE_DFC_VOLPE.xlsx` usando como fonte os arquivos originais `26888098000159.xls` (dados da matriz) e `PlanoDeContas.xlsx` (plano comum a todas as empresas).
- Automatizar a criação das versões finais de DRE (Demonstração do Resultado) e DFC (Fluxo de Caixa) em formato já consumível pelo frontend (12 meses por ano, valores numéricos por categoria).
- Registrar um procedimento reaproveitável para os demais CNPJs, alterando apenas o arquivo de origem (ex.: `12345678000111.xls`).

## 2. Insumos e produtos
| Tipo | Arquivo/Fonte | Observações |
| --- | --- | --- |
| Fonte primária | `public/dados/26888098000159.xls` | Dados contábeis de lançamentos por conta/mês da matriz (VOLPE). |
| Plano de contas | `public/dados/PlanoDeContas.xlsx` | Contém `conta_contabil`, `descricao`, `classe`, `subclasse`, `natureza`, etc. Igual para todas as empresas. |
| Resultado esperado | `public/dados/DRE_DFC_VOLPE.xlsx` | Possui duas abas (DRE e DFC) já agregadas por mês e categoria. Servirá como gabarito para conferir totais/colunas. |
| Destino | Supabase: tabelas `dre`, `dfc`, `companies` | O frontend consome via `SupabaseRest.getDRE/getDFC`. |

## 3. Visão geral do pipeline
1. **Perfilamento dos arquivos**
   - Abrir `DRE_DFC_VOLPE.xlsx` para mapear colunas, formatos de data e granularidade (provável estrutura: linhas = contas/categorias, colunas = meses-ano). Registrar nomes exatos dos cabeçalhos e métricas.
   - Inspecionar `26888098000159.xls` e listar todas as folhas disponíveis. Identificar onde estão lançamentos (ex.: `Lançamentos`, `Balancete` ou similar). Confirmar campos essenciais: data, conta contábil, histórico, valor (débito/crédito ou sinal), centro de custo.
   - Inspecionar `PlanoDeContas.xlsx` para entender a hierarquia e como cada conta mapeia para grupos DRE/DFC.

2. **Modelagem das transformações**
   - Definir esquema intermediário (por exemplo, DataFrame com colunas: `competencia (YYYY-MM)`, `conta`, `descricao`, `natureza`, `tipo`, `valor`).
   - Construir duas tabelas auxiliares derivadas do plano de contas:
     - `dre_mapping`: conta → linha DRE (ex.: Receita Operacional, Custos, Despesas, etc.) + sinal de agregação.
     - `dfc_mapping`: conta → tipo de fluxo (Operacional, Investimento, Financiamento) + indicador se soma como entrada ou saída.
   - Documentar regras de sinal: (i) valores de crédito positivos e débito negativos (ou vice-versa, conforme os lançamentos); (ii) ajustes específicos para contas de impostos, provisões etc., segundo o gabarito.

3. **Implementação (proposta em Python + Pandas)**
   1. **Extrair**: carregar `.xls/.xlsx` com `pandas.read_excel` (usar `engine='xlrd'` ou `openpyxl`, conforme necessário).
   2. **Transformar para DRE**:
      - Normalizar datas para `YYYY-MM` (campo `competencia`).
      - Juntar lançamentos com `planodecontas` para obter o grupo DRE.
      - Aplicar sinal correto (`valor = debito - credito` ou conforme indicado pelo plano).
      - Agrupar por `competencia` + `grupo_dre` → somar valores.
      - Pivotar para formato largo (colunas = meses, linhas = grupos) e garantir 12 colunas, preenchendo zeros quando faltar mês.
   3. **Transformar para DFC**:
      - Usar o mesmo dataset enriquecido.
      - Aplicar `dfc_mapping` para classificar entradas/saídas.
      - Agregar por `competencia` + `grupo_dfc` e separar colunas `entrada`, `saida`, `saldo` conforme o modelo atual.
      - Pivotar para 12 meses e preencher faltantes.
   4. **Validação**:
      - Comparar totais mensais com `DRE_DFC_VOLPE.xlsx` (utilizar `pandas.testing.assert_frame_equal` com tolerância ou relatórios de diferenças).
      - Verificar valores anuais e indicadores importantes (ex.: lucro líquido, caixa final, variações). Registrar divergências e ajustar mapeamentos até bater com o gabarito.

4. **Carga no Supabase**
   - Exportar os DataFrames finais para CSV/JSON padronizado (colunas: `cnpj`, `competencia`, `grupo`, `valor`, etc.).
   - Utilizar scripts `supabase-js` ou `psql` para truncar e inserir novamente as tabelas `dre` e `dfc` referentes ao CNPJ 26888098000159:
     1. Fazer backup (`select * from dre where cnpj='26888098000159'`).
     2. Truncar registros do CNPJ (`delete from dre where cnpj='26888098000159'`).
     3. Inserir linhas novas (batch de 500 registros por chamada ou `COPY` via `psql`).
   - Executar `npm run dev` e validar na interface (aba “Análises”).

5. **Generalização para outros CNPJs**
   - Parametrizar o script para receber `--cnpj=<cnpj> --input=/caminho/arquivo.xls`.
   - Reusar `PlanoDeContas.xlsx` como lookup fixo.
   - Para cada nova empresa:
     1. Rodar o script com o arquivo específico (ex.: `scripts/generate_dre_dfc.py --cnpj=12345678000111 --input=./dados/12345678000111.xls`).
     2. Validar totals básicos (Comparar com balancete/relatórios internos se disponíveis).
     3. Inserir no Supabase mantendo o histórico consolidado.
   - Registrar gaps particulares (ex.: empresa sem determinadas contas → prever fallback “Outros” no frontend).

## 4. Roteiro detalhado de execução
1. **Preparação de ambiente**
   - Criar virtualenv ou usar o existente (recomendado Python 3.11+).
   - Instalar dependências: `pandas`, `openpyxl`, `xlrd`, `python-dotenv`, `supabase`. Exemplo:
     ```bash
     pip install pandas openpyxl xlrd supabase
     ```

2. **Scripts sugeridos** (`scripts/`)
   - `scripts/prepare_plan_accounts.py`: gera `dre_mapping.json` e `dfc_mapping.json` a partir do `PlanoDeContas` (persistir na pasta `public/dados/mappings/`).
   - `scripts/generate_dre_dfc.py`: função principal que:
     1. Carrega o `.xls` informado e o plano de contas
     2. Normaliza datas + valores
     3. Gera DataFrames DRE/DFC conforme item 3
     4. Salva `dre_<cnpj>.csv`, `dfc_<cnpj>.csv` (12 colunas/ano)
   - `scripts/upload_to_supabase.py`: lê os CSVs gerados e publica via REST ou `supabase-py`.

3. **Validação**
   - Rodar `python scripts/generate_dre_dfc.py --cnpj=26888098000159 --input=public/dados/26888098000159.xls`.
   - Comparar com `DRE_DFC_VOLPE.xlsx` usando script `scripts/compare_results.py` que calcula a diferença por célula.
   - Ajustar regras até diferença ficar ≤ R$1 por célula.

4. **Reimportação oficial (Matriz)**
   - Após validação, executar `upload_to_supabase.py` para substituir os dados da matriz.
   - Rodar `npm run build` ou `npm run dev` para garantir que o frontend continua consumindo corretamente.

5. **Processo repetível para demais CNPJs**
   - Checklist por empresa:
     1. Receber arquivo `<cnpj>.xls`.
     2. Rodar `generate_dre_dfc.py` para gerar CSVs.
     3. Revisar outputs (totais e eventuais linhas novas).
     4. Usar `upload_to_supabase.py --cnpj=<cnpj>` para atualizar o banco.
   - Guardar os CSVs/relatórios no repositório (ou bucket) para auditoria.

## 5. Próximos passos imediatos
1. Implementar scripts de transformação conforme descrito.
2. Executar contra o arquivo da matriz e comparar com `DRE_DFC_VOLPE.xlsx` até os resultados coincidirem.
3. Em seguida, rodar o upload para o Supabase e validar no frontend.
4. Documentar quaisquer ajustes específicos de contas (ex.: contas que exigem inversão de sinal) para uso em novos CNPJs.

Este plano cobrirá tanto o alinhamento do CNPJ 26888098000159 quanto a matriz de procedimentos para aplicar em futuros arquivos .xls de outras empresas, garantindo consistência e rastreabilidade completa.
