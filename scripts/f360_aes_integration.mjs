import fs from 'fs'
import path from 'path'
import { read, utils } from 'xlsx'

function readEnv() {
  const root = process.cwd()
  const files = ['.env.local', '.env.secret']
  const map = {}
  for (const file of files) {
    const p = path.join(root, file)
    if (!fs.existsSync(p)) continue
    const content = fs.readFileSync(p, 'utf8')
    content.split(/\r?\n/).forEach(line => {
      const idx = line.indexOf('=')
      if (idx > 0) map[line.slice(0, idx)] = line.slice(idx + 1)
    })
  }
  const BASE_URL = String(map['VITE_SUPABASE_URL'] || '')
    .replace(/\r/g, '')
    .replace(/\s+$/, '')
  const ANON_KEY = String(map['VITE_SUPABASE_ANON_KEY'] || '')
    .replace(/\r/g, '')
  const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    .replace(/\r/g, '')
  const F360_TOKEN = String(process.env.F360_TOKEN || map['F360_TOKEN'] || '').trim()
  const F360_CNPJ = String(process.env.F360_CNPJ || map['F360_CNPJ'] || '').trim()
  const F360_TITULOS_PATH = String(process.env.F360_TITULOS_PATH || '').trim()
  const F360_DRY_RUN = Boolean(process.env.F360_DRY_RUN)
  return { BASE_URL, ANON_KEY, SERVICE_KEY, F360_TOKEN, F360_CNPJ, F360_TITULOS_PATH, F360_DRY_RUN }
}

function toNumberBR(value) {
  if (value == null) return 0
  if (typeof value === 'number') return value
  const str = String(value).replace(/\s|R\$|\./g, '').replace(',', '.')
  const parsed = Number(str)
  return Number.isNaN(parsed) ? 0 : parsed
}

function onlyDigits(raw) {
  return String(raw || '').replace(/\D/g, '')
}

function toIsoBrazil(value, fallback) {
  if (!value) return fallback || new Date().toISOString().slice(0, 10)
  const ddmmyyyy = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  const mmyyyy = String(value).match(/(\d{1,2})\/(\d{4})/)
  if (mmyyyy) {
    const [, month, year] = mmyyyy
    return `${year}-${month.padStart(2, '0')}-01`
  }
  const iso = new Date(value)
  if (!Number.isNaN(iso.getTime())) return iso.toISOString().slice(0, 10)
  return fallback || new Date().toISOString().slice(0, 10)
}

function parseAesCsv(filePath) {
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  const headerIndex = lines.findIndex(line => line.toLowerCase().startsWith('registro;'))
  if (headerIndex < 0) return []
  const headers = lines[headerIndex].split(';').map(h => h.trim())
  const rows = []
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line || line.trim() === '') continue
    const parts = line.split(';')
    if (parts.length < headers.length) continue
    const entry = {}
    headers.forEach((key, colIndex) => {
      entry[key] = parts[colIndex] ? parts[colIndex].trim() : ''
    })
    const amount = toNumberBR(entry['Valor Líquido'] || entry['Valor Bruto'])
    if (amount === 0) continue
    rows.push(entry)
  }
  return rows
}

function safeString(value, fallback = '') {
  const trimmed = String(value || '').trim()
  return trimmed || fallback
}

function inferPaymentMethod(observation = '') {
  const text = observation.toLowerCase()
  if (/boleto/.test(text)) return 'Boleto'
  if (/pix|qr-code/.test(text)) return 'Transferência Bancária'
  if (/cartão|credito|débito/.test(text)) return 'Cartão de Crédito/Débito'
  if (/dinheiro/.test(text)) return 'Dinheiro'
  if (/doc|ted|transferência/.test(text)) return 'DOC/TED'
  return 'Outros'
}

function toRateioCompetencia(value) {
  const [month] = String(value || '').split('/')
  if (!month) return '01-01'
  return `${month.padStart(2, '0')}-01`
}

