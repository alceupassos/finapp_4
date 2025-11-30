import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  FileText, 
  Settings, 
  LogOut,
  ChevronRight,
  BarChart3,
  Users,
  Bell,
  Newspaper
} from 'lucide-react';
import { useState } from 'react';
import { logout } from '../services/auth'

interface ModernSidebarProps {
  onOpenSettings?: () => void
  role?: 'admin' | 'cliente' | 'franqueado' | 'personalizado'
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: BarChart3, label: 'Análises', active: false },
  { icon: Newspaper, label: 'Notícias', active: false },
  { icon: TrendingUp, label: 'Fluxo de Caixa', active: false },
  { icon: Wallet, label: 'Extrato de Lançamentos', active: false },
  { icon: FileText, label: 'Relatórios', active: false },
  { icon: Users, label: 'Clientes', active: false },
];

function getBottomItems(role: ModernSidebarProps['role']) {
  const items: { icon: any; label: string; adminOnly?: boolean }[] = [
    { icon: Bell, label: 'Notificações' },
    { icon: Settings, label: 'Configurações' },
    { icon: LogOut, label: 'Sair' },
  ]
  return items.filter(i => !i.adminOnly || role === 'admin')
}

export function ModernSidebar({ onOpenSettings, role = 'cliente' }: ModernSidebarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-charcoal-950 via-graphite-950 to-charcoal-900 border-r border-graphite-900 flex flex-col z-50 pattern-soft ultra-sidebar"
    >
      {/* Logo */}
      <div className="p-6 border-b border-graphite-900 flex justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <img 
            src="/finapp-logo.png" 
            alt="FinApp Logo" 
            className="h-16 w-auto object-contain"
          />
        </motion.div>
      </div>

      {/* Menu Principal */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 * index }}
            onHoverStart={() => setHoveredIndex(index)}
            onHoverEnd={() => setHoveredIndex(null)}
            onClick={() => {
              if (item.label === 'Relatórios') {
                const e = new CustomEvent('navigate', { detail: 'Relatórios' })
                window.dispatchEvent(e)
              }
              if (item.label === 'Clientes') {
                const e = new CustomEvent('navigate', { detail: 'Clientes' })
                window.dispatchEvent(e)
              }
              if (item.label === 'Dashboard' || item.label === 'Análises' || item.label === 'Notícias' || item.label === 'Fluxo de Caixa' || item.label === 'Extrato de Lançamentos') {
                const e = new CustomEvent('navigate', { detail: item.label })
                window.dispatchEvent(e)
              }
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
              transition-all duration-200 group relative
              ${item.active 
                ? 'bg-gold-500 text-white shadow-glow-sm' 
                : 'text-graphite-400 hover:text-white hover:bg-graphite-900'
              }
            `}
          >
            {item.active && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gold-500 rounded-xl"
                transition={{ type: 'spring', duration: 0.6 }}
              />
            )}
            
            <motion.span whileHover={{ scale: 1.08, rotate: 1 }} className="relative z-10">
              <item.icon className={`w-4 h-4 ${item.active ? 'text-white' : ''}`} />
            </motion.span>
            <span className="text-sm font-medium relative z-10">{item.label}</span>
            
            {hoveredIndex === index && !item.active && (
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="ml-auto"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </nav>

      {/* Menu Inferior */}
      <div className="p-4 border-t border-graphite-900 space-y-1">
        {getBottomItems(role).map((item, index) => (
          <motion.button
            key={item.label}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (item.label === 'Configurações') onOpenSettings && onOpenSettings()
              if (item.label === 'Sair') { logout(); window.dispatchEvent(new CustomEvent('logout')); location.reload() }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-graphite-400 hover:text-white hover:bg-graphite-900 transition-all duration-200"
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </motion.button>
        ))}
      </div>

      {/* User Profile */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-4 border-t border-graphite-900"
      >
        <div className="flex items-center gap-3 p-3 rounded-xl bg-graphite-900 hover:bg-graphite-800 transition-all cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold">
            AC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Admin BPO</p>
            <p className="text-xs text-graphite-400 truncate">admin@bpo.com</p>
          </div>
        </div>
      </motion.div>
    </motion.aside>
  );
}
