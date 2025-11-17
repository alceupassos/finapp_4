# 📊 Plano de Importação - Grupo Volpe

**Data**: 16 de novembro de 2025  
**Localização**: `avant/integracao/f360/`  
**Objetivo**: Importar dados financeiros de todas as empresas do Grupo Volpe para o Supabase

---

## 📁 Inventário de Arquivos Encontrados

### Empresas do Grupo (13 CNPJs)
```
26888098000159.xlsx  ← Matriz (VOLPE principal)
26888098000230.xlsx
26888098000310.xlsx
26888098000400).xlsx ⚠️ Tem parêntese no nome
26888098000582.xlsx
26888098000663.xlsx
26888098000744.xlsx
26888098000825.xlsx
26888098000906.xlsx
26888098001040.xlsx
26888098001120.xlsx
26888098001201.xlsx
26888098001392.xlsx
```

### Arquivos Especiais
```
PlanoDeContas.xlsx       ← Plano de contas unificado para todas empresas
DRE-202511141757__.xlsx  ← DRE consolidado (possivelmente da matriz 0159)
```

---

## 🎯 Estrutura de Importação

### Fase 1: Análise de Estrutura dos Arquivos

#### 1.1 Inspecionar PlanoDeContas.xlsx
```bash
# Verificar estrutura do plano de contas
node scripts/inspect_excel.mjs avant/integracao/f360/PlanoDeContas.xlsx
```

**Objetivo**: Mapear estrutura hierárquica de contas contábeis
- Código da conta
- Nome da conta
- Tipo (receita/despesa/ativo/passivo)
- Nível hierárquico

#### 1.2 Inspecionar arquivo de empresa (amostra)
```bash
# Analisar estrutura do arquivo da matriz
node scripts/inspect_excel.mjs avant/integracao/f360/26888098000159.xlsx
```

**Informações esperadas**:
- Abas disponíveis (DRE, DFC, Balancete, etc.)
- Estrutura de colunas
- Formato de datas
- Valores numéricos vs strings

#### 1.3 Inspecionar DRE consolidado
```bash
node scripts/inspect_excel.mjs avant/integracao/f360/DRE-202511141757__.xlsx
```

---

### Fase 2: Preparação do Banco de Dados

#### 2.1 Criar tabela de plano de contas
```sql
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  account_type VARCHAR(50), -- receita, despesa, ativo, passivo, etc
  parent_code VARCHAR(50),
  level INTEGER,
  is_analytical BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_chart_code ON chart_of_accounts(code);
```

#### 2.2 Criar tabela de empresas (se não existir)
```sql
CREATE TABLE IF NOT EXISTS companies (
  id BIGSERIAL PRIMARY KEY,
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  is_holding BOOLEAN DEFAULT false,
  parent_cnpj VARCHAR(14),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.3 Verificar tabelas existentes
- `dre_entries` ✅ (já existe)
- `cashflow_entries` ✅ (já existe)
- `integration_f360` ✅ (já existe)

---

### Fase 3: Scripts de Importação

#### 3.1 Script: Importar Plano de Contas
**Arquivo**: `scripts/import_chart_of_accounts.mjs`

```javascript
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function importChartOfAccounts() {
  const workbook = XLSX.readFile('avant/integracao/f360/PlanoDeContas.xlsx')
  const sheetName = workbook.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
  
  const accounts = rows.map(row => ({
    code: row['Código'] || row['Codigo'] || row['code'],
    name: row['Nome'] || row['Descrição'] || row['name'],
    account_type: row['Tipo'] || row['type'],
    parent_code: row['Conta Pai'] || null,
    level: row['Nível'] || calculateLevel(row['Código']),
    is_analytical: row['Analítica'] !== false
  }))
  
  // Upsert em lotes de 100
  for (let i = 0; i < accounts.length; i += 100) {
    const batch = accounts.slice(i, i + 100)
    const { error } = await supabase
      .from('chart_of_accounts')
      .upsert(batch, { onConflict: 'code' })
    
    if (error) console.error(`Erro lote ${i}:`, error)
    else console.log(`✅ Importados ${batch.length} contas`)
  }
}

function calculateLevel(code) {
  if (!code) return 0
  return code.split('.').length
}

