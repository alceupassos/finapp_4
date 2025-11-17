import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const DEFAULTS = {
  cnpj: '26888098000159',
  companyName: 'GRUPO VOLPE - MATRIZ',
  inputFile: 'avant/integracao/f360/26888098000159.xlsx',
  planFile: 'avant/integracao/f360/PlanoDeContas.xlsx',
  mappingFile: 'public/dados/mappings/account_group_mapping.json',
  outputDir: 'var/generated'
}

const args = process.argv.slice(2).reduce((acc, curr) => {
  const [key, value] = curr.split('=')
  if (key && value) acc[key.replace(/^--/, '')] = value
  return acc
}, {})

const options = {
  cnpj: args.cnpj || DEFAULTS.cnpj,
  companyName: args.company || DEFAULTS.companyName,
  inputFile: args.input || DEFAULTS.inputFile,
  planFile: args.plan || DEFAULTS.planFile,
  mappingFile: args.mapping || DEFAULTS.mappingFile,
  outputDir: args.output || DEFAULTS.outputDir,
  upload: args.upload === 'true' || args.upload === '1'
}

const supabase = options.upload
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function parseDate(value) {
  if (!value) return null
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  const str = String(value).trim()
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return str
  return null
}

function parseCompetencia(value) {
  if (!value) return null
  const str = String(value).trim()
  const match = str.match(/^(\d{2})\/(\d{4})$/)
  if (match) {
    const [, month, year] = match
    return `${year}-${month}`
  }
  const altMatch = str.match(/^(\d{4})-(\d{2})$/)
  if (altMatch) return str
  return null
}

