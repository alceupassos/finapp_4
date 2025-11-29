# 🔍 DIAGNÓSTICO: Valores Incorretos no Dashboard

**Data:** 29/11/2025  
**Status:** PROBLEMA IDENTIFICADO

---

## 🔴 PROBLEMA

Dashboard mostra valores absurdos:
- **Receita:** R$ 81.545.741,48
- **Despesas:** R$ 167.691.858,86
- **Lucro:** R$ -86.146.117,38

**Valores esperados (Data4Company):**
- Receita Bruta: ~R$ 27.311.717
- Impostos: ~R$ 1.090.906
- Lucro Bruto: ~R$ 26.220.811
- EBITDA: ~R$ 23.200.282
- Lucro Líquido: ~R$ 24.626.606

---

## 📊 RESULTADO DO DIAGNÓSTICO

### Query 1: Estrutura e Totais
```
Total de registros: 658
Registros distintos (por ID): 658
Soma total de amount: R$ 249.237.600,34
Data mínima: 2021-07-01
Data máxima: 2025-11-01
```

**Conclusão:** Não há duplicatas por ID.

### Query 2: Verificar Duplicatas
```
✅ Nenhuma duplicata encontrada (mesma data + conta + valor)
```

**Conclusão:** Não há duplicatas por data/conta/valor.

### Query 3: Distribuição por Natureza
```
despesa:
  Quantidade: 603 registros
  Total: R$ 167.691.858,86
  Média: R$ 278.095,95

receita:
  Quantidade: 55 registros
  Total: R$ 81.545.741,48
  Média: R$ 1.482.649,85
```

**Conclusão:** 
- Os valores no banco estão corretos (não estão em centavos)
- Os totais correspondem exatamente ao que o Dashboard mostra
- **PROBLEMA:** Está somando TODOS os meses desde 2021!

### Query 4: Distribuição por Mês

**Outubro/2025 (mês selecionado):**
```
2025-10:
  Receitas: R$ 0,00
  Despesas: R$ 720.921,09
  Lucro: R$ -720.921,09
  Registros: 1
```

**Outros meses (exemplos):**
```
2024-12:
  Receitas: R$ 5.289.666,20
  Despesas: R$ 13.144.646,52
  Registros: 67

2025-01:
  Receitas: R$ 8.607.898,21
  Despesas: R$ 17.586.984,93
  Registros: 66
```

---

## 🎯 CAUSA RAIZ IDENTIFICADA

**O Dashboard está somando TODOS os meses (2021-2025) ao invés de filtrar apenas outubro/2025!**

### Evidências:
1. **Outubro/2025 tem apenas 1 registro:** Despesas R$ 720.921,09
2. **Dashboard mostra:** Despesas R$ 167.691.858,86
3. **Soma de todos os meses:** R$ 167.691.858,86 (corresponde exatamente!)

### Problema no código:
O `useFinancialData` está processando todos os 658 registros, mas o filtro de mês pode não estar funcionando corretamente.

---

## ✅ CORREÇÕES APLICADAS

### 1. Logs Detalhados Adicionados

**Arquivo:** `src/hooks/useFinancialData.ts`

**Logs adicionados:**
- Total de registros processados
- Mês selecionado para filtro
- Amostra dos primeiros 5 registros
- Quantos registros foram processados vs ignorados
- Quais meses foram processados vs ignorados
- Totais calculados (receita/despesa mês atual e anterior)

### 2. Script de Diagnóstico Criado

**Arquivo:** `scripts/diagnosticar_valores_dre.mjs`

**Funcionalidades:**
- Verifica estrutura e totais
- Detecta duplicatas
- Mostra distribuição por natureza
- Mostra distribuição por mês
- Identifica se valores estão em centavos

---

## 🔍 PRÓXIMOS PASSOS

### 1. Verificar Logs no Console do Browser

Após reiniciar o servidor, verifique no console:

```
🔍 useFinancialData: FILTRO APLICADO
   Mês selecionado: 2025-10
   Filtrando por: 2025-10
   Total de registros DRE: 658
📋 useFinancialData - Amostra dos primeiros 5 registros:
   1. Data: 2025-10-01, Natureza: despesa, Valor: R$ 720.921,09
   ...
📊 useFinancialData: X processados, Y ignorados (fora do mês)
📅 useFinancialData: Meses processados: 2025-10
📅 useFinancialData: Meses ignorados (amostra): 2024-12, 2025-01, ...
💰 useFinancialData: Receita mês atual: R$ 0,00, Despesas: R$ 720.921,09
```

### 2. Verificar se o Filtro Está Funcionando

Se os logs mostrarem que muitos registros estão sendo processados quando deveriam ser ignorados, o problema está no filtro de data.

### 3. Possíveis Causas Adicionais

Se o filtro estiver correto mas os valores ainda estiverem errados:

1. **Múltiplas empresas sendo somadas:**
   - Verificar se `selectedCompanies` contém apenas uma empresa
   - Verificar se `getDRE` está filtrando corretamente por CNPJ

2. **Dados sendo processados múltiplas vezes:**
   - Verificar se `useFinancialData` está sendo chamado múltiplas vezes
   - Verificar se há múltiplos `useEffect` rodando

3. **Formato de data incorreto:**
   - Verificar se `item.data` está no formato correto
   - Verificar se `new Date(item.data)` está parseando corretamente

---

## 📋 HIPÓTESES TESTADAS

| Hipótese | Status | Resultado |
|----------|--------|-----------|
| Duplicação de registros | ❌ | Não há duplicatas |
| Filtro de empresa errado | ⚠️ | Precisa verificar logs |
| Período incorreto | ✅ | **CONFIRMADO** - Somando todos os meses |
| Campo errado | ❌ | Campo `amount` está correto |
| Natureza invertida | ❌ | Natureza está correta |
| Valores em centavos | ❌ | Valores estão em reais |

---

## ✅ CONCLUSÃO

**Problema identificado:** O Dashboard está somando todos os meses (2021-2025) ao invés de filtrar apenas outubro/2025.

**Próximo passo:** Verificar logs no console do browser para confirmar se o filtro está sendo aplicado corretamente.

**Valores esperados para outubro/2025:**
- Receitas: R$ 0,00
- Despesas: R$ 720.921,09
- Lucro: R$ -720.921,09

