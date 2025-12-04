import { useEffect, useState } from 'react'
import { SupabaseRest } from '../services/supabaseRest'
type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }

export function CustomersPage() {
  const [customers, setCustomers] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    (async () => {
      try {
        const cs = await SupabaseRest.getCompanies() as Company[]
        setCustomers(Array.isArray(cs) ? cs : [])
      } catch (e: any) {
        console.error('Erro ao carregar clientes:', e)
        setError(`Falha ao carregar clientes: ${e?.message || 'Erro desconhecido'}`)
      } finally {
        setLoading(false)
      }
    })()
  }, [])
  return (
    <div className="card-premium p-6">
      <p className="text-sm text-muted-foreground">Clientes • Dados Reais</p>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <div className="mt-4 rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-graphite-900">
            <tr>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">CNPJ</th>
              <th className="text-left p-3">Grupo</th>
            </tr>
          </thead>
          <tbody>
            {(loading ? [] : customers).map((c, idx) => (
              <tr key={idx} className="border-t border-border">
                <td className="p-3">{c.cliente_nome}</td>
                <td className="p-3">{c.cnpj}</td>
                <td className="p-3">{c.grupo_empresarial}</td>
              </tr>
            ))}
            {!loading && customers.length === 0 && (
              <tr><td className="p-3 text-sm text-muted-foreground" colSpan={3}>Nenhum cliente encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

