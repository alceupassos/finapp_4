import { useEffect, useMemo, useState } from 'react'
import { SupabaseRest, MATRIZ_CNPJ } from '../services/supabaseRest'
import { motion } from 'framer-motion'
import { X, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

type Row = { data?: string; conta?: string; natureza?: string; valor?: number }

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const groupMap: { name: string; match: RegExp[] }[] = [
  { name: 'Receitas Operacionais', match: [/vendas/i, /receita/i] },
  { name: 'Deduções', match: [/desconto/i, /taxa/i, /tarifa/i] },
  { name: 'Custos', match: [/custo/i, /cmv/i] },
  { name: 'Despesas Operacionais', match: [/despesa/i, /salario/i, /ordenado/i, /combustivel/i, /frete/i, /correio/i] },
  { name: 'Outras Receitas', match: [/outras receitas/i, /obtidos/i] },
  { name: 'Outras Despesas', match: [/outras despesas/i, /concedido/i, /juros/i] },
]

function resolveGroup(r: Row){
  const text = `${r.conta||''} ${r.natureza||''}`
  for(const g of groupMap){ if(g.match.some(m=>m.test(text))) return g.name }
  return 'Outros'
}

export function DREFullModal({ open, onClose }:{ open:boolean; onClose:()=>void }){
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(()=>{ if(!open) return; (async()=>{ try{ const data = await SupabaseRest.getDRE(MATRIZ_CNPJ) as any[]; setRows((Array.isArray(data)?data:[]).map(r=>({ data:r.data, conta:r.conta, natureza:r.natureza, valor:Number(r.valor||0) }))) } catch { setError('Falha ao carregar DRE') } finally{ setLoading(false) } })() },[open])

  const pivot = useMemo(()=>{
    const byGroup = new Map<string, number[]>()
    rows.forEach(r=>{ const d = r.data ? new Date(r.data) : new Date(); const m = d.getMonth(); const g = resolveGroup(r); const arr = byGroup.get(g) || Array(12).fill(0); arr[m] += Number(r.valor||0); byGroup.set(g, arr) })
    return Array.from(byGroup.entries()).map(([group, months])=>({ group, months }))
  },[rows])

  function exportXlsx(){
    const header = ['Grupo', ...MONTHS]
    const data = pivot.map(r=>[r.group, ...r.months.map(v=>Math.round(v))])
    const ws = XLSX.utils.aoa_to_sheet([header, ...data])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'DRE'); XLSX.writeFile(wb, `DRE_${MATRIZ_CNPJ}.xlsx`)
  }

  if(!open) return null
  return (
    <motion.div className="fixed inset-0 z-[95] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="fixed inset-6 rounded-2xl bg-graphite-950 border border-graphite-800 flex flex-col" initial={{ scale: 0.98 }} animate={{ scale: 1 }}>
        <div className="p-4 border-b border-graphite-800 flex items-center justify-between">
          <div className="text-sm font-semibold">DRE Completo • Matriz {MATRIZ_CNPJ}</div>
          <div className="flex items-center gap-2">
            <button onClick={exportXlsx} className="px-3 py-1 rounded-md bg-gold-500 text-white text-xs flex items-center gap-1"><Download className="w-3 h-3"/>Exportar</button>
            <button onClick={onClose} className="p-2 rounded-md bg-graphite-800"><X className="w-4 h-4 text-white"/></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left">Grupo</th>
                {MONTHS.map(m=> (<th key={m} className="p-2 text-right">{m}</th>))}
              </tr>
            </thead>
            <tbody>
              {loading ? (<tr><td className="p-3" colSpan={13}>Carregando...</td></tr>) : error ? (<tr><td className="p-3 text-destructive" colSpan={13}>{error}</td></tr>) : pivot.length===0 ? (<tr><td className="p-3" colSpan={13}>Sem dados</td></tr>) : pivot.map(r=> (
                <tr key={r.group} className="border-t border-graphite-800">
                  <td className="p-2">{r.group}</td>
                  {r.months.map((v,i)=> (<td key={i} className={`p-2 text-right ${v<0?'text-red-400':'text-emerald-400'}`}>R$ {Math.round(v).toLocaleString('pt-BR')}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )
}