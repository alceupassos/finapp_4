# 📚 Regras de Negócio - Sistema FinApp Grupo Volpe

## 📋 Visão Geral

Este documento descreve as regras de negócio implementadas no sistema FinApp para processar e apresentar dados financeiros do Grupo Volpe (13 empresas).

---

## 🏢 Estrutura do Grupo Volpe

### Empresas

| # | CNPJ | Nome | Tipo |
|---|------|------|------|
| 1 | 26888098000159 | GRUPO VOLPE - MATRIZ | Matriz |
| 2-13 | 26888098000230...26888098001392 | VOLPE FILIAL 02-13 | Filiais |

**Total:** 13 empresas

---

## 📊 Fontes de Dados

### Sistema F360 (Fonte Principal)

**Estrutura de Arquivo:** `[CNPJ].xlsx`

**Aba:** "Relatório Unificado"

**Colunas Principais:**
- `__EMPTY` (coluna A): Tipo de lançamento (A Receber / A Pagar)
- `__EMPTY_3` a `__EMPTY_5`: Datas (Emissão, Vencimento, Liquidação)
- `__EMPTY_7`: Centro de Custo
- `__EMPTY_8`: Valor Líquido
- `__EMPTY_9`: Categoria
- `__EMPTY_10`: Observações
- `__EMPTY_11`: Competência (formato MM/YYYY)
- `__EMPTY_12`: Plano de Contas (formato "XXX-X - Nome da Conta")
- `__EMPTY_13`: Cliente/Fornecedor

### Arquivos de Referência

1. **PlanoDeContas.xlsx**
   - Aba: "Plano de Contas"
   - 203 contas cadastradas
   - Estrutura: Código + Nome

2. **CentroDeCustos.xlsx**
   - 33 centros de custo cadastrados

3. **empresas.csv**
   - Lista de CNPJs e nomes das 13 empresas

---

## 🔄 Regimes Contábeis

### DRE - Demonstrativo de Resultados (Regime de Competência)

**Conceito:** Registra receitas e despesas no momento em que são **geradas**, independente do pagamento.

**Campo usado:** `Competência` (coluna `__EMPTY_11`)

**Formato:** MM/YYYY → convertido para YYYY-MM-01

**Exemplo:**
- Venda realizada em 15/01/2025 com competência 01/2025
- DRE registra em: 2025-01-01

### DFC - Demonstrativo de Fluxo de Caixa (Regime de Caixa)

**Conceito:** Registra entradas e saídas no momento em que o dinheiro **efetivamente** entra/sai.

**Campo usado:** `Liquidação` (coluna `__EMPTY_5`)

**Formato:** DD/MM/YYYY → convertido para YYYY-MM-01

**Exemplo:**
- Venda de 15/01/2025 recebida em 10/02/2025
- DFC registra em: 2025-02-01

---

## 📝 Categorização de Contas (DRE)

### 1. Receitas Operacionais

**Códigos:** 102-1, 302-1

**Regras:**
- Vendas de produtos (exceto canceladas)
- Receita com prestação de serviços
- Ajustes a crédito de cartão

**Exemplos:**
- `102-1 - Vendas de Produtos`
- `102-1 - Vendas de Produtos - PIX`
- `102-1 - Vendas de Produtos - Boleto`
- `302-1 - Receitas Diversas`

### 2. Deduções de Receitas

**Códigos:** 102-1 (canceladas), 300-9, 431-9

**Regras:**
- Vendas canceladas ou devoluções
- Descontos concedidos
- Tarifas de cartão e meios de pagamento
- Ajustes a débito de cartão

**Exemplos:**
- `102-1 - Vendas Canceladas`
- `300-9 - Desconto Concedido`
- `431-9 - Tarifa de Cartao / Meios de Pagamento`

### 3. Impostos Sobre o Faturamento

**Códigos:** 205-0

**Regras:**
- ICMS
- Outros tributos sobre faturamento

**Exemplos:**
- `205-0 - ICMS`

### 4. Custo de Mercadorias Vendidas (CMV)

**Códigos:** 400-0 (específico)

**Regra:** Conta 400-0 + label contendo "custo.*mercadoria"

**Exemplos:**
- `400-0 - Custo de Mercadorias Vendidas`

### 5. Despesas Operacionais

**Códigos:** 400-x (exceto CMV), 421-x, 422-x, 409-x

**Regras:**
- Custos de embalagem, frete, seguros
- Manutenção de veículos, combustível, pedágio
- Serviços terceiros

**Exemplos:**
- `400-0 - Custo de Embalagens`
- `421-8 - OP Correios e fretes`
- `422-1 - OP Combustivel`
- `422-4 - Pedágio`

### 6. Despesas Com Pessoal

