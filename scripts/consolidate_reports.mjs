import fs from 'fs'
import path from 'path'

function env(name, required=false){ const v=process.env[name]; if(v&&v.trim()) return v; const p=path.join(process.cwd(),'.env.local'); if(fs.existsSync(p)){ const m={}; fs.readFileSync(p,'utf8').split(/\r?\n/).forEach(l=>{const i=l.indexOf('='); if(i>0) m[l.slice(0,i)]=l.slice(i+1)}); if(m[name]&&m[name].trim()) return m[name]; } if(required) throw new Error(`Missing env ${name}`); return '' }
const BASE=env('VITE_SUPABASE_URL',true).replace(/\/$/,'')
const ANON=env('VITE_SUPABASE_ANON_KEY',true)
const SRK=process.env.SUPABASE_SERVICE_ROLE_KEY||''

async function rest(base, anon, srk, table, select){ const url=new URL(`${base}/rest/v1/${table}`); url.searchParams.set('select',select); url.searchParams.set('limit','100000'); const res=await fetch(url.toString(),{headers:{apikey:anon,Authorization:`Bearer ${srk||anon}`}}); if(!res.ok){ throw new Error(`${table} ${res.status}`)} return res.json() }

function aggregateDRE(rows){ const map=new Map(); for(const r of rows){ const k=`${r.company_cnpj}|${r.date}`; const v=map.get(k)||{ company_cnpj:r.company_cnpj, date:r.date, revenue:0, expense:0 }; const amt=Number(r.amount)||0; if((r.nature||'').toLowerCase()==='despesa'||amt<0) v.expense+=Math.abs(amt); else v.revenue+=Math.abs(amt); map.set(k,v) } return Array.from(map.values()) }
function aggregateDFC(rows){ const map=new Map(); for(const r of rows){ const k=`${r.company_cnpj}|${r.date}`; const v=map.get(k)||{ company_cnpj:r.company_cnpj, date:r.date, in:0, out:0 }; const amt=Number(r.amount)||0; if((r.kind||'').toLowerCase()==='out') v.out+=Math.abs(amt); else v.in+=Math.abs(amt); map.set(k,v) } return Array.from(map.values()) }

async function main(){ const dre=await rest(BASE,ANON,SRK,'dre_entries','company_cnpj,date,amount,nature'); const dfc=await rest(BASE,ANON,SRK,'cashflow_entries','company_cnpj,date,amount,kind'); const dreAgg=aggregateDRE(dre); const dfcAgg=aggregateDFC(dfc); const out={ dre: dreAgg, dfc: dfcAgg, generated_at: new Date().toISOString() }; const dir=path.join(process.cwd(),'var','snapshots'); fs.mkdirSync(dir,{recursive:true}); const file=path.join(dir,`consolidated_${Date.now()}.json`); fs.writeFileSync(file,JSON.stringify(out,null,2)); process.stdout.write(file+"\n") }

main().catch(e=>{ console.error(e); process.exit(1) })