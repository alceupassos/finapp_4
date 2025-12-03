import fs from 'fs'
import path from 'path'
import { read, utils } from 'xlsx'

function readEnv() {
  const root = process.cwd()
  const local = path.join(root, '.env.local')
  const content = fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : ''
  const map = {}
  content.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i>0) map[line.slice(0,i)] = line.slice(i+1) })
  const url = String(map['VITE_SUPABASE_URL'] || '').replace(/\r/g,'').replace(/\s+$/,'')
  const anon = String(map['VITE_SUPABASE_ANON_KEY'] || '').replace(/\r/g,'')
  const srk = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\r/g,'')
  const fBase = String(process.env.F360_BASE_URL || '')
  const fToken = String(process.env.F360_TOKEN || '')
  const fCnpj = String(process.env.F360_CNPJ || '')
  const fDre = String(process.env.F360_DRE_PATH || '')
  const fDfc = String(process.env.F360_DFC_PATH || '')
  return { url, anon, srk, fBase, fToken, fCnpj, fDre, fDfc }
}

function onlyDigits(s){ return String(s||'').replace(/\D/g,'') }
function toIso(s){ if(!s) return new Date().toISOString().slice(0,10); const m=String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; const d=new Date(s); return isNaN(d.getTime())? new Date().toISOString().slice(0,10) : d.toISOString().slice(0,10) }
function toNumberBR(v){ if(v==null) return 0; if(typeof v==='number') return v; const s=String(v).replace(/\s|R\$|\./g,'').replace(',','.'); const n=Number(s); return isNaN(n)?0:n }

