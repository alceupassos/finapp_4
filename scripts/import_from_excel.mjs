import fs from 'fs'
import path from 'path'
import { read, utils } from 'xlsx'

function readEnv() {
  const root = process.cwd()
  const prod = path.join(root, '.env.production')
  const local = path.join(root, '.env.local')
  const content = fs.existsSync(prod) ? fs.readFileSync(prod, 'utf8') : (fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : '')
  const map = {}
  content.split(/\r?\n/).forEach(line => {
    const i = line.indexOf('='); if (i>0) { map[line.slice(0,i)] = line.slice(i+1) }
  })
  const BASE_URL = String(map['VITE_SUPABASE_URL'] || '').replace(/\r/g,'').replace(/\s+$/,'')
  const ANON_KEY = String(map['VITE_SUPABASE_ANON_KEY'] || '').replace(/\r/g,'')
  const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\r/g,'')
  return { BASE_URL, ANON_KEY, SERVICE_KEY }
}

function toNumberBR(v){ if (v==null) return 0; if (typeof v==='number') return v; const s=String(v).replace(/\s|R\$|\./g,'').replace(',', '.'); const n=Number(s); return isNaN(n)?0:n }
function pick(obj, keys){ for (const k of keys) if (obj[k]!=null && obj[k]!=='' ) return obj[k]; return '' }

function parseExcel(excelPath) {
  const buf = fs.readFileSync(excelPath)
  const wb = read(buf, { type: 'buffer' })
  const sheetNames = wb.SheetNames
  const findSheet = (keys) => sheetNames.find(n => keys.some(k => n.toLowerCase().includes(k)))
  const dreSheetName = findSheet(['dre','resultado']) || sheetNames[0]
  const dfcSheetName = findSheet(['dfc','fluxo']) || sheetNames[1] || sheetNames[0]
  const dreSheet = wb.Sheets[dreSheetName]
  const dfcSheet = wb.Sheets[dfcSheetName]
  const dreStd = utils.sheet_to_json(dreSheet, { defval: '' })
  const dfcStd = utils.sheet_to_json(dfcSheet, { defval: '' })
  let dre = dreStd.map(r => ({ conta: String(pick(r,['conta','Conta','CONTA','categoria','Categoria','CATEGORIA'])).trim(), valor: toNumberBR(pick(r,['valor','Valor','VALOR','total','Total','TOTAL'])) }))
  let dfc = dfcStd.map(r => ({ descricao: String(pick(r,['descricao','Descrição','DESCRICAO','categoria','Categoria','CATEGORIA'])).trim(), entrada: toNumberBR(pick(r,['entrada','Entrada','ENTRADA'])), saida: toNumberBR(pick(r,['saida','Saída','SAIDA'])), saldo: toNumberBR(pick(r,['saldo','Saldo','SALDO'])), data: String(pick(r,['data','Data','DATA','dt','DT','date','Date'])).trim() }))
  const empty = (arr) => !arr.length || arr.every(x => (!x.conta && !x.descricao))
  if (empty(dre)) {
    const m = utils.sheet_to_json(dreSheet, { header: 1 })
    dre = m.map(row => {
      if (!Array.isArray(row)) return { conta: '', valor: 0 }
      const contaCell = row.find(x => typeof x === 'string' && x.trim()) || ''
      const nums = row.filter(x => typeof x === 'number' || (typeof x === 'string' && /\d/.test(x)))
      const lastNum = nums.length ? toNumberBR(nums[nums.length-1]) : 0
      return { conta: String(contaCell).trim(), valor: lastNum }
    }).filter(r => r.conta || r.valor)
  }
  if (empty(dfc)) {
    const m = utils.sheet_to_json(dfcSheet, { header: 1 })
    dfc = m.map(row => {
      if (!Array.isArray(row)) return { descricao: '', entrada: 0, saida: 0, saldo: 0 }
      const descricao = row.find(x => typeof x === 'string' && x.trim()) || ''
      const dateCell = row.find(x => typeof x === 'string' && /\d{1,2}\/[0-9]{2}\/[0-9]{4}/.test(x)) || ''
      const nums = row.filter(x => typeof x === 'number' || (typeof x === 'string' && /\d/.test(x)))
      const entrada = nums[0] ? toNumberBR(nums[0]) : 0
      const saida = nums[1] ? toNumberBR(nums[1]) : 0
      const saldo = nums[2] ? toNumberBR(nums[2]) : (entrada - saida)
      return { descricao: String(descricao).trim(), entrada, saida, saldo, data: dateCell }
    }).filter(r => r.descricao || r.entrada || r.saida)
  }
  return { dre, dfc }
}

