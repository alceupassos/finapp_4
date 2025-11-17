import { useEffect, useState } from 'react'
import { SupabaseRest, MATRIZ_CNPJ } from '../services/supabaseRest'

type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }

export function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [cnpj, setCnpj] = useState<string>(MATRIZ_CNPJ)
  const [dreCount, setDreCount] = useState<number>(0)
  const [dfcCount, setDfcCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const cs = await SupabaseRest.getCompanies() as Company[]
        setCompanies(cs || [])
        setCnpj(MATRIZ_CNPJ)
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
        const dfcRaw = await SupabaseRest.getDFC(cnpj) as any[]
        const dfc = (Array.isArray(dfcRaw) ? dfcRaw : []).filter(tx => {
          const s = String(tx.status || '').toLowerCase()
          if (s.includes('baixado') || s.includes('baixados') || s.includes('renegociado') || s.includes('renegociados')) return false
          if (!s.includes('conciliado')) return false
          return true
        })
        setDfcCount(dfc.length)
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
        <div className="mt-4 text-xs text-muted-foreground">CNPJ {cnpj}</div>
      </div>
    </div>
  )
}

