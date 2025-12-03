import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, FlaskConical } from 'lucide-react'
import { runF360Test } from '../services/f360ImportTest'

interface Props { open: boolean; onClose: () => void }

export function F360ImportTestModal({ open, onClose }: Props) {
  const [excelUrl, setExcelUrl] = useState('/avant/integracao/f360/DRE e DFC outubro.2025.xlsx')
  const [imageUrl, setImageUrl] = useState('/avant/integracao/f360/WhatsApp Image 2025-11-13 at 18.48.30.jpeg')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any|null>(null)
  const [error, setError] = useState<string|null>(null)
  if (!open) return null
  const run = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await runF360Test({ excelUrl, imageUrl })
      setResult(r)
    } catch (e:any) {
      setError(e?.message || 'Falha ao executar teste')
    } finally { setLoading(false) }
  }
  return (
    <motion.div className="fixed inset-0 z-[67] bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-24 max-w-[860px] bg-card border border-border rounded-3xl shadow-soft-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2"><FlaskConical className="w-5 h-5 text-gold-500"/><h3 className="text-sm font-semibold">Teste de Importação F360 (Excel + Imagem)</h3></div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Excel (DRE/DFC)</label>
              <input value={excelUrl} onChange={(e)=>setExcelUrl(e.target.value)} className="w-full bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-xs"/>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Imagem (Nome/CNPJ/TOKEN)</label>
              <input value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} className="w-full bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-xs"/>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={run} disabled={loading} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground">{loading ? 'Executando…' : 'Executar teste'}</button>
            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground">Fechar</button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Identidade (Imagem)</p>
                <ul className="mt-2 text-xs space-y-1">
                  <li>Nome: {result.identity?.nome || '—'}</li>
                  <li>CNPJ: {result.identity?.cnpj || '—'}</li>
                  <li>Token: {result.identity?.token || '—'} {result.tokenExists ? '✓' : '✗'}</li>
                </ul>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Resumo Excel</p>
                <ul className="mt-2 text-xs space-y-1">
                  <li>DRE linhas: {result.dreCount}</li>
                  <li>DFC linhas: {result.dfcCount}</li>
                  <li>Total DRE: R$ {Number(result.dreTotal).toLocaleString('pt-BR')}</li>
                  <li>Entradas DFC: R$ {Number(result.dfcEntrada).toLocaleString('pt-BR')}</li>
                  <li>Saídas DFC: R$ {Number(result.dfcSaida).toLocaleString('pt-BR')}</li>
                  <li>Saldo DFC: R$ {Number(result.dfcSaldo).toLocaleString('pt-BR')}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}