async function restPost(base, anon, srk, table, rows, onConflict){
  const url = onConflict? `${base}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}` : `${base}/rest/v1/${table}`
  const res = await fetch(url, { method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${srk || anon}`, 'Content-Type': 'application/json', Prefer: 'return=representation, resolution=ignore-duplicates' }, body: JSON.stringify(rows) })
  if(!res.ok){ const t=await res.text(); throw new Error(`${table} ${res.status} ${t}`) }
  return res.json()
}

async function fetchF360(base, token, path, query){
  const url = new URL(`${base.replace(/\/$/,'')}/${path.replace(/^\//,'')}`)
  Object.entries(query||{}).forEach(([k,v])=>url.searchParams.set(k,v))
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if(!res.ok) throw new Error(`F360 ${res.status}`)
  return res.json()
}

function parseDreFromArray(arr){
  return (Array.isArray(arr)?arr:[]).map(r=>{
    const account = r.account ?? r.conta ?? r.account_name ?? r.categoria ?? ''
    const amount = r.amount ?? r.valor ?? r.total ?? 0
    const date = r.date ?? r.data ?? ''
    const nature = r.nature ?? (toNumberBR(amount)>=0? 'receita':'despesa')
    return { account: String(account).trim(), amount: toNumberBR(amount), date: toIso(date), nature }
  }).filter(r => r.account && r.amount !== 0)
}

function parseDfcFromArray(arr){
  const out = []
  (Array.isArray(arr)?arr:[]).forEach(r=>{
    const desc = r.category ?? r.descricao ?? r.categoria ?? ''
    const date = r.date ?? r.data ?? ''
    const entrada = r.inflow ?? r.entrada ?? 0
    const saida = r.outflow ?? r.saida ?? 0
    const e = toNumberBR(entrada), s = toNumberBR(saida)
    if(String(desc).trim()){
      if(e>0) out.push({ category: String(desc).trim(), kind: 'in', amount: e, date: toIso(date) })
      if(s>0) out.push({ category: String(desc).trim(), kind: 'out', amount: s, date: toIso(date) })
    }
  })
  return out
}

async function parseExcelFallback(){
  const root = process.cwd()
  const excelPath = path.join(root, 'avant', 'integracao', 'f360', 'DRE e DFC outubro.2025.xlsx')
  const buf = fs.readFileSync(excelPath)
  const wb = read(buf, { type: 'buffer' })
  const names = wb.SheetNames
  const dreSheet = wb.Sheets[names.find(n=>/dre|resultado/i.test(n)) || names[0]]
  const dfcSheet = wb.Sheets[names.find(n=>/dfc|fluxo/i.test(n)) || names[1] || names[0]]
  const dreRows = utils.sheet_to_json(dreSheet, { defval: '' })
  const dfcRows = utils.sheet_to_json(dfcSheet, { defval: '' })
  let dre = parseDreFromArray(dreRows)
  // Fallback por linhas quando não há cabeçalhos padronizados
  if (dre.length === 0) {
    const m = utils.sheet_to_json(dreSheet, { header: 1 })
    dre = (Array.isArray(m)?m:[]).map(row => {
      if (!Array.isArray(row)) return null
      const accountCell = row.find(x => typeof x === 'string' && x.trim()) || ''
      const nums = row.filter(x => typeof x === 'number' || (typeof x === 'string' && /\d/.test(x)))
      const lastNum = nums.length ? toNumberBR(nums[nums.length-1]) : 0
      const account = String(accountCell).trim()
      if (!account || lastNum === 0) return null
      const nature = lastNum >= 0 ? 'receita' : 'despesa'
      return { account, amount: lastNum, date: new Date().toISOString().slice(0,10), nature }
    }).filter(Boolean)
  }
  const dfcStd = dfcRows.map(r=>({ descricao: r.descricao ?? r.categoria ?? r.category, entrada: toNumberBR(r.entrada ?? r.inflow), saida: toNumberBR(r.saida ?? r.outflow), data: r.data ?? r.date }))
  let dfc = []
  dfcStd.forEach(d=>{ const desc=String(d.descricao||'').trim(); if(!desc) return; if(d.entrada>0) dfc.push({ category: desc, kind:'in', amount:d.entrada, date: toIso(d.data) }); if(d.saida>0) dfc.push({ category: desc, kind:'out', amount:d.saida, date: toIso(d.data) }) })
  if (dfc.length === 0) {
    const m = utils.sheet_to_json(dfcSheet, { header: 1 })
    dfc = (Array.isArray(m)?m:[]).map(row => {
      if (!Array.isArray(row)) return null
      const desc = row.find(x => typeof x === 'string' && x.trim()) || ''
      const nums = row.filter(x => typeof x === 'number' || (typeof x === 'string' && /\d/.test(x)))
      const entrada = nums[0] ? toNumberBR(nums[0]) : 0
      const saida = nums[1] ? toNumberBR(nums[1]) : 0
      const dateCell = row.find(x => typeof x === 'string' && /\d{1,2}\/\d{1,2}\/\d{4}/.test(x)) || ''
      const date = toIso(dateCell)
      const category = String(desc).trim()
      if (!category) return null
      const out = []
      if (entrada > 0) out.push({ category, kind: 'in', amount: entrada, date })
      if (saida > 0) out.push({ category, kind: 'out', amount: saida, date })
      return out
    }).flat().filter(Boolean)
  }
  return { dre, dfc }
}

async function main(){
  const { url, anon, srk, fBase, fToken, fCnpj, fDre, fDfc } = readEnv()
  if(!url || !anon) throw new Error('Missing Supabase env')
  const cnpj = onlyDigits(fCnpj) || '11111111010011'
  let dre = [], dfc = []
  try {
    if(fBase && fToken && fDre && fDfc){
      const dreRaw = await fetchF360(fBase, fToken, fDre, {})
      const dfcRaw = await fetchF360(fBase, fToken, fDfc, {})
      dre = parseDreFromArray(dreRaw)
      dfc = parseDfcFromArray(dfcRaw)
    } else {
      const fb = await parseExcelFallback(); dre = fb.dre; dfc = fb.dfc
    }
  } catch {
    const fb = await parseExcelFallback(); dre = fb.dre; dfc = fb.dfc
  }
  const dreRows = dre.map(d=>({ company_cnpj: cnpj, account: d.account, amount: d.amount, date: d.date, nature: d.nature }))
  const dfcRows = dfc.map(d=>({ company_cnpj: cnpj, category: d.category, kind: d.kind, amount: d.amount, date: d.date }))
  const batch = async (rows, table, conflict) => {
    const size = 500
    for(let i=0;i<rows.length;i+=size){ await restPost(url, anon, srk, table, rows.slice(i,i+size), conflict) }
  }
  await batch(dreRows, 'dre_entries', 'company_cnpj,date,account')
  await batch(dfcRows, 'cashflow_entries', 'company_cnpj,date,kind,category,amount')
  const out = { insertedDRE: dreRows.length, insertedDFC: dfcRows.length, cnpj }
  const dir = path.join(process.cwd(), 'var', 'snapshots'); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir, `import_f360_${Date.now()}.json`), JSON.stringify(out,null,2))
  process.stdout.write(JSON.stringify(out,null,2)+"\n")
}

main().catch(e=>{ console.error(e); process.exit(1) })