**Códigos:** 201-x, 202-x, 203-x, 415-x, 417-x

**Regras:**
- Salários, pro-labore, férias, horas extras
- INSS, FGTS
- Vale refeição e outros benefícios

**Exemplos:**
- `201-6 - Salarios e Ordenados`
- `201-5 - Pro-Labore`
- `203-0 - INSS`
- `203-1 - FGTS`
- `417-0 - Vale Refeicao`

### 7. Despesas Administrativas

**Códigos:** 420-x, 424-x, 425-x, 434-x

**Regras:**
- Telefonia, limpeza, consultoria
- Contabilidade, despesas processuais
- Feiras e eventos, impostos retidos

**Exemplos:**
- `420-7 - Telefonia`
- `425-6 - Contabilidade`
- `425-9 - Limpeza`
- `434-5 - Feiras e Eventos`

### 8. Despesas Financeiras

**Códigos:** 432-x, 431-5

**Regras:**
- Juros pagos
- Despesas bancárias

**Exemplos:**
- `432-0 - Juros Passivos`
- `431-5 - Despesas Bancarias`

### 9. Receitas Financeiras

**Códigos:** 303-4

**Regra:** Conta 303-4 + label contendo "desconto.*obtid"

**Exemplos:**
- `303-4 - Descontos Obtidos`

### 10. Investimentos e Outros

**Códigos:** 200-8, 211-x

**Regras:**
- Empréstimos e financiamentos
- Tributos parcelados

**Exemplos:**
- `200-8 - Pagto Empréstimos e Financiamentos`
- `211-1 - Tributos Parcelados`

### 11. Outras Receitas/Despesas

**Regra:** Contas que não se enquadram nas categorias acima

---

## 💰 Regras de Cálculo

### Sinal do Valor

**No F360:**
- Tipo "A Receber" → multiplicar por +1 (receita)
- Tipo "A Pagar" → multiplicar por -1 (despesa)

**No DRE (Supabase):**
- Campo `amount`: sempre valor **absoluto** (positivo)
- Campo `nature`: 
  - `'receita'` se valor original ≥ 0
  - `'despesa'` se valor original < 0

**No DFC (Supabase):**
- Campo `kind`:
  - `'in'` para entradas (valor ≥ 0)
  - `'out'` para saídas (valor < 0)
- Campo `amount`: sempre valor **absoluto** (positivo)

### Agregação

**DRE:**
```
Agrupar por: company_cnpj + date (mês) + account (nome da conta)
Somar: valor absoluto
```

**DFC:**
```
Agrupar por: company_cnpj + date (mês) + category + kind
Somar: valor absoluto
```

---

## 🔢 Exemplo Prático

### Dados de Entrada (F360)

```
Tipo: A Receber
Competência: 01/2025
Liquidação: 10/01/2025
Plano de Contas: 102-1 - Vendas de Produtos - PIX
Valor Líquido: 5000.00
```

### Saída DRE

```json
{
  "company_cnpj": "26888098000159",
  "company_nome": "GRUPO VOLPE - MATRIZ",
  "date": "2025-01-01",
  "account": "102-1 - Vendas de Produtos - PIX",
  "nature": "receita",
  "amount": 5000.00
}
```

### Saída DFC

```json
{
  "company_cnpj": "26888098000159",
  "company_nome": "GRUPO VOLPE - MATRIZ",
  "date": "2025-01-01",
  "category": "Receitas Operacionais",
  "kind": "in",
  "amount": 5000.00
}
```

---

## 🎯 Filtros e Visualizações

### Filtro por Empresa

**Comportamento:**
- Usuário seleciona uma empresa específica
- Dashboard mostra apenas dados daquela empresa
- DRE e DFC filtrados por `company_cnpj`

### Visão Consolidada (Grupo)

**Comportamento:**
- Agregar dados das 13 empresas
- Somar valores por conta e mês
- Apresentar visão consolidada do grupo

**Exemplo SQL:**
```sql
SELECT 
  date,
  account,
  SUM(amount) as total
FROM dre_entries
WHERE date >= '2025-01-01'
  AND date < '2025-02-01'
GROUP BY date, account
ORDER BY total DESC;
```

---

## 📅 Período de Análise

**Padrão:** Janeiro a Dezembro de 2025

**Formato de Data:** YYYY-MM-01 (sempre dia 01 do mês)

**Exemplos:**
- 2025-01-01 → Janeiro/2025
- 2025-12-01 → Dezembro/2025

---

## 🚨 Validações e Regras de Qualidade

### Filtros de Status

**Status a Desconsiderar:**
- ❌ Registros com status contendo "baixado" ou "baixados"
- ❌ Registros com status contendo "renegociado" ou "renegociados"

