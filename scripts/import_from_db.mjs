import fs from 'fs'
import path from 'path'

function readEnv() {
  const root = process.cwd()
  const local = path.join(root, '.env.local')
  const content = fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : ''
  const map = {}
  content.split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i>0) map[line.slice(0,i)] = line.slice(i+1) })
  const type = String(process.env.ERP_DB_TYPE || '').toLowerCase()
  const host = process.env.ERP_DB_HOST
  const port = process.env.ERP_DB_PORT
  const user = process.env.ERP_DB_USER
  const pass = process.env.ERP_DB_PASS
  const name = process.env.ERP_DB_NAME
  const schema = process.env.ERP_DB_SCHEMA || 'public'
  const base = String(map['VITE_SUPABASE_URL'] || '').replace(/\r/g,'').replace(/\s+$/,'')
  const anon = String(map['VITE_SUPABASE_ANON_KEY'] || '').replace(/\r/g,'')
  const srk = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\r/g,'')
  const cnpj = String(process.env.ERP_COMPANY_CNPJ || '').replace(/\D/g,'')
  const mapFile = process.env.ERP_MAP_FILE || ''
  return { type, host, port, user, pass, name, schema, base, anon, srk, cnpj, mapFile }
}

async function connect(env) {
  if (env.type === 'postgres' || env.type === 'pg') {
    const { Client } = await import('pg')
    const client = new Client({ host: env.host, port: Number(env.port||5432), user: env.user, password: env.pass, database: env.name })
    await client.connect(); return { kind: 'pg', client }
  } else if (env.type === 'mysql') {
    const mysql = await import('mysql2/promise')
    const conn = await mysql.createConnection({ host: env.host, port: Number(env.port||3306), user: env.user, password: env.pass, database: env.name })
    return { kind: 'mysql', client: conn }
  } else {
    throw new Error('Unsupported ERP_DB_TYPE')
  }
}

async function query(info, q, params=[]) {
  if (info.kind === 'pg') {
    const r = await info.client.query(q, params); return r.rows
  } else {
    const [rows] = await info.client.execute(q, params); return rows
  }
}

function toIso(s){ if(!s) return new Date().toISOString().slice(0,10); const m=String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; const d=new Date(s); return isNaN(d.getTime())? new Date().toISOString().slice(0,10) : d.toISOString().slice(0,10) }
function toNumber(v){ if(v==null) return 0; if(typeof v==='number') return v; const n=Number(String(v).replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n }

async function restPost(base, anon, srk, table, rows, onConflict){
  const url = onConflict? `${base}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}` : `${base}/rest/v1/${table}`
  const res = await fetch(url, { method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${srk || anon}`, 'Content-Type': 'application/json', Prefer: 'return=representation, resolution=ignore-duplicates' }, body: JSON.stringify(rows) })
  if(!res.ok){ const t=await res.text(); throw new Error(`${table} ${res.status} ${t}`) }
  return res.json()
}

async function main(){
  const env = readEnv()
  const info = await connect(env)
  let mapSuggest = {}
  if (env.mapFile && fs.existsSync(env.mapFile)) mapSuggest = JSON.parse(fs.readFileSync(env.mapFile,'utf8'))
  if (!mapSuggest.ledger) {
    const snapDir = path.join(process.cwd(), 'var', 'snapshots')
    const latest = fs.existsSync(snapDir)? fs.readdirSync(snapDir).filter(f=>f.startsWith('discover_')).sort().pop() : ''
    if (latest) mapSuggest = JSON.parse(fs.readFileSync(path.join(snapDir, latest),'utf8'))
  }
  const lt = mapSuggest.ledgerTable || process.env.ERP_LEDGER_TABLE || ''
  const lm = mapSuggest.ledgerMap || {}
  if (!lt) throw new Error('Missing ledger table mapping')
  let q
  if (info.kind==='pg') {
    q = `select ${lm.date||'date'} as date, ${lm.amount||'amount'} as amount, ${lm.accountCode||'account_code'} as code, ${lm.accountName||'account_name'} as name from ${env.schema}."${lt}" where ${lm.date||'date'} is not null`
  } else {
    q = `select ${lm.date||'date'} as date, ${lm.amount||'amount'} as amount, ${lm.accountCode||'account_code'} as code, ${lm.accountName||'account_name'} as name from \`${lt}\` where ${lm.date||'date'} is not null`
  }
  const rows = await query(info, q)
  const dreRows = []
  const dfcRows = []
  rows.forEach(r=>{
    const date = toIso(r.date)
    const amount = toNumber(r.amount)
    const name = String(r.name||'').trim()
    const isCash = /caixa|banco|cash|bank/i.test(name)
    if (/receita|venda|faturamento/i.test(name)) {
      dreRows.push({ company_cnpj: env.cnpj, account: name, amount, date, nature: 'receita' })
      if (isCash) dfcRows.push({ company_cnpj: env.cnpj, category: name, kind: 'in', amount: Math.abs(amount), date })
    } else if (/despesa|custo|imposto|taxa|fornecedor|contas a pagar/i.test(name)) {
      dreRows.push({ company_cnpj: env.cnpj, account: name, amount: -Math.abs(amount), date, nature: 'despesa' })
      if (isCash) dfcRows.push({ company_cnpj: env.cnpj, category: name, kind: 'out', amount: Math.abs(amount), date })
    } else {
      if (isCash) {
        const kind = amount >= 0 ? 'in' : 'out'
        dfcRows.push({ company_cnpj: env.cnpj, category: name || 'Movimento', kind, amount: Math.abs(amount), date })
      } else {
        dreRows.push({ company_cnpj: env.cnpj, account: name || 'Lançamento', amount, date, nature: amount>=0?'receita':'despesa' })
      }
    }
  })
  const batch = async (list, table, conflict) => {
    const size = 500
    for (let i=0;i<list.length;i+=size) {
      await restPost(env.base, env.anon, env.srk, table, list.slice(i,i+size), conflict)
    }
  }
  await batch(dreRows, 'dre_entries', 'company_cnpj,date,account')
  await batch(dfcRows, 'cashflow_entries', 'company_cnpj,date,kind,category,amount')
  const dir = path.join(process.cwd(), 'var','snapshots'); fs.mkdirSync(dir,{recursive:true})
  const out = { insertedDRE: dreRows.length, insertedDFC: dfcRows.length, cnpj: env.cnpj, ledgerTable: lt }
  fs.writeFileSync(path.join(dir, `import_db_${Date.now()}.json`), JSON.stringify(out,null,2))
  if (info.kind==='pg') await info.client.end(); else await info.client.end?.()
  process.stdout.write(JSON.stringify(out,null,2)+"\n")
}

main().catch(e=>{ console.error(e); process.exit(1) })