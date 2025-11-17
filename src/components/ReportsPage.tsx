import { useEffect, useState } from 'react'
import { SupabaseRest } from '../services/supabaseRest'

type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }

export function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [cnpj, setCnpj] = useState<string>('')
  const [dreCount, setDreCount] = useState<number>(0)
  const [dfcCount, setDfcCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const cs = await SupabaseRest.getCompanies() as Company[]
        setCompanies(cs || [])
        const normEnds0159 = (cs || []).find(c => String(c.cnpj || '').replace(/^0+/, '').endsWith('0159'))?.cnpj
        const firstVolpe = (cs || []).find(c => String(c.cliente_nome || '').toLowerCase().includes('volpe') || String(c.grupo_empresarial || '').toLowerCase().includes('volpe'))?.cnpj
        const first = normEnds0159 || firstVolpe || (cs && cs[0]?.cnpj) || ''
        setCnpj(first)
      } catch {
        setError('Falha ao carregar empresas')
      }
    })()
  }, [])

  useEffect(() => {
    if (!cnpj) return
    setLoading(true)
    ;(async () => {
      try {
        const dre = await SupabaseRest.getDRE(cnpj) as any[]
        setDreCount(Array.isArray(dre) ? dre.length : 0)
        const dfc = await SupabaseRest.getDFC(cnpj) as any[]
        setDfcCount(Array.isArray(dfc) ? dfc.length : 0)
      } catch {
        setError('Falha ao carregar relatórios')
      } finally {
        setLoading(false)
      }
    })()
  }, [cnpj])

  return (
    <div className="grid gap-6">
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Relatórios Gerenciais</p>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-graphite-900 border border-graphite-800">
            <p className="text-sm">DRE Consolidada</p>
            <p className="text-xs text-muted-foreground">{loading ? 'Carregando...' : `${dreCount} linhas`}</p>
          </div>
          <div className="p-4 rounded-xl bg-graphite-900 border border-graphite-800">
            <p className="text-sm">Fluxo de Caixa</p>
            <p className="text-xs text-muted-foreground">{loading ? 'Carregando...' : `${dfcCount} lançamentos`}</p>
          </div>
          <div className="p-4 rounded-xl bg-graphite-900 border border-graphite-800">
            <p className="text-sm">Receita por Cliente</p>
            <p className="text-xs text-muted-foreground">{loading ? 'Carregando...' : `${companies.length} clientes`}</p>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-muted-foreground">Empresa/CNPJ</label>
          <select value={cnpj} onChange={(e)=>setCnpj(e.target.value)} className="mt-1 px-3 py-2 bg-graphite-900 border border-graphite-800 rounded-md text-sm">
            <option value="">Selecione</option>
            {companies.map(c => (
              <option key={c.cnpj} value={c.cnpj}>{c.cliente_nome} • {c.cnpj}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