function parseNumber(value) {
  if (typeof value === 'number') return value
  if (!value) return 0
  const cleaned = String(value).replace(/[^0-9,-.]/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function extractCode(planValue) {
  if (!planValue) return null
  const str = String(planValue).trim()
  const match = str.match(/^(\d{2,}(?:-\d+)*)/)
  return match ? match[1].replace(/\s+/g, '') : null
}

function normalizeLabel(value) {
  if (!value) return null
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase()
}

function loadMapping(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function resolveMapping(mappingData, planName, accountCode) {
  const { items = {}, codeIndex = {} } = mappingData
  const labelKey = normalizeLabel(planName)
  if (labelKey && items[labelKey]) return items[labelKey]

  const candidates = accountCode ? codeIndex[accountCode] : null
  if (candidates && candidates.length === 1) {
    return items[candidates[0]]
  }
  if (candidates && candidates.length > 1) {
    const exact = candidates.find(key => items[key]?.planName === planName)
    if (exact) return items[exact]
  }
  return null
}

function loadPlanNames(planFile) {
  const wb = XLSX.readFile(planFile)
  const sheet = wb.Sheets['Plano de Contas']
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const dict = {}
  for (const row of rows.slice(1)) {
    const name = row['Plano de Contas (Visualizacao/Edicao)']
    const code = extractCode(name)
    if (!code) continue
    dict[code] = String(name || '').trim()
  }
  return dict
}

function loadTransactions(inputFile) {
  const wb = XLSX.readFile(inputFile)
  const sheet = wb.Sheets['Relatório Unificado']
  if (!sheet) throw new Error('Aba "Relatório Unificado" não encontrada')
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return rows.slice(1).map(row => {
    const tipo = String(row['__EMPTY'] || '').trim()
    const competencia = parseCompetencia(row['__EMPTY_11'])
    const date = parseDate(row['__EMPTY_5'] || row['__EMPTY_4'] || row['__EMPTY_3'])
    const value = parseNumber(row['__EMPTY_8'])
    const code = extractCode(row['__EMPTY_12'])
    const planName = String(row['__EMPTY_12'] || '').trim()
    const fornecedor = String(row['__EMPTY_13'] || '').trim()
    const centroCusto = String(row['__EMPTY_7'] || '').trim()
    const categoria = String(row['__EMPTY_9'] || '').trim()
    const observation = String(row['__EMPTY_10'] || '').trim()

    if (!value || !code || !competencia) return null

    const sign = /receber/i.test(tipo) ? 1 : -1
    const signedValue = value * sign
    const referenceDate = date || `${competencia}-01`

    return {
      tipo,
      competencia,
      date: referenceDate,
      monthKey: competencia,
      value: signedValue,
      accountCode: code,
      planName,
      fornecedor,
      centroCusto,
      categoria,
      observation
    }
  }).filter(Boolean)
}

function aggregateDRE(transactions, mappingData, planNames) {
  const buckets = new Map()

  for (const tx of transactions) {
    const mapInfo = resolveMapping(mappingData, tx.planName, tx.accountCode) || {}
    const group = mapInfo.dreGroup || (tx.value >= 0 ? 'Receitas' : 'Despesas')
    const monthDate = `${tx.monthKey}-01`
    const accountLabel = mapInfo.label || mapInfo.planName || tx.planName || planNames[tx.accountCode] || `Conta ${tx.accountCode}`
    const key = `${monthDate}|${accountLabel}`

    if (!buckets.has(key)) {
      buckets.set(key, {
        company_cnpj: options.cnpj,
        company_nome: options.companyName,
        date: monthDate,
        account: accountLabel,
        nature: group,
        total: 0
      })
    }

    const entry = buckets.get(key)
    entry.total += tx.value
  }

  const result = Array.from(buckets.values()).map(entry => {
    const net = entry.total
    const amount = Math.round(Math.abs(net) * 100) / 100
    return {
      company_cnpj: entry.company_cnpj,
      company_nome: entry.company_nome,
      date: entry.date,
      account: entry.account,
      nature: entry.nature,
      amount,
      created_at: new Date().toISOString()
    }
  })

  return result.filter(item => item.amount !== 0)
}

function aggregateDFC(transactions, mappingData) {
  const buckets = new Map()

  for (const tx of transactions) {
    const mapInfo = resolveMapping(mappingData, tx.planName, tx.accountCode) || {}
    const group = mapInfo.dfcGroup || (tx.value >= 0 ? 'Receitas Operacionais' : 'Despesas Operacionais')
    const key = `${tx.monthKey}|${group}`
    if (!buckets.has(key)) {
      buckets.set(key, {
        month: tx.monthKey,
        group,
        entradas: 0,
        saidas: 0
      })
    }
    const bucket = buckets.get(key)
    if (tx.value >= 0) bucket.entradas += tx.value
    else bucket.saidas += Math.abs(tx.value)
  }

  const entries = []
  for (const bucket of buckets.values()) {
    const base = {
      company_cnpj: options.cnpj,
      company_nome: options.companyName,
      category: bucket.group,
      date: `${bucket.month}-01`,
      created_at: new Date().toISOString()
    }
    if (bucket.entradas > 0) {
      entries.push({
        ...base,
        kind: 'in',
        amount: Math.round(bucket.entradas * 100) / 100
      })
    }
    if (bucket.saidas > 0) {
      entries.push({
        ...base,
        kind: 'out',
        amount: Math.round(bucket.saidas * 100) / 100
      })
    }
  }
  return entries
}

async function uploadSupabase(table, rows) {
  if (!supabase) return
  console.log(`
🗑️  Limpando ${table} para CNPJ ${options.cnpj}...`)
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq('company_cnpj', options.cnpj)
  if (deleteError) throw deleteError

  console.log(`📤 Inserindo ${rows.length} registros em ${table}...`)
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await supabase.from(table).insert(batch)
    if (error) throw error
    process.stdout.write(`\r   → ${Math.min(i + 500, rows.length)}/${rows.length}`)
  }
  process.stdout.write('\n')
}

async function main() {
  console.log('🚀 Gerando DRE/DFC a partir das transações da matriz')
  console.log(`   • Arquivo origem: ${options.inputFile}`)
  console.log(`   • Plano de contas: ${options.planFile}`)
  console.log(`   • Mapeamento: ${options.mappingFile}`)

  const mappingData = loadMapping(options.mappingFile)
  const planNames = loadPlanNames(options.planFile)
  const transactions = loadTransactions(options.inputFile)

  console.log(`   • Registros carregados: ${transactions.length}`)

  const dreEntries = aggregateDRE(transactions, mappingData, planNames)
  const dfcEntries = aggregateDFC(transactions, mappingData)

  console.log(`   • DRE gerado: ${dreEntries.length} linhas`)
  console.log(`   • DFC gerado: ${dfcEntries.length} linhas`)

  ensureDir(options.outputDir)
  const drePath = path.join(options.outputDir, `dre_${options.cnpj}.json`)
  const dfcPath = path.join(options.outputDir, `dfc_${options.cnpj}.json`)
  fs.writeFileSync(drePath, JSON.stringify(dreEntries, null, 2), 'utf-8')
  fs.writeFileSync(dfcPath, JSON.stringify(dfcEntries, null, 2), 'utf-8')

  console.log(`   • Arquivos salvos em ${options.outputDir}`)

  if (options.upload) {
    await uploadSupabase('dre_entries', dreEntries)
    await uploadSupabase('cashflow_entries', dfcEntries)
    console.log('✅ Upload concluído!')
  } else {
    console.log('ℹ️  Upload para Supabase desabilitado (use --upload=true para ativar)')
  }
}

main().catch(err => {
  console.error('\n❌ Falha ao gerar relatórios:', err.message)
  process.exit(1)
})