importChartOfAccounts()
```

#### 3.2 Script: Importar Empresas do Grupo
**Arquivo**: `scripts/import_group_companies.mjs`

```javascript
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const COMPANIES = [
  { cnpj: '26888098000159', name: 'VOLPE MATRIZ', is_holding: true },
  { cnpj: '26888098000230', name: 'VOLPE FILIAL 01', parent_cnpj: '26888098000159' },
  { cnpj: '26888098000310', name: 'VOLPE FILIAL 02', parent_cnpj: '26888098000159' },
  { cnpj: '26888098000400', name: 'VOLPE FILIAL 03', parent_cnpj: '26888098000159' },
  { cnpj: '26888098000582', name: 'VOLPE FILIAL 04', parent_cnpj: '26888098000159' },
  { cnpj: '26888098000663', name: 'VOLPE FILIAL 05', parent_cnpj: '26888098000159' },
  { cnpj: '26888098000744', name: 'VOLPE FILIAL 06', parent_cnpj: '26888098000159' },
  { cnpj: '26888098000825', name: 'VOLPE FILIAL 07', parent_cnpj: '26888098000159' },
  { cnpj: '26888098000906', name: 'VOLPE FILIAL 08', parent_cnpj: '26888098000159' },
  { cnpj: '26888098001040', name: 'VOLPE FILIAL 09', parent_cnpj: '26888098000159' },
  { cnpj: '26888098001120', name: 'VOLPE FILIAL 10', parent_cnpj: '26888098000159' },
  { cnpj: '26888098001201', name: 'VOLPE FILIAL 11', parent_cnpj: '26888098000159' },
  { cnpj: '26888098001392', name: 'VOLPE FILIAL 12', parent_cnpj: '26888098000159' },
]

async function importCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .upsert(COMPANIES, { onConflict: 'cnpj' })
  
  if (error) {
    console.error('❌ Erro ao importar empresas:', error)
  } else {
    console.log(`✅ ${COMPANIES.length} empresas cadastradas`)
  }
}

importCompanies()
```

#### 3.3 Script: Importar DRE de Cada Empresa
**Arquivo**: `scripts/import_all_dre.mjs`

```javascript
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const COMPANIES_DIR = 'avant/integracao/f360'
const CNPJ_PATTERN = /^(\d{14})\.xlsx?$/

async function importAllDRE() {
  const files = fs.readdirSync(COMPANIES_DIR)
  
  for (const file of files) {
    const match = file.match(/^(\d{14})/)
    if (!match) continue
    
    const cnpj = match[1]
    const filePath = path.join(COMPANIES_DIR, file)
    
    console.log(`\n📄 Processando ${cnpj}...`)
    
    try {
      const workbook = XLSX.readFile(filePath)
      
      // Procurar aba DRE (pode ter nomes variados)
      const dreSheet = workbook.SheetNames.find(name => 
        /DRE|Demonstra.*Resultado|Income/i.test(name)
      )
      
      if (!dreSheet) {
        console.warn(`⚠️  Aba DRE não encontrada em ${file}`)
        continue
      }
      
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[dreSheet])
      const entries = await parseDRERows(rows, cnpj)
      
      // Inserir em lotes
      for (let i = 0; i < entries.length; i += 100) {
        const batch = entries.slice(i, i + 100)
        const { error } = await supabase
          .from('dre_entries')
          .upsert(batch, { 
            onConflict: 'company_cnpj,date,account',
            ignoreDuplicates: false 
          })
        
        if (error) {
          console.error(`❌ Erro no lote ${i}:`, error.message)
        } else {
          console.log(`✅ ${batch.length} registros DRE inseridos`)
        }
      }
      
      console.log(`✅ ${cnpj}: ${entries.length} registros DRE processados`)
      
    } catch (err) {
      console.error(`❌ Erro ao processar ${file}:`, err.message)
    }
  }
}

