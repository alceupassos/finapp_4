# 📋 Regras de Processamento de Dados - FinApp Grupo Volpe

## 🎯 Visão Geral

Este documento define as regras específicas para processamento de dados do sistema F360 e geração de DRE/DFC.

**Última atualização:** 17/11/2025  
**Versão:** 2.0

---

## 🚫 Filtros de Status

### Regra 1: Status a Desconsiderar (DRE e DFC)

**Objetivo:** Excluir registros que foram baixados ou renegociados do processamento.

**Implementação:**
```javascript
// Campo: status (verificar coluna exata no Excel - pode ser __EMPTY_14 ou similar)
const status = String(row['__EMPTY_14'] || '').trim().toLowerCase()

// Desconsiderar se contém:
const statusInvalidos = ['baixado', 'baixados', 'renegociado', 'renegociados']
const isStatusInvalido = statusInvalidos.some(s => status.includes(s))

if (isStatusInvalido) return null // Ignorar este registro
```

**Exemplos de status a IGNORAR:**
- ✗ "Baixado"
- ✗ "baixados"
- ✗ "Título Baixado"
- ✗ "Renegociado"
- ✗ "renegociados"
- ✗ "Parcela renegociada"

**Exemplos de status VÁLIDOS:**
- ✓ "Aberto"
- ✓ "Conciliado"
- ✓ "Pago"
- ✓ "Recebido"
- ✓ null ou vazio

---

### Regra 2: Filtro Específico para DFC

**Objetivo:** No DFC (Demonstrativo de Fluxo de Caixa), processar APENAS registros conciliados.

**Implementação:**
```javascript
// Apenas para função aggregateDFC
function aggregateDFC(transactions, cnpj, companyName, planNames) {
  const buckets = new Map()

  for (const tx of transactions) {
    if (!tx.liquidacao) continue
    
    // NOVO: Filtro específico DFC - APENAS conciliados
    const status = (tx.status || '').toLowerCase()
    if (status !== 'conciliado') continue
    
    // ... resto do processamento
  }
}
```

**Importante:**
- ✅ DFC: Processar **SOMENTE** status = "conciliado"
- ✅ DRE: Processar todos os status **EXCETO** baixado/renegociado
- Esta regra é exclusiva do DFC

---

## 💰 Normalização de Valores

### Regra 3: Valores Sempre Positivos

**Objetivo:** Garantir que todos os valores em `amount` sejam positivos, independente da natureza (entrada/saída).

**Implementação:**

#### No loadTransactions (conversão inicial):
```javascript
// ANTES (incorreto):
const sign = /receber/i.test(tipo) ? 1 : -1
const signedValue = value * sign
return {
  value: signedValue, // pode ser negativo
  // ...
}

// DEPOIS (correto):
const value = Math.abs(parseNumber(row['__EMPTY_8'])) // SEMPRE POSITIVO
return {
  value: value, // sempre positivo
  tipo: tipo, // guardar tipo original para determinar natureza depois
  // ...
}
```

#### No aggregateDRE:
```javascript
// ANTES (incorreto):
const amount = Math.round(Math.abs(entry.total) * 100) / 100

// DEPOIS (correto):
const amount = Math.round(entry.total * 100) / 100 // total já deve ser positivo
if (amount <= 0) return null // segurança adicional

const nature = /receber|receita/i.test(entry.tipo) ? 'receita' : 'despesa'
```

#### No aggregateDFC:
```javascript
// ANTES (incorreto):
const amount = Math.round(Math.abs(entry.total) * 100) / 100

// DEPOIS (correto):
const amount = Math.round(entry.total * 100) / 100 // total já deve ser positivo
if (amount <= 0) return null // segurança adicional

const kind = /receber|receita/i.test(entry.tipo) ? 'in' : 'out'
```

**Regra de Ouro:**
```
✅ Valor numérico: SEMPRE positivo (usar Math.abs)
✅ Direção (entrada/saída): Determinada por nature (DRE) ou kind (DFC)
✅ Base de determinação: Tipo original da transação (A Receber / A Pagar)
```

**Exemplos:**

| Tipo Original | Valor Excel | Valor Processado | DRE nature | DFC kind |
|--------------|-------------|------------------|------------|----------|
| A Receber    | 1000        | 1000             | receita    | in       |
| A Receber    | -1000       | 1000             | receita    | in       |
| A Pagar      | 500         | 500              | despesa    | out      |
| A Pagar      | -500        | 500              | despesa    | out      |

---

## 📊 Mapeamento de Colunas Excel

### Estrutura da Aba "Relatório Unificado"

```javascript
const mapping = {
  '__EMPTY': 'Tipo (A Receber / A Pagar)',
  '__EMPTY_3': 'Data Emissão',
  '__EMPTY_4': 'Data Vencimento',
  '__EMPTY_5': 'Data Liquidação',
  '__EMPTY_7': 'Centro de Custo',
  '__EMPTY_8': 'Valor Líquido',
  '__EMPTY_9': 'Categoria',
  '__EMPTY_10': 'Observações',
  '__EMPTY_11': 'Competência (MM/YYYY)',
  '__EMPTY_12': 'Plano de Contas (XXX-X - Nome)',
  '__EMPTY_13': 'Cliente/Fornecedor',
  '__EMPTY_14': 'Status' // ADICIONAR - verificar coluna exata
}
```

**Nota:** A coluna de Status pode variar. Verificar no Excel qual é a coluna exata que contém o status da transação.

---

## ✅ Checklist de Validação

