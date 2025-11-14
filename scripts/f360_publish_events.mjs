import fs from 'fs'
import path from 'path'

function env(name, required=false) {
  const v = process.env[name]
  if (v && String(v).trim()) return String(v)
  // fallback para .env.local (apenas VITE_*) e .env.secret (segredos)
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

async function postWebhookCupom(token, payload){
  const url = `https://webhook.f360.com.br/${token}/f360-cupom-fiscal`
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const text = await res.text()
  return { status: res.status, text }
}

async function restPost(base, anon, srk, table, rows, onConflict){
  const url = onConflict? `${base}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}` : `${base}/rest/v1/${table}`
  const res = await fetch(url, { method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${srk || anon}`, 'Content-Type': 'application/json', Prefer: 'return=representation, resolution=ignore-duplicates' }, body: JSON.stringify(rows) })
  const text = await res.text()
  if(!res.ok) throw new Error(`${table} ${res.status} ${text}`)
  return text
}

async function main(){
  const F360_TOKEN = env('F360_TOKEN', true)
  const F360_CNPJ = onlyDigits(env('F360_CNPJ', true))
  const BASE = env('VITE_SUPABASE_URL', true).replace(/\/$/,'')
  const ANON = env('VITE_SUPABASE_ANON_KEY', true)
  const SRK = env('SUPABASE_SERVICE_ROLE_KEY', true)

  const now = new Date()
  const dt = now.toISOString().slice(0,19) // yyyy-MM-ddTHH:mm:ss
  const cupomPayload = {
    NomeSistema: 'FinAPP-Test',
    Values: [
      {
        NumeroCupom: `TEST-${Date.now()}`,
        CNPJEmitente: F360_CNPJ,
        Cliente: { Nome: 'Cliente Teste', CPF: '12345678901' },
        Data: dt,
        ValorTotal: 100.00,
        MeioPagamento: [ { FormaPagamento: 'Dinheiro', Valor: 100.00 } ]
      }
    ]
  }

  const resp = await postWebhookCupom(F360_TOKEN, cupomPayload)

  const supDate = toIsoDate(now)
  const dreRows = [ { company_cnpj: F360_CNPJ, account: 'Receita de Cupom Fiscal (Teste)', amount: 100.00, date: supDate, nature: 'receita' } ]
  const dfcRows = [ { company_cnpj: F360_CNPJ, category: 'Cupom Fiscal', kind: 'in', amount: 100.00, date: supDate } ]

  await restPost(BASE, ANON, SRK, 'dre_entries', dreRows, 'company_cnpj,date,account')
  await restPost(BASE, ANON, SRK, 'cashflow_entries', dfcRows, 'company_cnpj,date,kind,category,amount')

  const out = { webhook: { status: resp.status, body: resp.text.slice(0,200) }, supabase: { dreInserted: dreRows.length, dfcInserted: dfcRows.length }, cnpj: F360_CNPJ }
  const dir = path.join(process.cwd(), 'var', 'snapshots'); fs.mkdirSync(dir,{recursive:true})
  fs.writeFileSync(path.join(dir, `publish_${Date.now()}.json`), JSON.stringify(out,null,2))
  process.stdout.write(JSON.stringify(out,null,2)+"\n")
}

main().catch(e=>{ console.error(e); process.exit(1) })