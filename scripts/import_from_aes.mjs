import fs from 'fs'
import path from 'path'

function readEnv() {
  const root = process.cwd()
  const local = path.join(root, '.env.local')
  const content = fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : ''
  const map = {}
  content.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i > 0) map[line.slice(0, i)] = line.slice(i + 1) })
  const BASE_URL = String(map['VITE_SUPABASE_URL'] || '').trim()
  const ANON_KEY = String(map['VITE_SUPABASE_ANON_KEY'] || '').trim()
  const SERVICE_ROLE = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const F360_TOKEN = String(process.env.F360_TOKEN || '').trim()
  const F360_WEBHOOK = String(process.env.F360_WEBHOOK_TITULOS || '').trim()
  const F360_CNPJ = String(process.env.F360_CNPJ || '').trim()
  return { BASE_URL, ANON_KEY, SERVICE_ROLE, F360_TOKEN, F360_WEBHOOK, F360_CNPJ }
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
  if (!Number.isFinite(parsed.getTime())) return new Date().toISOString().slice(0, 10)
  return parsed.toISOString().slice(0, 10)
}

function formatCompetencia(value) {
  const match = String(value || '').match(/(\d{1,2})\/(\d{4})/)
  if (!match) return '01-01'
  return `${match[1].padStart(2, '0')}-01`
}

function parseCsv(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8')
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const headerIndex = lines.findIndex(line => line.startsWith('Registro;Tipo;'))
  if (headerIndex < 0) throw new Error('CSV header não encontrado em AES')
  const header = lines[headerIndex].split(';').map(field => field.trim())
  return lines.slice(headerIndex + 1).map((line, index) => {
    const values = line.split(';')
    const entry = {}
    header.forEach((field, idx) => {
      entry[field] = values[idx] ?? ''
    })
    entry.__line = index + 1
    return entry
  }).filter(entry => entry['Valor Líquido'] && entry['Valor Líquido'].trim())
}

function inferCentroDeCusto(entry) {
  const value = entry['Centro de Custos']?.trim()
  if (value) return value
  const alts = entry['Observações'] || ''
  if (alts.includes('Lauro') || alts.includes('Pessoal')) return 'Operações Pessoais'
  return 'AES Geral'
}

function inferPlanoDeContas(entry) {
  const plano = entry['Plano de Contas']?.trim()
  if (plano) return plano
  const obs = entry['Observações'] || ''
  const fallback = obs.split('-')[0].trim()
  return fallback || 'Outras Despesas'
}

function buildF360Payload(entry, cnpj) {
  const tipoTitulo = entry['Tipo']?.toLowerCase().includes('receber') ? 'Receber' : 'Pagar'
  const numeroParcela = parseInt(entry['Parcela']?.split('/')[0] ?? '', 10) || 1
  const competencia = formatCompetencia(entry['Competência'])
  const centro = inferCentroDeCusto(entry)
  const plano = inferPlanoDeContas(entry)
  const amount = toNumberBR(entry['Valor Líquido'])
  const historico = entry['Observações']?.trim()
  return {
    cnpj: cnpj,
    tipoTitulo,
    numeroTitulo: `${entry['Registro'] || entry.__line}-${numeroParcela}`,
    clienteFornecedor: entry['Cliente / Fornecedor']?.trim() || 'A.E.S. Comercial',
    detalhesClienteFornecedor: {
      nome: entry['Cliente / Fornecedor']?.trim() || undefined
    },
    emissao: toIso(entry['Emissão']),
    valor: amount,
    tipoDocumento: entry['Tipo Documento'] || 'Outros',
    contaBancaria: entry['Conta']?.trim() || 'A.E.S. - ITAU - CONTA CORRENTE - 11703-9',
    meioPagamento: historico?.toLowerCase().includes('boleto') ? 'Boleto' : 'Transferência Bancária',
    historico,
    remessaCnab: false,
    receitaDeCaixa: false,
    parcelas: [
      {
        vencimento: toIso(entry['Vencimento']),
        valor: amount,
        numeroParcela,
        rateios: [
          {
            competencia,
            centroDeCusto: centro,
            planoDeContas: plano,
            numeroParcela
          }
        ]
      }
    ]
  }
}