Antes de processar cada registro:

- [ ] Valor líquido > 0
- [ ] Código da conta presente
- [ ] Competência (DRE) ou Liquidação (DFC) preenchida
- [ ] Status **NÃO** contém: baixado, baixados, renegociado, renegociados
- [ ] Para DFC: Status = "conciliado"
- [ ] Valor convertido para positivo com Math.abs()
- [ ] Tipo (A Receber/A Pagar) preservado para determinar natureza/kind

---

## 🔄 Fluxo de Processamento Atualizado

```
1. Ler linha do Excel
   ↓
2. Validar campos obrigatórios (valor, código, data)
   ↓
3. Verificar status (filtro de baixado/renegociado)
   ↓
4. Converter valor para positivo (Math.abs)
   ↓
5. Guardar tipo original (A Receber/A Pagar)
   ↓
6. Para DRE: 
   - Usar data de competência
   - Determinar nature baseado no tipo
   ↓
7. Para DFC:
   - Usar data de liquidação
   - Verificar status = "conciliado"
   - Determinar kind baseado no tipo
   ↓
8. Agregar e inserir no Supabase
```

---

## 📝 Exemplos de Código Completo

### loadTransactions (atualizado):
```javascript
function loadTransactions(inputDir, cnpj) {
  const filePath = path.join(inputDir, `${cnpj}.xlsx`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`)
  }
  
  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets['Relatório Unificado']
  if (!sheet) throw new Error(`Aba "Relatório Unificado" não encontrada`)
  
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  
  return rows.slice(1).map(row => {
    // 1. Extrair campos
    const tipo = String(row['__EMPTY'] || '').trim()
    const competencia = parseCompetencia(row['__EMPTY_11'])
    const liquidacao = parseDate(row['__EMPTY_5'] || row['__EMPTY_4'] || row['__EMPTY_3'])
    const rawValue = parseNumber(row['__EMPTY_8'])
    const code = extractCode(row['__EMPTY_12'])
    const planName = String(row['__EMPTY_12'] || '').trim()
    const status = String(row['__EMPTY_14'] || '').trim() // NOVO
    
    // 2. Validações básicas
    if (!rawValue || !code) return null
    
    // 3. NOVO: Filtro de status (baixado/renegociado)
    const statusLower = status.toLowerCase()
    const statusInvalidos = ['baixado', 'baixados', 'renegociado', 'renegociados']
    if (statusInvalidos.some(s => statusLower.includes(s))) {
      return null // Ignorar este registro
    }
    
    // 4. NOVO: Converter valor para positivo
    const value = Math.abs(rawValue)
    
    return {
      tipo,
      competencia,
      liquidacao,
      value, // SEMPRE POSITIVO
      status, // NOVO
      accountCode: code,
      planName,
      fornecedor: String(row['__EMPTY_13'] || '').trim(),
      centroCusto: String(row['__EMPTY_7'] || '').trim(),
      categoria: String(row['__EMPTY_9'] || '').trim(),
      observation: String(row['__EMPTY_10'] || '').trim()
    }
  }).filter(Boolean)
}
```

### aggregateDFC (atualizado):
```javascript
function aggregateDFC(transactions, cnpj, companyName, planNames) {
  const buckets = new Map()

  for (const tx of transactions) {
    if (!tx.liquidacao) continue
    
    // NOVO: Filtro específico DFC - APENAS conciliados
    if (tx.status.toLowerCase() !== 'conciliado') continue
    
    const monthKey = tx.liquidacao.substring(0, 7)
    const monthDate = `${monthKey}-01`
    const { dfcGroup } = categorizarConta(tx.planName, tx.accountCode)
    const accountLabel = tx.planName || planNames[tx.accountCode] || `Conta ${tx.accountCode}`
    const key = `${monthDate}|${accountLabel}`

    if (!buckets.has(key)) {
      buckets.set(key, {
        company_cnpj: cnpj,
        company_nome: companyName,
        date: monthDate,
        account: accountLabel,
        group: dfcGroup,
        total: 0,
        tipo: tx.tipo // NOVO: guardar tipo
      })
    }

    const entry = buckets.get(key)
    entry.total += tx.value // tx.value já é positivo
  }

  const result = Array.from(buckets.values()).map(entry => {
    const amount = Math.round(entry.total * 100) / 100
    if (amount <= 0) return null
    
    // Determinar kind baseado no tipo original
    const kind = /receber/i.test(entry.tipo) ? 'in' : 'out'
    
    return {
      company_cnpj: entry.company_cnpj,
      company_nome: entry.company_nome,
      date: entry.date,
      account: entry.account,
      kind,
      amount, // já positivo
      created_at: new Date().toISOString()
    }
  })

  return result.filter(Boolean)
}
```

---

## 🚨 Avisos Importantes

1. **Coluna de Status:** Verificar qual é a coluna exata no Excel que contém o status. Pode não ser `__EMPTY_14`. Inspecionar o arquivo primeiro.

2. **Case Insensitive:** Todos os filtros de status devem ser case-insensitive (.toLowerCase()).

3. **Retroatividade:** Ao atualizar o script, **reprocessar todos os dados** para garantir consistência.

4. **Testes:** Após implementação, validar:
   - Nenhum registro com status "baixado" ou "renegociado" no banco
   - DFC contém apenas registros com status "conciliado"
   - Todos os valores em amount são positivos
   - Nature/kind corretos baseados no tipo original

---

**Documento mantido por:** FinApp Team  
**Próxima revisão:** Após cada atualização de regras de negócio