async function postF360Titles(token, endpoint, payload) {
  if (!token) throw new Error('F360_TOKEN ausente')
  const url = `https://webhook.f360.com.br/${token}/${endpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

async function restPost(base, anon, srk, table, rows, conflict) {
  if (!base || !anon) return { skipped: true }
  if (!rows.length) return { skipped: true }
  const url = conflict
    ? `${base}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`
    : `${base}/rest/v1/${table}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${srk || anon}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation, resolution=ignore-duplicates'
    },
    body: JSON.stringify(rows)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${table} ${res.status} ${text}`)
  }
  return res.json()
}

function summarizeExcel(filePath) {
  if (!fs.existsSync(filePath)) return null
  const buf = fs.readFileSync(filePath)
  const wb = read(buf, { type: 'buffer' })
  const sheetNames = wb.SheetNames
  const dreSheet = sheetNames.find(n => /dre|resultado/i.test(n)) || sheetNames[0]
  const dfcSheet = sheetNames.find(n => /dfc|fluxo/i.test(n)) || sheetNames[1] || sheetNames[0]
  const dreRows = utils.sheet_to_json(wb.Sheets[dreSheet], { defval: '' })
  const dfcRows = utils.sheet_to_json(wb.Sheets[dfcSheet], { defval: '' })
  const dreTotal = dreRows.reduce((sum, row) => sum + (toNumberBR(row.valor || row.Valor || row.total || row.Total) || 0), 0)
  let dfcIn = 0
  let dfcOut = 0
  dfcRows.forEach(row => {
    const entrada = toNumberBR(row.entrada || row.Entrada || row.ENTRADA)
    const saida = toNumberBR(row.saida || row.Saída || row.SAIDA || row.SAIDA)
    if (entrada) dfcIn += entrada
    if (saida) dfcOut += saida
  })
  return { dreTotal, dfcIn, dfcOut }
}

async function main() {
  const AES_CSV = path.join(process.cwd(), 'avant', 'integracao', 'f360', 'primeirocliente.csv')
  const EXCEL_FILE = path.join(process.cwd(), 'avant', 'integracao', 'f360', 'DRE e DFC outubro.2025.xlsx')
  const rows = parseAesCsv(AES_CSV)
  if (!rows.length) {
    throw new Error('Nenhum registro válido encontrado no CSV do AES')
  }

  const env = readEnv()
  const companyCnpj = onlyDigits(env.F360_CNPJ || '')
  if (!companyCnpj) throw new Error('F360_CNPJ é obrigatório para identificar a empresa no Supabase e na F360')
  const baseUrl = env.BASE_URL.replace(/\/$/, '')
  const supabaseReady = Boolean(baseUrl && env.ANON_KEY)
  const supabaseService = env.SERVICE_KEY
  const f360Token = env.F360_TOKEN
  const f360Endpoint = env.F360_TITULOS_PATH || 'f360-titulos'
  const dryRun = env.F360_DRY_RUN

  const dreMap = new Map()
  const dfcRows = []
  const f360Values = []

  rows.forEach((row, index) => {
    const amount = toNumberBR(row['Valor Líquido'] || row['Valor Bruto'])
    if (!amount) return
    const tipoTitulo = row['Tipo'] === 'A Receber' ? 'Receber' : 'Pagar'
    const nature = tipoTitulo === 'Receber' ? 'receita' : 'despesa'
    const plan = safeString(row['Plano de Contas'] || row['Conta'], 'Plano AES')
    const account = plan.includes('-') ? safeString(plan.split('-').slice(-1)[0], plan) : plan
    const competence = toIsoBrazil(row['Competência'])
    const dreKey = `${account}|${competence}`
    const dreEntry = dreMap.get(dreKey)
    if (dreEntry) {
      dreMap.set(dreKey, { ...dreEntry, amount: dreEntry.amount + amount })
    } else {
      dreMap.set(dreKey, { account, amount, date: competence, nature })
    }

    const kind = tipoTitulo === 'Receber' ? 'in' : 'out'
    const dfcDate = toIsoBrazil(row['Vencimento'] || row['Emissão'] || row['Competência'])
    const category = safeString(plan)
    dfcRows.push({ company_cnpj: companyCnpj, category, kind, amount, date: dfcDate })

    const parcelaNumber = Number((String(row['Parcela'] || '1/1').split('/')[0] || '1'))
    const vencimento = toIsoBrazil(row['Vencimento'])
    const liquidacao = row['Status']?.toLowerCase().includes('liquid') ? toIsoBrazil(row['Liquidação'] || row['Vencimento']) : undefined
    const rateio = {
      competencia: toRateioCompetencia(row['Competência']),
      centroDeCusto: safeString(row['Centro de Custos'], 'Centro AES (não informado)'),
      planoDeContas: safeString(account, 'Plano AES'),
      numeroParcela: parcelaNumber
    }
    f360Values.push({
      cnpj: companyCnpj,
      tipoTitulo,
      numeroTitulo: `AES-${index + 1}-${onlyDigits(vencimento) || onlyDigits(amount) || '000'}`,
      clienteFornecedor: safeString(row['Cliente / Fornecedor'], 'AES Cliente'),
      emissao: toIsoBrazil(row['Emissão']),
      valor: amount,
      tipoDocumento: 'Outros',
      contaBancaria: safeString(row['Conta'], 'Conta Padrão'),
      meioPagamento: inferPaymentMethod(row['Observações']),
      historico: row['Observações'],
      parcelas: [
        {
          numeroParcela: parcelaNumber,
          valor: amount,
          vencimento,
          liquidacao,
          rateios: [rateio]
        }
      ]
    })
  })

  const dreRows = Array.from(dreMap.values()).map(entry => ({
    company_cnpj: companyCnpj,
    account: entry.account,
    amount: entry.amount,
    date: entry.date,
    nature: entry.nature
  }))

  const dreTotals = dreRows.reduce((sum, r) => sum + r.amount, 0)
  const dfcTotals = dfcRows.reduce((memo, r) => {
    memo.total += r.amount
    memo.in += r.kind === 'in' ? r.amount : 0
    memo.out += r.kind === 'out' ? r.amount : 0
    return memo
  }, { total: 0, in: 0, out: 0 })

  const excelSummary = summarizeExcel(EXCEL_FILE) || { dreTotal: 0, dfcIn: 0, dfcOut: 0 }

  if (supabaseReady) {
    await restPost(baseUrl, env.ANON_KEY, supabaseService, 'dre_entries', dreRows, 'company_cnpj,date,account')
    await restPost(baseUrl, env.ANON_KEY, supabaseService, 'cashflow_entries', dfcRows, 'company_cnpj,date,kind,category,amount')
  }

  const webhookResults = []
  if (!dryRun && f360Token) {
    const chunkSize = 50
    for (let i = 0; i < f360Values.length; i += chunkSize) {
      const chunk = f360Values.slice(i, i + chunkSize)
      const payload = { Values: chunk }
      const result = await postF360Titles(f360Token, f360Endpoint, payload)
      webhookResults.push({ chunk: i / chunkSize, status: result.status, preview: result.body.slice(0, 200) })
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  const snapshot = {
    timestamp: new Date().toISOString(),
    rowsProcessed: rows.length,
    dreRecords: dreRows.length,
    dfcRecords: dfcRows.length,
    csvTotals: {
      dre: dreTotals,
      dfc: dfcTotals
    },
    excelTotals: excelSummary,
    webhook: {
      invoked: !dryRun && Boolean(f360Token),
      endpoint: f360Endpoint,
      results: webhookResults
    }
  }

  const outDir = path.join(process.cwd(), 'var', 'snapshots')
  fs.mkdirSync(outDir, { recursive: true })
  const fileName = `f360_aes_${new Date().toISOString().replace(/[:.]/g, '_')}.json`
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(snapshot, null, 2))
  process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