async function restPost(base, anon, token, table, rows, conflict) {
  const url = conflict ? `${base}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}` : `${base}/rest/v1/${table}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token || anon}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation, resolution=ignore-duplicates'
    },
    body: JSON.stringify(rows)
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase ${table} ${res.status}: ${body}`)
  }
  return res.json()
}

async function postF360(webhook, token, payload) {
  const res = await fetch(webhook, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`F360 webhook falhou: ${res.status} ${body}`)
  }
  return res.json()
}

async function main() {
  const { BASE_URL, ANON_KEY, SERVICE_ROLE, F360_TOKEN, F360_WEBHOOK, F360_CNPJ } = readEnv()
  if (!BASE_URL || !ANON_KEY) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local')
  const csvPath = path.join(process.cwd(), 'avant', 'integracao', 'f360', 'primeirocliente.csv')
  const rows = parseCsv(csvPath)
  if (!rows.length) throw new Error('Nenhum registro encontrado no CSV AES')

  const cnpj = onlyDigits(F360_CNPJ) || onlyDigits(rows[0]['Empresa']) || '02723552000153'
  const dreMap = new Map()
  const dfcRows = []

  rows.forEach(entry => {
    const plano = inferPlanoDeContas(entry)
    const amount = toNumberBR(entry['Valor Líquido'])
    if (!amount) return
    const nature = entry['Tipo']?.toLowerCase().includes('receber') ? 'receita' : 'despesa'
    const key = `${plano}::${nature}`
    const existing = dreMap.get(key)
    if (existing) {
      existing.amount += amount
    } else {
      dreMap.set(key, { company_cnpj: cnpj, account: plano, amount, date: toIso(entry['Emissão']), nature })
    }
    dfcRows.push({
      company_cnpj: cnpj,
      category: plano,
      kind: entry['Tipo']?.toLowerCase().includes('receber') ? 'in' : 'out',
      amount,
      date: toIso(entry['Liquidação'] || entry['Vencimento'] || entry['Emissão'])
    })
  })

  const dreRows = Array.from(dreMap.values())
  const batch = async (rowsBatch, table, conflict) => {
    const chunkSize = 500
    for (let i = 0; i < rowsBatch.length; i += chunkSize) {
      const chunk = rowsBatch.slice(i, i + chunkSize)
      await restPost(BASE_URL, ANON_KEY, SERVICE_ROLE, table, chunk, conflict)
    }
  }

  await batch(dreRows, 'dre_entries', 'company_cnpj,date,account')
  await batch(dfcRows, 'cashflow_entries', 'company_cnpj,date,kind,category,amount')

  let f360Results = 0
  const payloads = rows.map(entry => buildF360Payload(entry, cnpj))
  if (F360_WEBHOOK && F360_TOKEN) {
    for (const payload of payloads) {
      try {
        await postF360(F360_WEBHOOK, F360_TOKEN, payload)
        f360Results += 1
      } catch (error) {
        console.error('F360 payload falhou para', payload.numeroTitulo, error.message)
      }
    }
  }

  const totalValue = rows.reduce((sum, entry) => sum + toNumberBR(entry['Valor Líquido']), 0)
  const summary = {
    cnpj,
    totalRegistros: rows.length,
    totalValor: totalValue,
    dreEntries: dreRows.length,
    dfcEntries: dfcRows.length,
    f360Payloads: f360Results
  }

  const dir = path.join(process.cwd(), 'var', 'snapshots')
  fs.mkdirSync(dir, { recursive: true })
  const snapshotName = `aes_integration_${Date.now()}.json`
  fs.writeFileSync(path.join(dir, snapshotName), JSON.stringify(summary, null, 2))
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
