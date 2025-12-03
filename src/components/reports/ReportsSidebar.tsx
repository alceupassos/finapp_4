import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Building2,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

export type ReportSection = 'dashboard' | 'dre' | 'dfc' | 'banks' | 'reconciliation' | 'chart-of-accounts'

interface ReportsSidebarProps {
  activeSection: ReportSection
  onSectionChange: (section: ReportSection) => void
}

interface MenuItem {
  id: ReportSection
  label: string
  icon: any
  description?: string
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Visão geral consolidada',
  },
  {
    id: 'dre',
    label: 'DRE',
    icon: FileText,
    description: 'Demonstração do Resultado',
  },
  {
    id: 'dfc',
    label: 'DFC',
    icon: TrendingUp,
    description: 'Fluxo de Caixa',
  },
  {
    id: 'banks',
    label: 'Bancos',
    icon: Building2,
    description: 'Saldos e movimentações',
  },
  {
    id: 'reconciliation',
    label: 'Conciliação',
    icon: CheckCircle2,
    description: 'Conciliação bancária',
  },
  {
    id: 'chart-of-accounts',
    label: 'Plano de Contas',
    icon: BookOpen,
    description: 'Hierarquia contábil',
  },
]

export function ReportsSidebar({ activeSection, onSectionChange }: ReportsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`fixed left-64 top-0 h-screen bg-gradient-to-b from-graphite-950 via-charcoal-950 to-graphite-900 border-r border-graphite-800 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } z-40`}
    >
      {/* Header */}
      <div className="p-4 border-b border-graphite-800 flex items-center justify-between">
        {!isCollapsed && (
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-semibold text-white"
          >
            Relatórios
          </motion.h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-graphite-800 transition-colors"
          title={isCollapsed ? 'Expandir' : 'Recolher'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-graphite-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-graphite-400 rotate-[-90deg]" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-80px)]">
        <AnimatePresence>
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <motion.button
                key={item.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSectionChange(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20'
                    : 'text-graphite-400 hover:text-white hover:bg-graphite-800'
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeReportSection"
                    className="absolute inset-0 bg-gold-500 rounded-xl"
                    transition={{ type: 'spring', duration: 0.6 }}
                  />
                )}

                <motion.span
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="relative z-10"
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                </motion.span>

                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="relative z-10 flex-1 text-left"
                  >
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-xs opacity-70 mt-0.5">{item.description}</div>
                    )}
                  </motion.div>
                )}

                {isActive && !isCollapsed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="relative z-10"
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </nav>
    </motion.aside>
  )
}

