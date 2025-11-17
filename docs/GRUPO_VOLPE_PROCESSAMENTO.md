# 🚀 Pipeline Completo - Grupo Volpe (13 Empresas)

## ✅ Processamento Concluído com Sucesso!

**Data:** 17 de Novembro de 2024  
**Empresas Processadas:** 13/13  
**Taxa de Sucesso:** 100%

---

## 📊 Resumo de Processamento

### Total de Registros Importados

| Tipo | Total de Linhas |
|------|----------------|
| **DRE** | 4.391 linhas |
| **DFC** | 1.244 linhas |
| **Total** | 5.635 registros |

### Empresas Processadas

| # | CNPJ | Nome | Registros F360 | DRE | DFC |
|---|------|------|----------------|-----|-----|
| 1 | 26888098000159 | GRUPO VOLPE - MATRIZ | 10.455 | 660 | 118 |
| 2 | 26888098000230 | VOLPE FILIAL 02 | 2.640 | 41 | 23 |
| 3 | 26888098000310 | VOLPE FILIAL 03 | 91.729 | 430 | 101 |
| 4 | 26888098000400 | VOLPE FILIAL 04 | 49.944 | 336 | 104 |
| 5 | 26888098000582 | VOLPE FILIAL 05 | 54.601 | 330 | 99 |
| 6 | 26888098000663 | VOLPE FILIAL 06 | 80.606 | 343 | 102 |
| 7 | 26888098000744 | VOLPE FILIAL 07 | 71.989 | 319 | 100 |
| 8 | 26888098000825 | VOLPE FILIAL 08 | 48.386 | 328 | 107 |
| 9 | 26888098000906 | VOLPE FILIAL 09 | 49.853 | 276 | 93 |
| 10 | 26888098001040 | VOLPE FILIAL 10 | 35.290 | 327 | 97 |
| 11 | 26888098001120 | VOLPE FILIAL 11 | 65.135 | 315 | 102 |
| 12 | 26888098001201 | VOLPE FILIAL 12 | 34.879 | 393 | 106 |
| 13 | 26888098001392 | VOLPE FILIAL 13 | 82.345 | 293 | 92 |

---

## 🔧 Como Foi Feito

### 1. Arquivos de Entrada

Cada empresa tem seu arquivo XLS no diretório `avant/integracao/f360/`:
- `[CNPJ].xlsx` - Dados transacionais de cada empresa (Relatório Unificado F360)

Arquivos compartilhados:
- `PlanoDeContas.xlsx` - Plano de contas padrão (203 contas)
- `CentroDeCustos.xlsx` - Centros de custo (33 centros)
- `regras/empresas.csv` - Lista das 13 empresas com CNPJ e Nome

### 2. Script Desenvolvido

**Arquivo:** `scripts/processar_grupo_volpe.mjs`

O script foi reescrito em Node.js baseado nas regras Python existentes em `avant/integracao/f360/regras/`:

**Principais funcionalidades:**
- Lê dados do sistema F360 (coluna "Relatório Unificado")
- Categoriza contas automaticamente usando regras de negócio
- Gera DRE usando regime de **competência** (coluna Competência)
- Gera DFC usando regime de **caixa** (coluna Liquidação)
- Upload automático para Supabase

**Regras de Categorização (DRE):**
- **Receitas Operacionais:** Vendas de produtos (102-1), receitas de serviços (302-1)
- **Deduções de Receitas:** Vendas canceladas, descontos concedidos (300-9), tarifas de cartão (431-9)
- **Impostos:** ICMS (205-0)
- **CMV:** Custo de Mercadorias Vendidas (400-0)
- **Despesas Operacionais:** Frete (421-8), embalagens (400-0), combustível (422-1)
- **Despesas Com Pessoal:** Salários (201-6), INSS (203-0), FGTS (203-1)
- **Despesas Administrativas:** Contabilidade (425-6), telefonia (420-7)
- **Despesas Financeiras:** Juros (432-0)
- **Receitas Financeiras:** Descontos obtidos (303-4)
- **Investimentos e Outros:** Empréstimos (200-8), tributos parcelados (211-1)

### 3. Estrutura de Dados no Supabase

**Tabela: `dre_entries`**
```
company_cnpj    | text      | CNPJ da empresa
company_nome    | text      | Nome da empresa
date            | date      | Data (formato YYYY-MM-01)
account         | text      | Nome da conta (ex: "102-1 - Vendas de Produtos")
nature          | text      | 'receita' ou 'despesa'
amount          | numeric   | Valor absoluto (sempre positivo)
created_at      | timestamp | Data de importação
```

