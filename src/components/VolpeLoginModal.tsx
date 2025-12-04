import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { gotruePasswordSignIn } from '../services/auth'
import { SupabaseRest } from '../services/supabaseRest'
import { fadeIn, slideUp, scaleOnHover } from '../lib/motion'

interface VolpeLoginModalProps {
  open: boolean
  onClose: () => void
  onLogged: (session: any) => void
}

export function VolpeLoginModal({ open, onClose, onLogged }: VolpeLoginModalProps) {
  const [email, setEmail] = useState('adm@ifin.app.br')
  const [password, setPassword] = useState('app321')
  const [error, setError] = useState('')
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')

  useEffect(() => {
    if (open) {
      loadVolpeCompanies()
    }
  }, [open])

  const loadVolpeCompanies = async () => {
    try {
      const data = await SupabaseRest.getCompanies()
      if (Array.isArray(data) && data.length) {
        // Normalizar CNPJ removendo zeros à esquerda
        const normalizedCompanies = data.map(c => ({
          ...c,
          cnpj: c.cnpj ? c.cnpj.replace(/^0+/, '') : c.cnpj
        }))
        
        setCompanies(normalizedCompanies)
        if (normalizedCompanies.length > 0) {
          setSelectedCompany(normalizedCompanies[0].cnpj)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar empresas VOLPE:', err)
    }
  }

  const submit = async () => {
    setError('')
    try {
      const s = await gotruePasswordSignIn(email, password)
      if (!s) { 
        setError('Credenciais inválidas ou erro de conexão')
        return 
      }
      
      // Adicionar empresa selecionada à sessão
      const sessionWithCompany = {
        ...s,
        defaultCompany: selectedCompany,
        companies: companies
      }
      
      onLogged(sessionWithCompany)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    }
  }

  if (!open) return null

  return (
    <motion.div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xl flex items-center justify-center">
      <motion.div 
        variants={slideUp} 
        initial="hidden" 
        animate="show" 
        className="neomorphic neomorphic-hover w-[420px] rounded-xl border border-graphite-800/30 shadow-soft-lg"
      >
        <div className="p-7 space-y-4">
          <div className="flex flex-col items-center gap-2">
            {/* Logo iFinance */}
            <div className="flex items-center justify-center mb-2">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg px-4 py-2">
                <span className="text-white font-bold text-xl">iFinance</span>
              </div>
            </div>
            <img src="/finapp-logo.png" alt="fin.app" className="w-32 h-auto opacity-80" />
            <h3 className="text-sm font-semibold">Login - Grupo VOLPE</h3>
            <p className="text-xs text-muted-foreground">Acesso exclusivo para empresas do grupo VOLPE</p>
          </div>

          <motion.input 
            whileHover={scaleOnHover.whileHover} 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="E-mail" 
            className="w-full bg-graphite-900 border border-graphite-800 rounded-sm px-2 py-1 text-xs"
          />
          
          <motion.input 
            whileHover={scaleOnHover.whileHover} 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Senha" 
            className="w-full bg-graphite-900 border border-graphite-800 rounded-sm px-2 py-1 text-xs"
          />

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Empresa:</label>
            <select 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-graphite-900 border border-graphite-800 rounded-sm px-2 py-1 text-xs"
            >
              {companies.map((company) => (
                <option key={company.cnpj} value={company.cnpj}>
                  {company.cliente_nome} ({company.cnpj})
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          
          <div className="flex gap-2 justify-end pt-2">
            <motion.button 
              whileHover={scaleOnHover.whileHover} 
              whileTap={{ scale: 0.98 }} 
              onClick={submit} 
              className="px-3 py-1 rounded-sm bg-emerald-400 text-white hover:bg-emerald-500"
            >
              Entrar
            </motion.button>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            <p>Empresas disponíveis: {companies.length}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}