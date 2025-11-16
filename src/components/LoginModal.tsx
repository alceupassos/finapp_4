import { useState } from 'react'
import { motion } from 'framer-motion'
import { validateMockLogin, loginSupabase, verifySupabaseDataAccess } from '../services/auth'
import { fadeIn, slideUp, scaleOnHover } from '../lib/motion'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  onLogged: (session: any) => void
}

export function LoginModal({ open, onClose, onLogged }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [forgot, setForgot] = useState(false)
  if (!open) return null
  const submit = async () => {
    setError('')
    // tenta login Supabase primeiro; se falhar, cai para mock (modo demo)
    let s = await loginSupabase(email, password)
    if (!s) s = await validateMockLogin(email, password)
    if (!s) { setError('Credenciais inválidas'); return }
    const ver = await verifySupabaseDataAccess()
    if (!ver.ok) {
      console.warn('[login] Usuário autenticado, porém dados reais não acessíveis', ver)
    }
    onLogged(s)
    onClose()
  }
  return (
    <motion.div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xl flex items-center justify-center">
      <motion.div variants={slideUp} initial="hidden" animate="show" className="neomorphic neomorphic-hover w-[380px] rounded-xl border border-graphite-800/30 shadow-soft-lg">
        <div className="p-7 space-y-4">
          <div className="flex flex-col items-center gap-2">
            <img src="/finapp-logo.png" alt="fin.app" className="w-40 h-auto" />
            <h3 className="text-sm font-semibold">Entrar</h3>
          </div>
          <motion.input whileHover={scaleOnHover.whileHover} value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="E-mail" className="w-full bg-graphite-900 border border-graphite-800 rounded-sm px-2 py-1 text-xs"/>
          <motion.input whileHover={scaleOnHover.whileHover} type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Senha" className="w-full bg-graphite-900 border border-graphite-800 rounded-sm px-2 py-1 text-xs"/>
          <div className="flex items-center justify-between">
            <button onClick={()=>setForgot(true)} className="text-xs text-muted-foreground hover:text-foreground">Esqueci a senha</button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <motion.button whileHover={scaleOnHover.whileHover} whileTap={{ scale: 0.98 }} onClick={submit} className="px-3 py-1 rounded-sm bg-emerald-400 text-white hover:bg-emerald-500">Entrar</motion.button>
          </div>
          {forgot && (
            <div className="rounded-md border border-graphite-800 p-3 text-xs text-muted-foreground space-y-1">
              <p>Login padrão usa Supabase (usuário real). Se quiser modo demo, use:</p>
              <p>• <span className="font-semibold text-foreground">admin@ifin.app</span> / <span className="font-semibold text-foreground">fin123</span></p>
              <p>• <span className="font-semibold text-foreground">dev@angrax.com.br</span> / <span className="font-semibold text-foreground">B5b0dcf500@#</span></p>
              <p>• Ou use senha <span className="font-semibold text-foreground">fin-demo</span> com qualquer email</p>
              <p>Recuperação de senha real será integrada depois.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