async function parseDRERows(rows, cnpj) {
  const entries = []
  
  for (const row of rows) {
    // Adaptar campos conforme estrutura real do Excel
    const date = parseDate(row['Data'] || row['Mês'] || row['Período'])
    const account = row['Conta'] || row['Descrição'] || row['Account']
    const amount = parseFloat(row['Valor'] || row['Value'] || 0)
    const nature = detectNature(account, amount)
    
    if (!date || !account) continue
    
    entries.push({
      company_cnpj: cnpj,
      company_nome: `VOLPE ${cnpj}`,
      date: date,
      account: account,
      nature: nature,
      amount: amount.toString(),
      created_at: new Date().toISOString()
    })
  }
  
  return entries
}

function parseDate(dateStr) {
  if (!dateStr) return null
  
  // Tentar diferentes formatos
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{4})(\d{2})(\d{2})/, // YYYYMMDD
  ]
  
  for (const regex of formats) {
    const match = String(dateStr).match(regex)
    if (match) {
      if (regex === formats[1]) {
        return `${match[3]}-${match[2]}-${match[1]}`
      }
      return `${match[1]}-${match[2]}-${match[3]}`
    }
  }
  
  // Fallback: Excel serial date
  if (typeof dateStr === 'number') {
    const excelEpoch = new Date(1900, 0, 1)
    const date = new Date(excelEpoch.getTime() + (dateStr - 2) * 86400000)
    return date.toISOString().split('T')[0]
  }
  
  return null
}

function detectNature(account, amount) {
  const accountLower = String(account).toLowerCase()
  
  if (/receita|revenue|income/.test(accountLower)) return 'receita'
  if (/custo|cost|cogs/.test(accountLower)) return 'custo'
  if (/despesa|expense|opex/.test(accountLower)) return 'despesa'
  
  return amount >= 0 ? 'receita' : 'despesa'
}

importAllDRE()
```

#### 3.4 Script: Importar DFC de Cada Empresa
**Arquivo**: `scripts/import_all_dfc.mjs`

```javascript
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const COMPANIES_DIR = 'avant/integracao/f360'

async function importAllDFC() {
  const files = fs.readdirSync(COMPANIES_DIR)
  
  for (const file of files) {
    const match = file.match(/^(\d{14})/)
    if (!match) continue
    
    const cnpj = match[1]
    const filePath = path.join(COMPANIES_DIR, file)
    
    console.log(`\n💰 Processando DFC ${cnpj}...`)
    
    try {
      const workbook = XLSX.readFile(filePath)
      
      // Procurar aba DFC/Fluxo de Caixa
      const dfcSheet = workbook.SheetNames.find(name => 
        /DFC|Fluxo.*Caixa|Cash.*Flow/i.test(name)
      )
      
      if (!dfcSheet) {
        console.warn(`⚠️  Aba DFC não encontrada em ${file}`)
        continue
      }
      
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[dfcSheet])
      const entries = await parseDFCRows(rows, cnpj)
      
      // Inserir em lotes
      for (let i = 0; i < entries.length; i += 500) {
        const batch = entries.slice(i, i + 500)
        const { error } = await supabase
          .from('cashflow_entries')
          .upsert(batch, { 
            onConflict: 'company_cnpj,date,category',
            ignoreDuplicates: false 
          })
        
        if (error) {
          console.error(`❌ Erro no lote ${i}:`, error.message)
        } else {
          console.log(`✅ ${batch.length} registros DFC inseridos`)
        }
      }
      
      console.log(`✅ ${cnpj}: ${entries.length} registros DFC processados`)
      
    } catch (err) {
      console.error(`❌ Erro ao processar ${file}:`, err.message)
    }
  }
}

async function parseDFCRows(rows, cnpj) {
  const entries = []
  
  for (const row of rows) {
    const date = parseDate(row['Data'] || row['Date'] || row['Período'])
    const category = row['Categoria'] || row['Descrição'] || row['Category'] || 'Outros'
    const entrada = parseFloat(row['Entrada'] || row['Entradas'] || 0)
    const saida = parseFloat(row['Saída'] || row['Saidas'] || 0)
    
    if (!date) continue
    
    // Se tem entrada
    if (entrada > 0) {
      entries.push({
        company_cnpj: cnpj,
        company_nome: `VOLPE ${cnpj}`,
        date: date,
        kind: 'in',
        category: category,
        amount: entrada.toString(),
        created_at: new Date().toISOString()
      })
    }
    
    // Se tem saída
    if (saida > 0) {
      entries.push({
        company_cnpj: cnpj,
        company_nome: `VOLPE ${cnpj}`,
        date: date,
        kind: 'out',
        category: category,
        amount: saida.toString(),
        created_at: new Date().toISOString()
      })
    }
  }
  
  return entries
}