**Tabela: `cashflow_entries`**
```
company_cnpj    | text      | CNPJ da empresa
company_nome    | text      | Nome da empresa
date            | date      | Data (formato YYYY-MM-01)
category        | text      | Categoria do fluxo
kind            | text      | 'in' (entrada) ou 'out' (saída)
amount          | numeric   | Valor
created_at      | timestamp | Data de importação
```

---

## 💻 Como Usar

### Processar Todas as Empresas

```bash
# Gerar arquivos JSON localmente (sem upload)
node scripts/processar_grupo_volpe.mjs

# Gerar e fazer upload para Supabase
node scripts/processar_grupo_volpe.mjs --upload=true
```

### Processar Empresa Específica

```bash
# Apenas a matriz
node scripts/processar_grupo_volpe.mjs --cnpj=26888098000159

# Com upload
node scripts/processar_grupo_volpe.mjs --cnpj=26888098000159 --upload=true
```

### Customizar Diretórios

```bash
node scripts/processar_grupo_volpe.mjs \
  --input=caminho/para/f360 \
  --output=caminho/saida \
  --upload=true
```

---

## 📁 Arquivos Gerados

Os dados processados são salvos em `var/grupo_volpe/`:

```
var/grupo_volpe/
├── dre_26888098000159.json    (MATRIZ - 660 linhas)
├── dfc_26888098000159.json    (MATRIZ - 118 linhas)
├── dre_26888098000230.json    (FILIAL 02 - 41 linhas)
├── dfc_26888098000230.json    (FILIAL 02 - 23 linhas)
├── ...
└── dfc_26888098001392.json    (FILIAL 13 - 92 linhas)
```

---

## 🎯 Visualização no Frontend

O sistema permite:

1. **Filtro por Empresa Individual**
   - Selecionar qualquer uma das 13 empresas
   - Ver DRE e DFC específicos

2. **Visão Consolidada (Grupo)**
   - Agregar todas as empresas
   - Análise consolidada do Grupo Volpe

3. **Dashboards Disponíveis**
   - Dashboard principal (KPIs gerais)
   - Análises (DRE e DFC detalhados)
   - Gráficos e tendências

---

## 🔍 Validação de Dados

### Conferir no Supabase

```sql
-- Total de registros por empresa (DRE)
SELECT company_cnpj, company_nome, COUNT(*) as total
FROM dre_entries
GROUP BY company_cnpj, company_nome
ORDER BY company_cnpj;

-- Total de registros por empresa (DFC)
SELECT company_cnpj, company_nome, COUNT(*) as total
FROM cashflow_entries
GROUP BY company_cnpj, company_nome
ORDER BY company_cnpj;

-- Exemplo: DRE da Matriz em Jan/2025
SELECT account, nature, amount
FROM dre_entries
WHERE company_cnpj = '26888098000159'
  AND date = '2025-01-01'
ORDER BY amount DESC
LIMIT 10;
```

---

## 📝 Próximos Passos Possíveis

1. ✅ **Sistema rodando com 13 empresas**
2. 🔄 **Adicionar mais empresas**
   - Basta adicionar arquivo `[CNPJ].xlsx` em `avant/integracao/f360/`
   - Adicionar linha em `regras/empresas.csv`
   - Rodar script novamente

3. 📊 **Relatórios Consolidados**
   - DRE consolidado do grupo
   - Comparativos entre filiais
   - Rankings de performance

4. 🎨 **Dashboards Customizados**
   - Gráficos de evolução mensal
   - Análise de margem por filial
   - Indicadores de eficiência

5. 🔄 **Automação**
   - Processamento agendado (diário/semanal)
   - Notificações de novas importações
   - Alertas de variações significativas

---

## 🐛 Troubleshooting

### Erro: Arquivo não encontrado
- Verificar se o arquivo `[CNPJ].xlsx` existe em `avant/integracao/f360/`
- Nome deve ser apenas números do CNPJ (ex: `26888098000159.xlsx`)

### Erro: Constraint violation
- O campo `nature` aceita apenas `'receita'` ou `'despesa'`
- O campo `kind` aceita apenas `'in'` ou `'out'`

### Reprocessar empresa específica
```bash
# Deletar dados antigos e reimportar
node scripts/processar_grupo_volpe.mjs --cnpj=26888098000159 --upload=true
```

---

## 📞 Suporte

**Desenvolvido por:** Angra Saúde  
**Sistema:** FinApp v4  
**Data:** Novembro 2024

**Status:** ✅ PRODUÇÃO - 13 empresas ativas

---

**✅ MISSÃO CUMPRIDA! Sistema rodando com todas as 13 empresas do Grupo Volpe.**