**Aplicação:**
- Esses registros devem ser **excluídos** do processamento
- Validação case-insensitive (maiúsculas/minúsculas)

### DFC - Filtro de Conciliação

**Regra Específica para DFC:**
- ✅ Processar **APENAS** registros com status = "conciliado"
- ❌ Ignorar todos os demais status no DFC

**Nota:** Esta regra é exclusiva do DFC. O DRE não possui este filtro.

### Normalização de Valores

**Valor Bruto:**
- ✅ Todos os valores devem ser convertidos para **positivos**
- ✅ Independente de ser entrada ou saída
- ✅ O tipo (entrada/saída) é determinado pela natureza/kind, não pelo sinal

**Exemplos:**
```javascript
// Antes
valor_bruto: -1500.00  // Saída
valor_bruto: 2000.00   // Entrada

// Depois
amount: 1500.00, kind: 'out'   // DFC
amount: 2000.00, kind: 'in'    // DFC
amount: 1500.00, nature: 'despesa' // DRE
amount: 2000.00, nature: 'receita' // DRE
```

### Registros Válidos

**Obrigatório:**
- ✅ Valor Líquido > 0
- ✅ Código da conta presente
- ✅ Competência (DRE) ou Liquidação (DFC) preenchida
- ✅ Status não contém "baixado", "baixados", "renegociado" ou "renegociados"
- ✅ Para DFC: Status = "conciliado"

**Opcional:**
- Cliente/Fornecedor
- Centro de Custo
- Observações

### Tratamento de Erros

**Registros Ignorados:**
- Valor = 0
- Sem código de conta
- Sem data de competência (DRE) ou liquidação (DFC)
- Status contém: "baixado", "baixados", "renegociado", "renegociados"
- Para DFC: Status diferente de "conciliado"

**Normalização:**
- Remover espaços extras
- Converter para lowercase em comparações
- Extrair código numérico do plano de contas
- **Converter todos os valores para positivos (Math.abs)**
- Determinar tipo (entrada/saída) pela natureza da conta, não pelo sinal

---

## 🔄 Atualização de Dados

### Processo de Reimportação

1. **Limpar dados antigos** da empresa específica
   ```sql
   DELETE FROM dre_entries WHERE company_cnpj = '[CNPJ]';
   DELETE FROM cashflow_entries WHERE company_cnpj = '[CNPJ]';
   ```

2. **Processar novo arquivo** F360

3. **Inserir novos dados**

**Comando:**
```bash
node scripts/processar_grupo_volpe.mjs --cnpj=[CNPJ] --upload=true
```

### Frequência Recomendada

- **Mensal:** Para fechamento contábil
- **Semanal:** Para acompanhamento gerencial
- **Diário:** Para gestão de caixa (DFC)

---

## 📊 Indicadores e Métricas

### KPIs Principais

1. **Receita Total**
   ```sql
   SUM(amount) WHERE nature = 'receita'
   ```

2. **Despesa Total**
   ```sql
   SUM(amount) WHERE nature = 'despesa'
   ```

3. **Lucro/Prejuízo**
   ```sql
   Receita Total - Despesa Total
   ```

4. **Margem Bruta**
   ```sql
   (Receita - CMV) / Receita * 100
   ```

5. **Fluxo de Caixa**
   ```sql
   SUM(amount WHERE kind='in') - SUM(amount WHERE kind='out')
   ```

---

## 🛡️ Constraints do Supabase

### Tabela: dre_entries

- `nature` ∈ {'receita', 'despesa'}
- `amount` ≥ 0
- `date` formato DATE

### Tabela: cashflow_entries

- `kind` ∈ {'in', 'out'}
- `amount` ≥ 0
- `date` formato DATE

---

## 📝 Notas Importantes

1. **Valores Absolutos:** Todos os valores em `amount` são **obrigatoriamente positivos** (usar `Math.abs()` na conversão). O sinal é determinado por `nature` (DRE) ou `kind` (DFC), nunca pelo valor numérico.

2. **Filtros de Status:**
   - **Desconsiderar:** Status contendo "baixado", "baixados", "renegociado" ou "renegociados"
   - **DFC Específico:** Processar APENAS registros com status = "conciliado"

3. **Categorização Automática:** O sistema categoriza automaticamente com base no código da conta. Regras podem ser ajustadas em `categorizarConta()`.

4. **Múltiplas Contas 102-1:** Vendas podem ter diferentes formas de recebimento (PIX, Boleto, Cartão) - cada uma é uma linha separada.

5. **Competência vs Caixa:** Mesma transação aparece em meses diferentes no DRE e DFC se a competência e liquidação forem diferentes.

---

**Versão:** 1.0  
**Última Atualização:** 17/11/2024  
**Autor:** FinApp Team
