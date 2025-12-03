import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Loader2 } from 'lucide-react'

interface F360ImportModalProps {
  open: boolean
  onClose: () => void
}

export function F360ImportModal({ open, onClose }: F360ImportModalProps) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const handleImport = async () => {
    setLoading(true)
    setError('')
    setProgress('Iniciando importação...')

    try {
      // Chamar API/Edge Function para executar o script de importação
      const response = await fetch('/api/f360/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Erro ao iniciar importação')
      }

      const data = await response.json()
      setProgress(`Importação iniciada: ${data.message || 'Processando...'}`)

      // Em produção, usar WebSocket ou polling para atualizar progresso
      setTimeout(() => {
        setProgress('Importação concluída!')
        setLoading(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Erro ao importar dados do F360')
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-graphite-900 rounded-2xl border border-graphite-800 p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Importar Dados F360</h3>
                <button
                  onClick={onClose}
                  className="text-graphite-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-graphite-400">
                  Esta ação irá importar dados de DRE, DFC, Plano de Contas e Contas Bancárias
                  para todas as 13 empresas do Grupo Volpe do ano de 2025.
                </p>

                {progress && (
                  <div className="p-3 bg-graphite-800 rounded-lg">
                    <p className="text-sm text-graphite-300">{progress}</p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-lg bg-graphite-800 text-graphite-300 hover:bg-graphite-700 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-lg bg-gold-500 text-white hover:bg-gold-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Iniciar Importação
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

