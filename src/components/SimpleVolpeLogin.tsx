import { useState } from 'react'
import { motion } from 'framer-motion'
import { loginSupabase } from '../services/auth'
import { slideUp, scaleOnHover } from '../lib/motion'

interface SimpleVolpeLoginProps {
  open: boolean
  onClose: () => void
  onLogged: (session: any) => void
}

export function SimpleVolpeLogin({ open, onClose, onLogged }: SimpleVolpeLoginProps) {
  const [email, setEmail] = useState('dev@angrax.com.br')
  const [password, setPassword] = useState('B5b0dcf500@#')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)
    
    try {
      const session = await loginSupabase(email, password)
      if (!session) {
        setError('Credenciais inválidas')
        setLoading(false)
        return
      }
      
      onLogged(session)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xl flex items-center justify-center">
      <motion.div 
        variants={slideUp} 
        initial="hidden" 
        animate="show" 
        className="neomorphic neomorphic-hover w-[380px] rounded-xl border border-graphite-800/30 shadow-soft-lg"
      >
        <div className="p-7 space-y-4">
          <div className="flex flex-col items-center gap-2">
            <img src="/finapp-logo.png" alt="fin.app" className="w-40 h-auto" />
            <h3 className="text-sm font-semibold">Login - Grupo VOLPE</h3>
            <p className="text-xs text-muted-foreground">Acesso exclusivo para o grupo VOLPE</p>
          </div>

          <motion.input 
            whileHover={scaleOnHover.whileHover} 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="E-mail" 
            className="w-full bg-graphite-900 border border-graphite-800 rounded-sm px-2 py-1 text-xs"
            disabled={loading}
          />
          
          <motion.input 
            whileHover={scaleOnHover.whileHover} 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Senha" 
            className="w-full bg-graphite-900 border border-graphite-800 rounded-sm px-2 py-1 text-xs"
            disabled={loading}
          />

          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          
          <div className="flex gap-2 justify-end pt-2">
            <motion.button 
              whileHover={scaleOnHover.whileHover} 
              whileTap={{ scale: 0.98 }} 
              onClick={submit} 
              disabled={loading}
              className="w-full px-3 py-2 rounded-sm bg-emerald-400 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </motion.button>
          </div>

        </div>
      </motion.div>
    </div>
  )
}