async function restGet(BASE_URL, ANON_KEY, SERVICE_KEY, path, query={}) {
  const url = new URL(`${BASE_URL}/rest/v1/${path}`)
  Object.entries(query).forEach(([k,v])=>url.searchParams.set(k,v))
  const res = await fetch(url.toString(), { headers: { apikey: ANON_KEY, Authorization: `Bearer ${SERVICE_KEY || ANON_KEY}`, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`)
  return res.json()
}

async function restPost(BASE_URL, ANON_KEY, path, body, SERVICE_KEY, onConflict) {
  const url = onConflict ? `${BASE_URL}/rest/v1/${path}?on_conflict=${encodeURIComponent(onConflict)}` : `${BASE_URL}/rest/v1/${path}`
  const res = await fetch(url, { method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${SERVICE_KEY || ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation, resolution=ignore-duplicates' }, body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`POST ${path} ${res.status} ${txt}`)
  }
  return res.json()
}
async function restDelete(BASE_URL, ANON_KEY, path, filterQuery, SERVICE_KEY) {
  const url = new URL(`${BASE_URL}/rest/v1/${path}`)
  Object.entries(filterQuery).forEach(([k,v])=>url.searchParams.set(k,v))
  const res = await fetch(url.toString(), { method: 'DELETE', headers: { apikey: ANON_KEY, Authorization: `Bearer ${SERVICE_KEY || ANON_KEY}` } })
  return res.ok
}
function fixedKinds() { return { kindEntry: 'in', kindExit: 'out' } }

async function restValidateFields(BASE_URL, TOKEN, table, fields) {
  const url = new URL(`${BASE_URL}/rest/v1/${table}`)
  url.searchParams.set('select', fields.join(','))
  url.searchParams.set('limit', '0')
  const res = await fetch(url.toString(), { headers: { apikey: TOKEN, Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } })
  return res.ok
}

async function main(){
  const { BASE_URL, ANON_KEY, SERVICE_KEY } = readEnv()
  if (!BASE_URL || !ANON_KEY) throw new Error('Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in .env')
  const excelPath = path.join(process.cwd(), 'avant', 'integracao', 'f360', 'DRE e DFC outubro.2025.xlsx')
  const { dre, dfc } = parseExcel(excelPath)
  let targetCnpjs = []
  try {
    const companies = await restGet(BASE_URL, ANON_KEY, SERVICE_KEY, 'clientes', { select: 'cnpj', limit: '50' })
    targetCnpjs = Array.isArray(companies) ? companies.map((c)=>c.cnpj).filter(Boolean) : []
  } catch {}
  if (!targetCnpjs.length) targetCnpjs = ['11.111.111/0100-11']
  const cnpj = String(targetCnpjs[0] || '').replace(/\D/g, '') || '11111111010011'

  const toIso = (s) => {
    if (!s) return new Date().toISOString().slice(0,10)
    const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
    const dt = new Date(s)
    return isNaN(dt.getTime()) ? new Date().toISOString().slice(0,10) : dt.toISOString().slice(0,10)
  }
  const classifyNature = (name, value) => {
    const s = String(name || '').toLowerCase()
    if (/receita|venda|faturamento/.test(s)) return 'receita'
    return 'despesa'
  }
  const dreRows = dre
    .filter(d => {
      const name = String(d.conta || '')
      if (!name.trim()) return false
      if (/demonstrativo/i.test(name)) return false
      if (/^\d{4}$/.test(name.trim())) return false
      const val = Number(d.valor) || 0
      if (val === 0) return false
      return true
    })
    .map(d => ({ company_cnpj: cnpj, account: d.conta, amount: d.valor, date: toIso(d.data), nature: classifyNature(d.conta, d.valor) }))

  const kindDetected = fixedKinds()
  const dfcRows = []
  for (const d of dfc) {
    const desc = String(d.descricao || '')
    if (!desc.trim()) continue
    if (/^\d{4}$/.test(desc.trim())) continue
    const date = toIso(d.data)
    if (d.entrada && d.entrada > 0) {
      dfcRows.push({ company_cnpj: cnpj, category: desc, kind: kindDetected.kindEntry, amount: d.entrada, date })
    }
    if (d.saida && d.saida > 0) {
      dfcRows.push({ company_cnpj: cnpj, category: desc, kind: kindDetected.kindExit, amount: d.saida, date })
    }
  }
  // inserir em lotes para evitar payload grande
  const batch = async (rows, table) => {
    const size = 500
    for (let i=0; i<rows.length; i+=size) {
      const chunk = rows.slice(i, i+size)
      const conflict = table === 'dre_entries' ? 'company_cnpj,date,account' : undefined
      await restPost(BASE_URL, ANON_KEY, table, chunk, SERVICE_KEY, conflict)
    }
  }
  await batch(dreRows, 'dre_entries')
  await batch(dfcRows, 'cashflow_entries')
  const ts = new Date().toISOString().replace(/[-:TZ]/g,'').slice(0,14)
  const out = { insertedDRE: dreRows.length, insertedDFC: dfcRows.length, cnpj, kindDetected }
  const dir = path.join(process.cwd(), 'var', 'snapshots')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `import_${ts}.json`), JSON.stringify(out, null, 2))
  process.stdout.write(JSON.stringify(out, null, 2)+"\n")
}

main().catch(e=>{ console.error(e); process.exit(1) })