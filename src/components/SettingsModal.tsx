import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Sliders, FileSpreadsheet, UploadCloud, FlaskConical } from 'lucide-react'
import { ExcelValidationModal } from './ExcelValidationModal'
import { ImportModal } from './ImportModal'
import { F360ImportTestModal } from './F360ImportTestModal'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onUpdateOracleContext?: (v: string) => void
}

const KEY = 'oracle_context_rules'

export function SettingsModal({ open, onClose, onUpdateOracleContext }: SettingsModalProps) {
  const [rules, setRules] = useState('')
  const [excelOpen, setExcelOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [f360TestOpen, setF360TestOpen] = useState(false)
  useEffect(() => {
    if (open) {
      const v = localStorage.getItem(KEY) || ''
      setRules(v)
    }
  }, [open])
  if (!open) return null

  const save = () => {
    localStorage.setItem(KEY, rules)
    onUpdateOracleContext && onUpdateOracleContext(rules)
    onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto mt-20 max-w-[720px] bg-card border border-border rounded-3xl shadow-soft-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2"><Sliders className="w-5 h-5 text-gold-500"/><h3 className="text-sm font-semibold">Configurações • Admin</h3></div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="text-sm text-muted-foreground">Regras de contexto do Oráculo</label>
          <textarea value={rules} onChange={(e)=>setRules(e.target.value)} rows={6} className="w-full bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"/>
        <div className="flex justify-between pt-2">
            <div className="flex gap-2">
              <button onClick={()=>setExcelOpen(true)} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground flex items-center gap-2"><FileSpreadsheet className="w-4 h-4"/>Validar Excel</button>
              <button onClick={()=>setImportOpen(true)} className="px-3 py-2 rounded-xl bg-info text-info-foreground flex items-center gap-2"><UploadCloud className="w-4 h-4"/>Importar para Supabase</button>
              <button onClick={()=>setF360TestOpen(true)} className="px-3 py-2 rounded-xl bg-gold-500 text-white flex items-center gap-2"><FlaskConical className="w-4 h-4"/>Teste F360 (Excel+Imagem)</button>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground">Cancelar</button>
              <button onClick={save} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground">Salvar</button>
            </div>
          </div>
        </div>
      </motion.div>
      <ExcelValidationModal open={excelOpen} onClose={()=>setExcelOpen(false)} />
      <ImportModal open={importOpen} onClose={()=>setImportOpen(false)} />
      <F360ImportTestModal open={f360TestOpen} onClose={()=>setF360TestOpen(false)} />
    </motion.div>
  )
}
