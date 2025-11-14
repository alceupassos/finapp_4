import fs from 'fs'
import path from 'path'
import { read, utils } from 'xlsx'

function readEnv() {
  const root = process.cwd()
  const envPath = path.join(root, '.env.local')
  const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
  const map = {}
  content.split(/\r?\n/).forEach(line => {
    const idx = line.indexOf('=')
    if (idx <= 0) return
    map[line.slice(0, idx)] = line.slice(idx + 1)
  })
  return {
    supabaseUrl: String(process.env.VITE_SUPABASE_URL || map.VITE_SUPABASE_URL || '').trim(),
    supabaseAnon: String(process.env.VITE_SUPABASE_ANON_KEY || map.VITE_SUPABASE_ANON_KEY || '').trim(),
    supabaseService: String(process.env.SUPABASE_SERVICE_ROLE_KEY || map.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  }
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function toNumberBR(value) {
  if (value == null) return 0
  if (typeof value === 'number') return value
  const normalized = String(value).replace(/\s|R\$|\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function toIso(value) {
  if (!value) return new Date().toISOString().slice(0, 10)
  const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  }
  const parsed = new Date(value)
  if (Number.isFinite(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function formatCompetencia(value) {
  const match = String(value || '').match(/(\d{1,2})\/(\d{4})/)
  if (!match) return new Date().toISOString().slice(0, 10)
  return `${match[2]}-${match[1].padStart(2, '0')}-01`
}

function loadPlanoDeContas() {
  const filePath = path.join(process.cwd(), 'avant', 'exportado', 'PlanoDeContas.xlsx')
  if (!fs.existsSync(filePath)) return new Map()
  const buffer = fs.readFileSync(filePath)
  const workbook = read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const headerIndex = rows.findIndex(row => String(row[0]).toLowerCase().includes('nome'))
  if (headerIndex < 0) return new Map()
  const mapping = new Map()
  rows.slice(headerIndex + 1).forEach(row => {
    const name = String(row[0] || '').trim()
    const type = String(row[1] || '').toLowerCase()
    if (!name) return
    const normalized = name.replace(/\s+/g, ' ').trim()
    if (type.includes('receita')) mapping.set(normalized, 'receita')
    if (type.includes('despesa') || type.includes('custo') || type.includes('pagar')) mapping.set(normalized, 'despesa')
  })
  return mapping
}

function inferNatureFromAccount(account, planMap) {
  const normalized = String(account || '').replace(/\s+/g, ' ').trim()
  if (planMap.has(normalized)) return planMap.get(normalized)
  const lower = normalized.toLowerCase()
  const receitaKeywords = ['receita', 'venda', 'lucro', 'recebido']
  const despesaKeywords = ['despesa', 'custo', 'taxa', 'imposto', 'pagamento', 'pagar']
  if (receitaKeywords.some(keyword => lower.includes(keyword))) return 'receita'
  if (despesaKeywords.some(keyword => lower.includes(keyword))) return 'despesa'
  return 'receita'
}

function chunkedPost(base, anon, serviceKey, table, rows, conflict) {
  if (!rows.length || !base || !anon) return Promise.resolve([])
  const chunkSize = 500
  const promises = []
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const url = conflict
      ? `${base.replace(/\/$/, '')}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`
      : `${base.replace(/\/$/, '')}/rest/v1/${table}`
    promises.push(
      fetch(url, {
        method: 'POST',
        headers: {
          apikey: anon,
          Authorization: `Bearer ${serviceKey || anon}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation, resolution=ignore-duplicates'
        },
        body: JSON.stringify(chunk)
      }).then(async res => {
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Supabase ${table} ${res.status}: ${text}`)
        }
        return res.json()
      })
    )
  }
  return Promise.all(promises)
}

function parseMatrixDre(filePath, planMap) {
  const buffer = fs.readFileSync(filePath)
  const workbook = read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const headerIndex = rows.findIndex(row => String(row[0]).toLowerCase().includes('demonstrativo de resultados') && row.some(cell => /janeiro/i.test(String(cell))))
  if (headerIndex < 0) return { company_cnpj: onlyDigits(path.basename(filePath, path.extname(filePath)).replace(/^DRE/i, '')), rows: [] }
  const monthHeaders = rows[headerIndex].slice(1, 13)
  const yearRow = rows.find(row => row.some(cell => /\d{4}/.test(String(cell)))) || []
  const year = yearRow.find(cell => /\d{4}/.test(String(cell))) || '2025'
  const dataRows = rows.slice(headerIndex + 1)
  const companyCnpj = onlyDigits(path.basename(filePath, path.extname(filePath)).replace(/^DRE/i, ''))
  const entries = []
  dataRows.forEach(row => {
    const account = String(row[0] || '').trim()
    if (!account) return
    monthHeaders.forEach((_, idx) => {
      const amount = toNumberBR(row[idx + 1])
      if (!amount) return
      const date = `${year}-${String(idx + 1).padStart(2, '0')}-01`
      const nature = inferNatureFromAccount(account, planMap)
      entries.push({ company_cnpj: companyCnpj, account, amount, date, nature })
    })
  })
  return { company_cnpj: companyCnpj, rows: entries }
}

function normalizeHeader(cell) {
  return String(cell || '').replace(/\r|\n/g, ' ').trim()
}

function parseDfcFile(filePath, planMap) {
  const buffer = fs.readFileSync(filePath)
  const workbook = read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const headerIndex = rows.findIndex(row => String(row[0]).toLowerCase().includes('registro'))
  if (headerIndex < 0) return { dfcRows: [], dreMap: new Map(), company_cnpj: onlyDigits(path.basename(filePath, path.extname(filePath))) }
  const headerRow = rows[headerIndex].map(normalizeHeader)
  const companyCnpj = onlyDigits(path.basename(filePath, path.extname(filePath)))
  const dfcRows = []
  const dreMap = new Map()
  rows.slice(headerIndex + 1).forEach(row => {
    if (!row || row.every(cell => cell === '' || cell == null)) return
    const entry = {}
    headerRow.forEach((key, idx) => {
      if (!key) return
      entry[key] = row[idx]
    })
    const amount = toNumberBR(entry['Valor Líquido'] || entry['Valor Bruto'] || entry['Valor'])
    if (!amount) return
    const category = (entry['Plano de Contas'] || entry['Conta'] || entry['Centro de Custos'] || 'Outros').trim()
    const kind = String(entry['Tipo'] || '').toLowerCase().includes('receber') ? 'in' : 'out'
    const dateSource = entry['Liquidação'] || entry['Liquidacao'] || entry['Vencimento'] || entry['Emissão'] || entry['Emissao'] || entry['Competência'] || entry['Competencia'] || ''
    const date = String(dateSource).includes('/') ? toIso(dateSource) : (entry['Competência'] ? formatCompetencia(entry['Competência'] || entry['Competencia']) : toIso(dateSource))
    dfcRows.push({ company_cnpj: companyCnpj, category, kind, amount, date })
    const nature = inferNatureFromAccount(category, planMap)
    const key = `${companyCnpj}|${category}|${nature}`
    const existing = dreMap.get(key)
    if (existing) {
      existing.amount += amount
    } else {
      dreMap.set(key, { company_cnpj: companyCnpj, account: category, amount, date, nature })
    }
  })
  return { dfcRows, dreMap, company_cnpj: companyCnpj }
}

async function main() {
  const env = readEnv()
  const planMap = loadPlanoDeContas()
  const folder = path.join(process.cwd(), 'avant', 'exportado')
  if (!fs.existsSync(folder)) throw new Error(`Pasta ${folder} não encontrada`)
  const files = fs
    .readdirSync(folder)
    .filter(file => file.match(/\.(xlsx|csv|json)$/i) && !file.startsWith('~$'))
    .sort()
  if (!files.length) throw new Error('Nenhum arquivo válido encontrado em avant/exportado')
  console.log(`Importando ${files.length} arquivos exportados (${planMap.size} contas mapeadas)`)  
  const dreEntries = []
  const dfcEntries = []
  const completedDre = new Set()
  for (const file of files) {
    const absolute = path.join(folder, file)
    if (/^DRE/i.test(file)) {
      const { rows, company_cnpj } = parseMatrixDre(absolute, planMap)
      if (rows.length) {
        completedDre.add(company_cnpj)
        dreEntries.push(...rows)
        console.log(`  · DRE ${company_cnpj}: ${rows.length} linhas agregadas`)
      }
      continue
    }
    const { dfcRows, dreMap, company_cnpj } = parseDfcFile(absolute, planMap)
    if (!dfcRows.length) continue
    dfcEntries.push(...dfcRows)
    if (!completedDre.has(company_cnpj)) {
      dreEntries.push(...Array.from(dreMap.values()))
    }
    console.log(`  · DFC ${company_cnpj}: ${dfcRows.length} lançamentos`)
  }
  const snapshot = {
    timestamp: new Date().toISOString(),
    dreRecords: dreEntries.length,
    dfcRecords: dfcEntries.length,
    companies: Array.from(new Set([...dreEntries, ...dfcEntries].map(entry => entry.company_cnpj)))
  }
  if (env.supabaseUrl && env.supabaseAnon) {
    console.log(`Enviando ${dreEntries.length} DRE e ${dfcEntries.length} DFC para Supabase`)
    await chunkedPost(env.supabaseUrl, env.supabaseAnon, env.supabaseService, 'dre_entries', dreEntries, 'company_cnpj,date,account')
    await chunkedPost(env.supabaseUrl, env.supabaseAnon, env.supabaseService, 'cashflow_entries', dfcEntries, 'company_cnpj,date,kind,category,amount')
  } else {
    console.log('Supabase não configurada — pulei o upload dos dados')
  }
  const snapshotsDir = path.join(process.cwd(), 'var', 'snapshots')
  fs.mkdirSync(snapshotsDir, { recursive: true })
  const fileName = `volpe_exportado_${Date.now()}.json`
  fs.writeFileSync(path.join(snapshotsDir, fileName), JSON.stringify(snapshot, null, 2))
  console.log(`Snapshot gravado em var/snapshots/${fileName}`)
}

main().catch(error => {
  console.error('Falha ao importar exportados:', error.message)
  process.exit(1)
})