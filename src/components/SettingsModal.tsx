import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Sliders } from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onUpdateOracleContext?: (v: string) => void
}

const KEY = 'oracle_context_rules'

export function SettingsModal({ open, onClose, onUpdateOracleContext }: SettingsModalProps) {
  const [rules, setRules] = useState('')
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
          <div className="flex items-center gap-2"><Sliders className="w-5 h-5 text-gold-500"/><h3 className="text-sm font-semibold">Configurações • Regras de Contexto</h3></div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="text-sm text-muted-foreground">Regras de contexto do Oráculo (empresa/grupo, fontes, tom e escopo)</label>
          <textarea value={rules} onChange={(e)=>setRules(e.target.value)} rows={8} className="w-full bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"/>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground">Cancelar</button>
            <button onClick={save} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground">Salvar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

