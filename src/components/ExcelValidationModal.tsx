import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle } from 'lucide-react'
import { loadFromAvant } from '../services/integration'

type Summary = {
  dreCount: number
  dfcCount: number
  dreTotal: number
  dfcEntrada: number
  dfcSaida: number
  dfcSaldo: number
  sampleDre: Array<{ conta: string; valor: number }>
  sampleDfc: Array<{ descricao: string; entrada: number; saida: number; saldo: number }>
}

interface ExcelValidationModalProps {
  open: boolean
  onClose: () => void
}

export function ExcelValidationModal({ open, onClose }: ExcelValidationModalProps) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    setSummary(null)
    ;(async () => {
      try {
        const { dre, dfc } = await loadFromAvant()
        const dreTotal = dre.reduce((a, b) => a + (Number(b.valor) || 0), 0)
        const dfcEntrada = dfc.reduce((a, b) => a + (Number(b.entrada) || 0), 0)
        const dfcSaida = dfc.reduce((a, b) => a + (Number(b.saida) || 0), 0)
        const dfcSaldo = dfc.reduce((a, b) => a + (Number(b.saldo) || 0), 0)
        setSummary({
          dreCount: dre.length,
          dfcCount: dfc.length,
          dreTotal,
          dfcEntrada,
          dfcSaida,
          dfcSaldo,
          sampleDre: dre.slice(0, 5).map(d => ({ conta: d.conta, valor: d.valor })),
          sampleDfc: dfc.slice(0, 5).map(d => ({ descricao: d.descricao, entrada: d.entrada, saida: d.saida, saldo: d.saldo })),
        })
      } catch (e: any) {
        setError(e?.message || 'Falha ao ler Excel')
      } finally {
        setLoading(false)
      }
    })()
  }, [open])

  if (!open) return null

  return (
    <motion.div className="fixed inset-0 z-[65] bg-black/55 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-20 max-w-[800px] bg-card border border-border rounded-3xl shadow-soft-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-success"/><h3 className="text-sm font-semibold">Validação de Excel (avant/vant)</h3></div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5">
          {loading && <p className="text-sm text-muted-foreground">Lendo planilhas…</p>}
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4"/>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {summary && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Linhas DRE</p>
                  <p className="text-sm font-semibold">{summary.dreCount}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Linhas DFC</p>
                  <p className="text-sm font-semibold">{summary.dfcCount}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Total DRE</p>
                  <p className="text-sm font-semibold">R$ {summary.dreTotal.toLocaleString('pt-BR')}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Entradas DFC</p>
                  <p className="text-sm font-semibold">R$ {summary.dfcEntrada.toLocaleString('pt-BR')}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Saídas DFC</p>
                  <p className="text-sm font-semibold">R$ {summary.dfcSaida.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Exemplos DRE</p>
                <ul className="mt-2 space-y-1">
                  {summary.sampleDre.map((d,i)=> (<li key={i} className="text-xs">{d.conta} — R$ {d.valor.toLocaleString('pt-BR')}</li>))}
                </ul>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Exemplos DFC</p>
                <ul className="mt-2 space-y-1">
                  {summary.sampleDfc.map((d,i)=> (<li key={i} className="text-xs">{d.descricao} — Entradas R$ {d.entrada.toLocaleString('pt-BR')} / Saídas R$ {d.saida.toLocaleString('pt-BR')}</li>))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

