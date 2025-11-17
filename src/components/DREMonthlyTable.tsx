import { useEffect, useMemo, useState } from 'react'
import { SupabaseRest, MATRIZ_CNPJ } from '../services/supabaseRest'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'

type DRERow = { data?: string; conta?: string; natureza?: string; valor?: number }

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function DREMonthlyTable(){
  const [rows, setRows] = useState<DRERow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(()=>{
    (async ()=>{
      try{
        const data = await SupabaseRest.getDRE(MATRIZ_CNPJ) as any[]
        const norm = (Array.isArray(data)?data:[]).map(r=>({
          data: r.data,
          conta: r.conta,
          natureza: r.natureza,
          valor: Number(r.valor||0)
        }))
        setRows(norm)
      }catch(e:any){
        setError('Falha ao carregar DRE')
      }finally{ setLoading(false) }
    })()
  },[])

  const grouped = useMemo(()=>{
    const map = new Map<string, number[]>()
    rows.forEach(r=>{
      const d = r.data ? new Date(r.data) : new Date()
      const m = d.getMonth() // 0..11
      const key = String(r.natureza || r.conta || 'Outros')
      const arr = map.get(key) || Array(12).fill(0)
      arr[m] += Number(r.valor||0)
      map.set(key, arr)
    })
    return Array.from(map.entries()).map(([key, months])=>({ key, months }))
  }, [rows])

  return (
    <Card className="rounded-2xl border border-border">
      <CardHeader>
        <CardTitle>DRE • Matriz {MATRIZ_CNPJ}</CardTitle>
        <span className="text-xs text-muted-foreground">Colunas de Janeiro a Dezembro (período: Ano)</span>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Grupo/Conta</th>
                {MONTHS.map(m=> (
                  <th key={m} className="p-2 text-right">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-3" colSpan={13}>Carregando...</td></tr>
              ) : grouped.length === 0 ? (
                <tr><td className="p-3" colSpan={13}>Sem dados para a Matriz</td></tr>
              ) : grouped.map(row => (
                <tr key={row.key} className="border-t border-border">
                  <td className="p-2">{row.key}</td>
                  {row.months.map((v, i)=> (
                    <td key={i} className={`p-2 text-right ${v<0?'text-red-400':'text-emerald-400'}`}>R$ {Math.round(v).toLocaleString('pt-BR')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}