function parseDate(dateStr) {
  // Mesma implementação do script DRE
  if (!dateStr) return null
  
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{4})(\d{2})(\d{2})/,
  ]
  
  for (const regex of formats) {
    const match = String(dateStr).match(regex)
    if (match) {
      if (regex === formats[1]) {
        return `${match[3]}-${match[2]}-${match[1]}`
      }
      return `${match[1]}-${match[2]}-${match[3]}`
    }
  }
  
  if (typeof dateStr === 'number') {
    const excelEpoch = new Date(1900, 0, 1)
    const date = new Date(excelEpoch.getTime() + (dateStr - 2) * 86400000)
    return date.toISOString().split('T')[0]
  }
  
  return null
}

importAllDFC()
```

---

### Fase 4: Validação e Limpeza

#### 4.1 Script de Validação
**Arquivo**: `scripts/validate_import.mjs`

```javascript
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function validateImport() {
  console.log('📊 Validando importação...\n')
  
  // 1. Contar empresas
  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
  console.log(`✅ Empresas cadastradas: ${companyCount}`)
  
  // 2. Contar registros DRE por empresa
  const { data: dreStats } = await supabase
    .from('dre_entries')
    .select('company_cnpj')
  
  const dreByCnpj = dreStats.reduce((acc, row) => {
    acc[row.company_cnpj] = (acc[row.company_cnpj] || 0) + 1
    return acc
  }, {})
  
  console.log('\n📈 Registros DRE por empresa:')
  Object.entries(dreByCnpj).forEach(([cnpj, count]) => {
    console.log(`  ${cnpj}: ${count} registros`)
  })
  
  // 3. Contar registros DFC por empresa
  const { data: dfcStats } = await supabase
    .from('cashflow_entries')
    .select('company_cnpj')
  
  const dfcByCnpj = dfcStats.reduce((acc, row) => {
    acc[row.company_cnpj] = (acc[row.company_cnpj] || 0) + 1
    return acc
  }, {})
  
  console.log('\n💰 Registros DFC por empresa:')
  Object.entries(dfcByCnpj).forEach(([cnpj, count]) => {
    console.log(`  ${cnpj}: ${count} registros`)
  })
  
  // 4. Verificar plano de contas
  const { count: chartCount } = await supabase
    .from('chart_of_accounts')
    .select('*', { count: 'exact', head: true })
  console.log(`\n📋 Contas no plano de contas: ${chartCount}`)
  
  // 5. Verificar datas
  const { data: dateRange } = await supabase
    .from('dre_entries')
    .select('date')
    .order('date', { ascending: true })
    .limit(1)
  
  const { data: dateRangeEnd } = await supabase
    .from('dre_entries')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
  
  console.log(`\n📅 Período DRE: ${dateRange[0]?.date} a ${dateRangeEnd[0]?.date}`)
}

validateImport()
```

#### 4.2 Limpar dados duplicados
```sql
-- Remover duplicatas em dre_entries (manter o mais recente)
DELETE FROM dre_entries a USING (
  SELECT MIN(id) as id, company_cnpj, date, account
  FROM dre_entries 
  GROUP BY company_cnpj, date, account 
  HAVING COUNT(*) > 1
) b
WHERE a.company_cnpj = b.company_cnpj 
  AND a.date = b.date 
  AND a.account = b.account 
  AND a.id != b.id;

-- Remover duplicatas em cashflow_entries
DELETE FROM cashflow_entries a USING (
  SELECT MIN(id) as id, company_cnpj, date, category, kind
  FROM cashflow_entries 
  GROUP BY company_cnpj, date, category, kind 
  HAVING COUNT(*) > 1
) b
WHERE a.company_cnpj = b.company_cnpj 
  AND a.date = b.date 
  AND a.category = b.category 
  AND a.kind = b.kind 
  AND a.id != b.id;
