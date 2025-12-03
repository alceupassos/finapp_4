import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Sliders, 
  FileSpreadsheet, 
  UploadCloud, 
  FlaskConical, 
  Brain, 
  Sparkles, 
  Zap,
  Settings as SettingsIcon,
  Activity,
  ChevronRight,
  User,
  Shield,
  Palette,
  Bell,
  Database,
  Key
} from 'lucide-react'
import { ExcelValidationModal } from './ExcelValidationModal'
import { ImportModal } from './ImportModal'
import { F360ImportTestModal } from './F360ImportTestModal'
import { AIStreamingPanel } from './AIStreamingPanel'
import { useAuth } from '../hooks/useAuth'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onUpdateOracleContext?: (v: string) => void
}

const KEY = 'oracle_context_rules'

export function ModernSettingsModal({ open, onClose, onUpdateOracleContext }: SettingsModalProps) {
  const [rules, setRules] = useState('')
  const [excelOpen, setExcelOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [f360TestOpen, setF360TestOpen] = useState(false)
  const [aiSectionOpen, setAiSectionOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { user } = useAuth()

  const tabs = [
    { id: 'general', label: 'Geral', icon: SettingsIcon },
    { id: 'ai', label: 'IA Avançada', icon: Brain },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'data', label: 'Dados', icon: Database },
  ]

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-lg opacity-30"></div>
                  <Brain className="w-8 h-8 text-purple-600 relative z-10" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    IA Avançada
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configure e acesse o assistente de IA com ChatGPT 5.1
                  </p>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAiSectionOpen(!aiSectionOpen)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl p-4 flex items-center justify-between group hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">Abrir Assistente de IA</span>
                </div>
                <motion.div
                  animate={{ rotate: aiSectionOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.div>
              </motion.button>
            </div>

            <AnimatePresence>
              {aiSectionOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-gray-900 dark:text-white">Chat em Tempo Real</span>
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-green-500 rounded-full"
                      />
                    </div>
                  </div>
                  <div className="h-96">
                    <AIStreamingPanel />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      
      case 'appearance':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Aparência
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {['Claro', 'Escuro', 'Automático'].map((theme) => (
                <motion.button
                  key={theme}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-colors"
                >
                  <div className="w-full h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg mb-2"></div>
                  <span className="text-sm font-medium">{theme}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )
      
      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </h3>
            <div className="space-y-4">
              {['Email', 'Push', 'SMS', 'WhatsApp'].map((type) => (
                <motion.div
                  key={type}
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <span className="font-medium">{type}</span>
                  <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white dark:bg-gray-300 rounded-full transition-transform"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      
      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Segurança
            </h3>
            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200 dark:border-red-800 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-red-900 dark:text-red-100">Alterar Senha</div>
                    <div className="text-sm text-red-600 dark:text-red-400">Atualize sua senha regularmente</div>
                  </div>
                  <Key className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </motion.button>
              
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <div className="font-medium">Autenticação em Duas Etapas</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Adicione uma camada extra de segurança</div>
                </div>
                <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white dark:bg-gray-300 rounded-full transition-transform"></div>
                </div>
              </motion.div>
            </div>
          </div>
        )
      
      case 'data':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5" />
              Dados e Integrações
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setExcelOpen(true)}
                className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-3"
              >
                <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <div className="font-medium text-blue-900 dark:text-blue-100">Validar Excel</div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Teste importação de planilhas</div>
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setImportOpen(true)}
                className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800 flex items-center gap-3"
              >
                <UploadCloud className="w-6 h-6 text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <div className="font-medium text-green-900 dark:text-green-100">Importar Supabase</div>
                  <div className="text-sm text-green-600 dark:text-green-400">Envie dados para o banco</div>
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setF360TestOpen(true)}
                className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl border border-yellow-200 dark:border-yellow-800 flex items-center gap-3"
              >
                <FlaskConical className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                <div className="text-left">
                  <div className="font-medium text-yellow-900 dark:text-yellow-100">Teste F360</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">Excel + Imagem integrados</div>
                </div>
              </motion.button>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                <Sliders className="w-4 h-4" />
                Regras de contexto do Oráculo
              </label>
              <motion.textarea
                whileFocus={{ scale: 1.01 }}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                rows={6}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                placeholder="Defina as regras e contextos para o assistente de IA..."
              />
            </div>
            
            <div className="flex justify-between pt-4">
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setExcelOpen(true)}
                  className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground flex items-center gap-2 hover:bg-secondary/80 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Validar Excel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setImportOpen(true)}
                  className="px-4 py-2 rounded-xl bg-info text-info-foreground flex items-center gap-2 hover:bg-info/80 transition-colors"
                >
                  <UploadCloud className="w-4 h-4" />
                  Importar Supabase
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setF360TestOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gold-500 text-white flex items-center gap-2 hover:bg-gold-600 transition-colors"
                >
                  <FlaskConical className="w-4 h-4" />
                  Teste F360
                </motion.button>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={save}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                >
                  Salvar
                </motion.button>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="mx-auto mt-10 max-w-[900px] bg-card border border-border rounded-3xl shadow-soft-lg overflow-hidden"
      >
        <div className="flex h-[80vh]">
          {/* Sidebar */}
          <div className="w-64 bg-gradient-to-b from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-r border-border p-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-sm">{user?.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
              </div>
            </div>
            
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              ))}
            </nav>
          </div>
          
          {/* Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold">
                  Configurações • {tabs.find(t => t.id === activeTab)?.label}
                </h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </motion.div>
      
      <ExcelValidationModal open={excelOpen} onClose={() => setExcelOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <F360ImportTestModal open={f360TestOpen} onClose={() => setF360TestOpen(false)} />
    </motion.div>
  )
}