import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { logger } from '../services/logger'

type Message = { role: 'user' | 'assistant'; content: string; ts: number }

interface OracleModalProps {
  open: boolean
  onClose: () => void
  contextRules?: string
}

export function OracleModal({ open, onClose, contextRules = '' }: OracleModalProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [open, messages])

  if (!open) return null

  const send = async () => {
    const q = input.trim()
    if (!q) return
    const now = Date.now()
    setMessages((m) => [...m, { role: 'user', content: q, ts: now }])
    setInput('')

    // Stub: integrar com Edge Function supabase (oracle-quick)
    const concise = `Consulta: ${q}\n\nRegra: ${contextRules ? contextRules.slice(0, 160) + '…' : 'padrão executiva'}\n\nResposta: Em breve, integrado ao Supabase / ERPs.`
    setMessages((m) => [...m, { role: 'assistant', content: concise, ts: Date.now() }])
    try { await logger.info('oracle_query', { endpoint: 'oracle', latencyMs: 0 }) } catch {}
  }

  return (
    <motion.div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute right-8 top-20 w-[520px] bg-card border border-border rounded-3xl shadow-soft-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-500" />
            <h3 className="text-sm font-semibold">Oráculo de IA • Respostas concisas</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div ref={containerRef} className="max-h-[48vh] overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-foreground' : 'text-muted-foreground'}>
              <p className="text-sm whitespace-pre-line">{m.content}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Faça uma pergunta rápida sobre lançamentos, DRE/DFC, fluxo ou insights.</p>
          )}
        </div>
        <div className="p-4 border-t border-border flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta…"
            className="flex-1 bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
          />
          <button
            onClick={send}
            className="px-3 py-2 rounded-xl bg-gold-500 text-white text-sm hover:bg-gold-600 focus-visible-ring"
          >
            Enviar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