```

---

### Fase 5: Consolidação (Matriz 0159)

#### 5.1 Importar DRE Consolidado
Se `DRE-202511141757__.xlsx` contém dados consolidados da matriz:

```javascript
// Script específico para DRE consolidado
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const workbook = XLSX.readFile('avant/integracao/f360/DRE-202511141757__.xlsx')
// ... processar conforme estrutura específica deste arquivo
```

---

## 📋 Checklist de Execução

### Preparação
- [ ] Verificar estrutura dos arquivos Excel (abas, colunas)
- [ ] Corrigir nome do arquivo `26888098000400).xlsx` (remover parêntese)
- [ ] Instalar dependências: `pnpm add xlsx @supabase/supabase-js dotenv`
- [ ] Criar pasta `scripts/` se não existir
- [ ] Configurar `.env.local` com credenciais Supabase

### Importação
- [ ] Fase 1: Criar tabela `chart_of_accounts`
- [ ] Fase 2: Executar `import_chart_of_accounts.mjs`
- [ ] Fase 3: Executar `import_group_companies.mjs`
- [ ] Fase 4: Executar `import_all_dre.mjs`
- [ ] Fase 5: Executar `import_all_dfc.mjs`
- [ ] Fase 6: Executar `validate_import.mjs`

### Validação
- [ ] Verificar contagem de registros por empresa
- [ ] Validar datas (sem valores nulos ou inválidos)
- [ ] Checar valores numéricos (sem NaN ou Infinity)
- [ ] Remover duplicatas
- [ ] Testar queries no dashboard

### Pós-Importação
- [ ] Atualizar `integration_f360` com nomes reais das empresas
- [ ] Configurar filtro por empresa no dashboard
- [ ] Criar views consolidadas (grupo inteiro)
- [ ] Documentar mapping de contas do plano

---

## 🚀 Comandos de Execução

```bash
# 1. Preparação
mkdir -p scripts
pnpm add xlsx @supabase/supabase-js dotenv

# 2. Renomear arquivo problemático
mv "avant/integracao/f360/26888098000400).xlsx" "avant/integracao/f360/26888098000400.xlsx"

# 3. Criar migration para chart_of_accounts
# (via Supabase Dashboard ou mcp_supabase_apply_migration)

# 4. Executar importações
node scripts/import_chart_of_accounts.mjs
node scripts/import_group_companies.mjs
node scripts/import_all_dre.mjs
node scripts/import_all_dfc.mjs

# 5. Validar
node scripts/validate_import.mjs
```

---

## ⚠️ Pontos de Atenção

1. **Arquivo com parêntese**: `26888098000400).xlsx` precisa ser renomeado
2. **Estrutura variável**: Cada Excel pode ter abas com nomes diferentes
3. **Formatos de data**: Excel pode usar serial dates (números)
4. **CNPJ format**: Normalizar para 14 dígitos sem formatação
5. **Performance**: Processar em lotes de 100-500 registros
6. **Duplicatas**: Implementar upsert com conflict resolution
7. **Encoding**: Verificar caracteres especiais (ç, ã, etc)

---

## 📊 Estimativas

- **Empresas**: 13 CNPJs
- **Registros DRE estimados**: ~1.600 × 13 = ~20.000
- **Registros DFC estimados**: ~20.000 × 13 = ~260.000
- **Tempo de importação**: 15-30 minutos (depende da estrutura)
- **Espaço no banco**: ~50-100 MB

---

## 🎯 Resultado Esperado

Após a importação completa:

```sql
-- Todas as 13 empresas cadastradas
SELECT COUNT(*) FROM companies; -- 13

-- Dados DRE de todas empresas
SELECT company_cnpj, COUNT(*) 
FROM dre_entries 
GROUP BY company_cnpj 
ORDER BY company_cnpj;

-- Dados DFC de todas empresas
SELECT company_cnpj, COUNT(*) 
FROM cashflow_entries 
GROUP BY company_cnpj 
ORDER BY company_cnpj;

-- Plano de contas unificado
SELECT COUNT(*) FROM chart_of_accounts; -- ~100-500 contas
```

---

**STATUS**: 📝 Plano criado - Aguardando execução
