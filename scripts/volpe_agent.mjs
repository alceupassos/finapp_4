import fs from 'fs'
import path from 'path'
import { read, utils } from 'xlsx'

function readEnv() {
  const root = process.cwd()
  const files = ['.env.local', '.env.secret']
  const map = {}
  for (const file of files) {
    const target = path.join(root, file)
    if (!fs.existsSync(target)) continue
    const buf = fs.readFileSync(target, 'utf8')
    buf.split(/\r?\n/).forEach(line => {
      const idx = line.indexOf('=')
      if (idx > 0) map[line.slice(0, idx)] = line.slice(idx + 1)
    })
  }
  const get = key => String(process.env[key] || map[key] || '').trim()
  return {
    supabaseUrl: get('VITE_SUPABASE_URL'),
    supabaseAnon: get('VITE_SUPABASE_ANON_KEY'),
    supabaseService: get('SUPABASE_SERVICE_ROLE_KEY'),
    f360LoginToken: get('F360_LOGIN_TOKEN') || get('VOLPE_TOKEN_TOKEN'),
    f360BaseUrl: get('F360_BASE_URL'),
    f360DrePath: get('F360_DRE_PATH'),
    f360DfcPath: get('F360_DFC_PATH'),
    volpeTokenLogin: get('VOLPE_TOKEN_LOGIN'),
    volpeTokenSenha: get('VOLPE_TOKEN_SENHA'),
    f360Token: get('F360_TOKEN'),
    f360TitulosEndpoint: get('F360_TITULOS_PATH') || 'f360-titulos',
    f360DryRun: Boolean(process.env.F360_DRY_RUN),
    f360Group: get('F360_GROUP') || 'Grupo Volpe',
    f360Query: get('F360_QUERY_PARAMS'),
    volpeLaunchesPath: get('VOLPE_LANCAMENTOS_PATH')
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

function parseVolpeList() {
  const csvPath = path.join(process.cwd(), 'avant', 'integracao', 'f360', 'volpe.csv')
  const xlsPath = path.join(process.cwd(), 'avant', 'integracao', 'f360', 'volpe.xls')
  const companies = new Map()
  if (fs.existsSync(csvPath)) {
    const content = fs.readFileSync(csvPath, 'utf8')
    content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && line.includes(';'))
      .slice(1)
      .forEach(line => {
        const [group, business, cnpj] = line.split(';').map(cell => cell.trim())
        if (!cnpj) return
        companies.set(onlyDigits(cnpj), { group, business, cnpj: onlyDigits(cnpj) })
      })
  }
  if (fs.existsSync(xlsPath)) {
    const buf = fs.readFileSync(xlsPath)
    const wb = read(buf, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = utils.sheet_to_json(sheet, { header: 1 })
    rows.slice(1).forEach((row) => {
      const group = row[0] || 'Grupo Volpe'
      const business = row[1] || ''
      const cnpj = onlyDigits(row[2])
      if (cnpj) companies.set(cnpj, { group, business, cnpj })
    })
  }
  return Array.from(companies.values())
}

function parseQueryString(value) {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch (error) {
    return value.split('&').reduce((acc, part) => {
      const [key, val] = part.split('=')
      if (key) acc[key] = val || ''
      return acc
    }, {})
  }
}

const LOCAL_LAUNCH_CANDIDATES = [
  'avant/integracao/f360/volpe_lancamentos.xlsx',
  'avant/integracao/f360/volpe_lancamentos.csv',
  'avant/integracao/f360/volpe_lancamentos.json'
]

function resolveLaunchesPath(override) {
  if (override) {
    const absolute = path.isAbsolute(override) ? override : path.join(process.cwd(), override)
    if (fs.existsSync(absolute)) return absolute
  }
  for (const relative of LOCAL_LAUNCH_CANDIDATES) {
    const candidate = path.join(process.cwd(), relative)
    if (fs.existsSync(candidate)) return candidate
  }
  return ''
}

function loadLaunchRows(filePath) {
  if (!filePath) return []
  try {
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : []
    }
    const buffer = fs.readFileSync(filePath)
    const workbook = read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) return []
    return utils.sheet_to_json(sheet, { defval: '' })
  } catch (error) {
    console.warn(`Falha ao ler lançamentos locais (${filePath}): ${error.message}`)
    return []
  }
}

