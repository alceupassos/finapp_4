import fs from 'fs'
import path from 'path'

function env(name, required=false) {
  const v = process.env[name]
  if (v && String(v).trim()) return String(v)
  const root = process.cwd()
  let map = {}
  for (const file of ['.env.local', '.env.secret']) {
    const p = path.join(root, file)
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8')
      content.split(/\r?\n/).forEach(line => { const i=line.indexOf('='); if(i>0){ map[line.slice(0,i)] = line.slice(i+1) } })
    }
  }
  const fallback = map[name]
  if (fallback && String(fallback).trim()) return String(fallback)
  if (required) throw new Error(`Missing env: ${name}`)
  return ''
}

function onlyDigits(s){ return String(s||'').replace(/\D/g,'') }
function toIsoDate(s){ if(!s) return new Date().toISOString().slice(0,10); const d=new Date(s); return isNaN(d.getTime())? new Date().toISOString().slice(0,10) : d.toISOString().slice(0,10) }

async function postCupom(token, cnpj) {
  const url = `https://webhook.f360.com.br/${token}/f360-cupom-fiscal`
  const now = new Date()
  const dt = now.toISOString().slice(0,19)
  const payload = { NomeSistema: 'FinAPP-Batch', Values: [ { NumeroCupom: `BATCH-${Date.now()}`, CNPJEmitente: cnpj, Cliente: { Nome:'Cliente Batch', CPF:'12345678901' }, Data: dt, ValorTotal: 50.00, MeioPagamento: [ { FormaPagamento:'Dinheiro', Valor:50.00 } ] } ] }
  const res = await fetch(url, { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
  return { status: res.status, body: await res.text() }
}

async function restPost(base, anon, srk, table, rows, onConflict){
  const url = onConflict? `${base}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}` : `${base}/rest/v1/${table}`
  const res = await fetch(url, { method:'POST', headers:{ apikey: anon, Authorization:`Bearer ${srk || anon}`, 'Content-Type':'application/json', Prefer:'return=representation, resolution=ignore-duplicates' }, body: JSON.stringify(rows) })
  const text = await res.text()
  if(!res.ok) throw new Error(`${table} ${res.status} ${text}`)
  return text
}

function readCompaniesList() {
  const candidates = [
    path.join(process.cwd(), 'avant', 'integracao', 'grupo_volpe_empresas.csv'),
    path.join(process.cwd(), 'arquivos', 'grupo_volpe_empresas.csv'),
    path.join(process.cwd(), 'var', 'data', 'grupo_volpe_empresas.csv')
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p,'utf8')
      return content.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
    }
  }
  const fromEnv = env('F360_CNPJS')
  if (fromEnv) return fromEnv.split(/[,;\s]+/).map(onlyDigits).filter(Boolean)
  return []
}

async function fetchGroupCnpjs() {
  const BASE = env('VITE_SUPABASE_URL', true).replace(/\/$/,'')
  const ANON = env('VITE_SUPABASE_ANON_KEY', true)
  const SRK = env('SUPABASE_SERVICE_ROLE_KEY', true)
  const group = env('F360_GROUP') || 'Grupo Volpe'
  const url = new URL(`${BASE}/rest/v1/integration_f360`)
  url.searchParams.set('grupo_empresarial', `eq.${group}`)
  url.searchParams.set('select', 'company_cnpj')
  url.searchParams.set('limit', '1000')
  const res = await fetch(url.toString(), { headers: { apikey: ANON, Authorization: `Bearer ${SRK}` } })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data.map(r => onlyDigits(r.company_cnpj)).filter(Boolean) : []
}

function readGroupToken() {
  const mdPathCandidates = [
    path.join(process.cwd(), 'avant', 'DADOS_REAIS_E_SIMULADORES.md'),
    path.join(process.cwd(), 'avant', 'erp', 'DADOS_REAIS_E_SIMULADORES.md')
  ]
  const group = env('F360_GROUP') || 'Grupo Volpe'
  for (const p of mdPathCandidates) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p,'utf8')
      const lines = content.split(/\r?\n/)
      for (const line of lines) {
        if (line.toLowerCase().includes(group.toLowerCase()) && line.toLowerCase().includes('token')) {
          const m = line.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
          if (m) return m[0]
        }
      }
    }
  }
  const tokensTxt = path.join(process.cwd(), 'tokens_omie_f360..txt')
  if (fs.existsSync(tokensTxt)) {
    const content = fs.readFileSync(tokensTxt,'utf8')
    const lines = content.split(/\r?\n/)
    for (const line of lines) {
      if (line.toLowerCase().includes(group.toLowerCase()) && line.toLowerCase().includes('token')) {
        const m = line.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
        if (m) return m[0]
      }
    }
  }
  return env('F360_TOKEN')
}

async function main(){
  const F360_TOKEN = readGroupToken()
  if (!F360_TOKEN) throw new Error('Token não encontrado para o grupo (F360_TOKEN ou MD)')
  const BASE = env('VITE_SUPABASE_URL', true).replace(/\/$/,'')
  const ANON = env('VITE_SUPABASE_ANON_KEY', true)
  const SRK = env('SUPABASE_SERVICE_ROLE_KEY', true)
  let list = readCompaniesList()
  if (!list.length) list = await fetchGroupCnpjs()
  if (!list.length) throw new Error('Nenhuma empresa encontrada (CSV, env F360_CNPJS ou Supabase integration_f360)')
  const now = new Date().toISOString().slice(0,10)
  const results = []
  for (const raw of list) {
    const cnpj = onlyDigits(raw)
    const w = await postCupom(F360_TOKEN, cnpj)
    const dre = [ { company_cnpj: cnpj, account:'Receita Cupom (Batch)', amount:50.00, date: now, nature:'receita' } ]
    const dfc = [ { company_cnpj: cnpj, category:'Cupom Fiscal', kind:'in', amount:50.00, date: now } ]
    await restPost(BASE, ANON, SRK, 'dre_entries', dre, 'company_cnpj,date,account')
    await restPost(BASE, ANON, SRK, 'cashflow_entries', dfc, 'company_cnpj,date,kind,category,amount')
    results.push({ cnpj, webhook_status: w.status })
    await new Promise(r=>setTimeout(r, 300))
  }
  const out = { processed: results.length, results }
  const dir = path.join(process.cwd(), 'var','snapshots'); fs.mkdirSync(dir,{recursive:true})
  fs.writeFileSync(path.join(dir, `publish_batch_${Date.now()}.json`), JSON.stringify(out,null,2))
  process.stdout.write(JSON.stringify(out,null,2)+"\n")
}

main().catch(e=>{ console.error(e); process.exit(1) })