import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react'
import { importAvantToSupabase } from '../services/importer'

interface ImportModalProps {
  open: boolean
  onClose: () => void
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const [cnpj, setCnpj] = useState('11.111.111/0100-11')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ dreCount: number; dfcCount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!open) return null
  const runImport = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await importAvantToSupabase(cnpj)
      setResult({ dreCount: res.dreCount, dfcCount: res.dfcCount })
    } catch (e: any) {
      setError(e?.message || 'Falha ao importar')
    } finally { setLoading(false) }
  }
  return (
    <motion.div className="fixed inset-0 z-[66] bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-24 max-w-[720px] bg-card border border-border rounded-3xl shadow-soft-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2"><UploadCloud className="w-5 h-5 text-gold-500"/><h3 className="text-sm font-semibold">Importar dados • F360/Omie → Supabase</h3></div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="text-sm text-muted-foreground">CNPJ alvo</label>
          <input value={cnpj} onChange={(e)=>setCnpj(e.target.value)} className="w-full bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm"/>
          <div className="flex gap-2">
            <button onClick={runImport} disabled={loading} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground">{loading ? 'Importando…' : 'Importar agora'}</button>
            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground">Fechar</button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-4 h-4"/><p className="text-sm">{error}</p></div>
          )}
          {result && (
            <div className="flex items-center gap-2 text-success"><CheckCircle2 className="w-4 h-4"/><p className="text-sm">Importados DRE {result.dreCount} e DFC {result.dfcCount} para {cnpj}</p></div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}