function normalizeLaunchRow(row) {
  if (!row || typeof row !== 'object') return null
  const cnpjValue =
    row.cnpj ||
    row.CNPJ ||
    row.company_cnpj ||
    row['CNPJ'] ||
    row['Empresa CNPJ'] ||
    row.empresa_cnpj ||
    row.company ||
    row.empresa ||
    ''
  const companyCnpj = onlyDigits(cnpjValue)
  if (!companyCnpj) return null
  const rawAmount = toNumberBR(
    row.valor ?? row.amount ?? row.total ?? row['Valor'] ?? row['Valor Líquido'] ?? row['Valor Bruto'] ?? row['ValorLiquido'] ?? 0
  )
  if (!Number.isFinite(rawAmount) || rawAmount === 0) return null
  const dateValue = row.data || row.date || row.vencimento || row.emissao || row.lancamento || row['Competência'] || row['Competencia'] || ''
  const date = toIso(dateValue)
  const natureHints = (row.natureza || row.nature || row.tipo || row['Tipo'] || '').toLowerCase()
  const nature =
    natureHints.includes('despesa') || natureHints.includes('out') || rawAmount < 0 ? 'despesa' : 'receita'
  const kind = nature === 'despesa' ? 'out' : 'in'
  const account = (row.conta || row.account || row.plano || row['Plano de Contas'] || '').trim() || 'Outros'
  const category = (row.categoria || row.category || row['Categoria DFC'] || account).trim() || 'Outros'
  return {
    company_cnpj: companyCnpj,
    date,
    amount: Math.abs(rawAmount),
    account,
    category,
    nature,
    kind
  }
}

function aggregateLaunches(rows) {
  const dreMap = new Map()
  const dfcMap = new Map()
  for (const row of rows) {
    const keyDre = `${row.company_cnpj}|${row.account}|${row.date}|${row.nature}`
    const existingDre = dreMap.get(keyDre)
    if (existingDre) {
      existingDre.amount += row.amount
    } else {
      dreMap.set(keyDre, { ...row })
    }
    const keyDfc = `${row.company_cnpj}|${row.category}|${row.kind}|${row.date}`
    const existingDfc = dfcMap.get(keyDfc)
    if (existingDfc) {
      existingDfc.amount += row.amount
    } else {
      dfcMap.set(keyDfc, {
        company_cnpj: row.company_cnpj,
        date: row.date,
        category: row.category,
        kind: row.kind,
        amount: row.amount
      })
    }
  }
  return { dreRows: Array.from(dreMap.values()), dfcRows: Array.from(dfcMap.values()) }
}

function parseDreFromArray(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map(row => {
      const account = row.account || row.conta || row.account_name || row.categoria || ''
      const amount = row.amount || row.valor || row.total || 0
      const date = row.date || row.data || ''
      const nature = row.nature || (toNumberBR(amount) >= 0 ? 'receita' : 'despesa')
      return { account: String(account).trim(), amount: toNumberBR(amount), date: toIso(date), nature }
    })
    .filter(entry => entry.account && entry.amount)
}

function parseDfcFromArray(arr) {
  const rows = []
  ;(Array.isArray(arr) ? arr : []).forEach(row => {
    const desc = row.category || row.descricao || row.categoria || ''
    const date = row.date || row.data || ''
    const entrada = toNumberBR(row.inflow ?? row.entrada ?? 0)
    const saida = toNumberBR(row.outflow ?? row.saida ?? 0)
    const category = String(desc).trim()
    if (!category) return
    if (entrada) rows.push({ category, kind: 'in', amount: entrada, date: toIso(date) })
    if (saida) rows.push({ category, kind: 'out', amount: saida, date: toIso(date) })
  })
  return rows
}

async function loginF360(baseUrl, loginToken) {
  if (!baseUrl || !loginToken) return null
  const url = new URL(baseUrl)
  const loginPath = url.origin + '/PublicLoginAPI/DoLogin'
  const res = await fetch(loginPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: loginToken })
  })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(`F360 login: ${res.status} ${message}`)
  }
  const payload = await res.json()
  return payload.Token || payload.token || null
}

async function fetchF360(baseUrl, jwt, endpoint, params) {
  if (!baseUrl || !endpoint || !jwt) return []
  const url = new URL(endpoint.startsWith('http') ? endpoint : `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null || value === '') return
    url.searchParams.set(key, value)
  })
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${jwt}` } })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${endpoint} ${res.status}: ${text}`)
  }
  const data = await res.json()
  if (Array.isArray(data)) return data
  return Array.isArray(data.value) ? data.value : data.data || []
}

async function restPost(url, anonKey, serviceKey, table, rows, conflict) {
  if (!rows.length) return { skipped: true }
  if (!url || !anonKey) return { skipped: true }
  const targetUrl = conflict
    ? `${url.replace(/\/$/, '')}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`
    : `${url.replace(/\/$/, '')}/rest/v1/${table}`
  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${serviceKey || anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation, resolution=ignore-duplicates'
    },
    body: JSON.stringify(rows)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase ${table} ${res.status} ${text}`)
  }
  return res.json()
}

