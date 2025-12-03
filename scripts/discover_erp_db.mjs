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
  return { type, host, port, user, pass, name, schema, base, anon, srk }
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

function scoreTable(name) {
  const s = name.toLowerCase()
  let score = 0
  if (/lan[cç]/.test(s)) score+=3
  if (/mov/.test(s)) score+=2
  if (/financ|fatura|pag|titulo|lcto|cash|bank|caixa|contas?/.test(s)) score+=2
  return score
}

function scoreAccountTable(name) {
  const s = name.toLowerCase()
  let score = 0
  if (/plano/.test(s)) score+=3
  if (/conta|accounts?|chart/.test(s)) score+=2
  return score
}

function pickCandidate(list, scorer) {
  return list.map(n => ({ name: n, score: scorer(n) })).sort((a,b)=> b.score - a.score)[0]?.name
}

async function discover(env) {
  const info = await connect(env)
  let tables = []
  if (info.kind === 'pg') {
    const rows = await query(info, 'select table_name from information_schema.tables where table_schema=$1', [env.schema])
    tables = rows.map(r=>r.table_name)
  } else {
    const rows = await query(info, 'select table_name from information_schema.tables where table_schema = database()')
    tables = rows.map(r=>r.TABLE_NAME || r.table_name)
  }
  const ledgerTable = pickCandidate(tables, scoreTable)
  const accountTable = pickCandidate(tables, scoreAccountTable)
  const columns = {}
  async function getCols(t) {
    if (!t) return []
    if (info.kind === 'pg') {
      const r = await query(info, 'select column_name,data_type from information_schema.columns where table_schema=$1 and table_name=$2', [env.schema, t]); return r.map(x=>x.column_name)
    } else {
      const r = await query(info, 'select column_name,data_type from information_schema.columns where table_schema=database() and table_name=?', [t]); return r.map(x=>x.COLUMN_NAME || x.column_name)
    }
  }
  const ledgerCols = await getCols(ledgerTable)
  const accountCols = await getCols(accountTable)
  function guess(fields, names) {
    const f = {}
    const lower = new Set(fields.map(x=>x.toLowerCase()))
    function findAny(cands){ return cands.find(c=> lower.has(c)) }
    f.date = findAny(['data','date','dt','competencia'])
    f.amount = findAny(['valor','amount','total'])
    f.debit = findAny(['debito','debit'])
    f.credit = findAny(['credito','credit'])
    f.accountCode = findAny(['conta_codigo','cod_conta','account_code','codigo'])
    f.accountName = findAny(['conta_nome','account_name','descricao','categoria'])
    f.isCash = findAny(['is_cash','caixa','banco','conta_caixa'])
    f.cnpj = findAny(['cnpj','company_cnpj'])
    return f
  }
  const ledgerMap = guess(ledgerCols, [])
  const accountMap = guess(accountCols, [])
  const out = { env: { ...env, pass: undefined }, ledgerTable, accountTable, ledgerCols, accountCols, ledgerMap, accountMap }
  const dir = path.join(process.cwd(), 'var', 'snapshots'); fs.mkdirSync(dir,{recursive:true})
  const file = path.join(dir, `discover_${Date.now()}.json`)
  fs.writeFileSync(file, JSON.stringify(out, null, 2))
  if (info.kind === 'pg') await info.client.end(); else await info.client.end?.()
  process.stdout.write(file+"\n")
}

discover(readEnv()).catch(e=>{ console.error(e); process.exit(1) })