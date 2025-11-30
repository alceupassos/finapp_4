import { useEffect, useState } from 'react'
import { RefreshCw, Database, CheckCircle2 } from 'lucide-react'
import { RagService } from '../services/rag'

export function RAGTab() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const s = await RagService.getStatus()
    setStatus(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const doRefresh = async () => {
    setLoading(true)
    const ok = await RagService.refresh()
    if (ok) await load()
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">RAG Cache</h4>
            <p className="text-xs text-muted-foreground">Atualização incremental e status</p>
          </div>
        </div>
        <button onClick={doRefresh} disabled={loading} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${loading ? 'bg-graphite-800/50 cursor-not-allowed' : 'bg-graphite-800 hover:bg-graphite-700'}`}>
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      <div className="card-premium p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <div className="text-sm">{status ? 'Cache encontrado' : 'Sem status disponível'}</div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-graphite-900 border border-graphite-800">
            <div className="text-xs text-muted-foreground">Última atualização</div>
            <div className="text-sm font-medium">{status?.updated_at ? new Date(status.updated_at).toLocaleString('pt-BR') : '-'}</div>
          </div>
          <div className="p-3 rounded-xl bg-graphite-900 border border-graphite-800">
            <div className="text-xs text-muted-foreground">Itens</div>
            <div className="text-sm font-medium">{status?.items_count ?? '-'}</div>
          </div>
          <div className="p-3 rounded-xl bg-graphite-900 border border-graphite-800">
            <div className="text-xs text-muted-foreground">ID</div>
            <div className="text-sm font-medium font-mono">{status?.id ?? '-'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