async function main() {
  const env = readEnv()
  const companies = parseVolpeList()
  const launchesPath = resolveLaunchesPath(env.volpeLaunchesPath)
  const localLaunchRows = launchesPath ? loadLaunchRows(launchesPath) : []
  const launchesByCompany = new Map()
  localLaunchRows.forEach(raw => {
    const normalized = normalizeLaunchRow(raw)
    if (!normalized) return
    const bucket = launchesByCompany.get(normalized.company_cnpj) || []
    bucket.push(normalized)
    launchesByCompany.set(normalized.company_cnpj, bucket)
  })
  if (!companies.length) {
    throw new Error('Nenhum CNPJ do Grupo Volpe encontrado para processar')
  }
  console.log(
    `Volpe agent iniciando com ${companies.length} empresas (` +
      companies.map(c => c.cnpj).slice(0, 3).join(', ') +
      '...)'
  )
  if (launchesPath) {
    console.log(`Construindo DRE/DFC a partir de ${launchesPath} (${localLaunchRows.length} lançamentos)`)
  }

  const queryOverrides = parseQueryString(env.f360Query)
  const defaultRange = {
    periodoInicio: queryOverrides.periodoInicio || '2025-01-01',
    periodoFim: queryOverrides.periodoFim || '2025-12-31',
    ano: queryOverrides.ano || '2025'
  }
  const jwt = env.f360LoginToken && env.f360BaseUrl ? await loginF360(env.f360BaseUrl, env.f360LoginToken) : null
  if (!jwt) console.warn('F360 não autenticado — pulei as chamadas de API públicas')

  const dreEntries = []
  const dfcEntries = []
  const validations = []

  for (const company of companies) {
    const companySummary = {
      cnpj: company.cnpj,
      business: company.business,
      dreCount: 0,
      dfcCount: 0,
      totalDre: 0,
      totalDfc: 0,
      warnings: []
    }

    const localRows = launchesByCompany.get(company.cnpj) || []
    if (localRows.length) {
      const { dreRows: aggregatedDre, dfcRows: aggregatedDfc } = aggregateLaunches(localRows)
      companySummary.dreCount = aggregatedDre.length
      companySummary.totalDre = aggregatedDre.reduce((sum, row) => sum + row.amount, 0)
      aggregatedDre.forEach(row => dreEntries.push(row))
      companySummary.dfcCount = aggregatedDfc.length
      companySummary.totalDfc = aggregatedDfc.reduce((sum, row) => sum + row.amount, 0)
      aggregatedDfc.forEach(row => dfcEntries.push(row))
      companySummary.warnings.push('Dados construídos a partir dos lançamentos locais')
    } else {
      if (jwt && env.f360DrePath) {
        try {
          const dreRaw = await fetchF360(env.f360BaseUrl, jwt, env.f360DrePath, { ...defaultRange, cnpj: company.cnpj })
          const parsedDre = parseDreFromArray(dreRaw)
          companySummary.dreCount = parsedDre.length
          companySummary.totalDre = parsedDre.reduce((sum, row) => sum + row.amount, 0)
          parsedDre.forEach(row => dreEntries.push({ ...row, company_cnpj: company.cnpj }))
        } catch (error) {
          companySummary.warnings.push(`DRE falhou: ${error.message}`)
        }
      } else {
        companySummary.warnings.push('Sem caminho DRE configurado ou login faltando')
      }

      if (jwt && env.f360DfcPath) {
        try {
          const dfcRaw = await fetchF360(env.f360BaseUrl, jwt, env.f360DfcPath, { ...defaultRange, cnpj: company.cnpj })
          const parsedDfc = parseDfcFromArray(dfcRaw)
          companySummary.dfcCount = parsedDfc.length
          companySummary.totalDfc = parsedDfc.reduce((sum, row) => sum + row.amount, 0)
          parsedDfc.forEach(row => dfcEntries.push({ ...row, company_cnpj: company.cnpj }))
        } catch (error) {
          companySummary.warnings.push(`DFC falhou: ${error.message}`)
        }
      } else {
        companySummary.warnings.push('Sem caminho DFC configurado ou login faltando')
      }
    }

    validations.push(companySummary)
  }

  if (env.supabaseUrl && env.supabaseAnon) {
    if (dreEntries.length) {
      await restPost(env.supabaseUrl, env.supabaseAnon, env.supabaseService, 'dre_entries', dreEntries, 'company_cnpj,date,account')
    }
    if (dfcEntries.length) {
      await restPost(env.supabaseUrl, env.supabaseAnon, env.supabaseService, 'cashflow_entries', dfcEntries, 'company_cnpj,date,kind,category,amount')
    }
  }

  const snapshot = {
    timestamp: new Date().toISOString(),
    companies: validations,
    totals: {
      dreRecords: dreEntries.length,
      dfcRecords: dfcEntries.length,
      dreAmount: dreEntries.reduce((sum, r) => sum + r.amount, 0),
      dfcAmount: dfcEntries.reduce((sum, r) => sum + r.amount, 0)
    },
    localLaunches: {
      path: launchesPath,
      records: localLaunchRows.length,
      companies: launchesByCompany.size
    },
    supabase: {
      ready: Boolean(env.supabaseUrl && env.supabaseAnon)
    },
    f360: {
      authenticated: Boolean(jwt),
      drePath: env.f360DrePath,
      dfcPath: env.f360DfcPath,
      year: defaultRange.ano
    }
  }

  const snapshotsDir = path.join(process.cwd(), 'var', 'snapshots')
  fs.mkdirSync(snapshotsDir, { recursive: true })
  const snapshotName = `volpe_agent_${new Date().toISOString().replace(/[:.]/g, '_')}.json`
  fs.writeFileSync(path.join(snapshotsDir, snapshotName), JSON.stringify(snapshot, null, 2))
  process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
