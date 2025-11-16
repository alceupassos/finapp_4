import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Activity,
  Zap,
  Brain,
  Home,
  FileText,
  Monitor,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import { cn } from '../lib/utils'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export const ModernSidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const { user, logout } = useAuth()
  const { canView } = usePermissions()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/dashboard',
      permission: 'view_dashboard'
    },
    {
      id: 'extrato-lancamentos',
      label: 'Extrato de Lançamentos',
      icon: FileText,
      path: '/extrato-lancamentos',
      permission: 'view_reports'
    },
    {
      id: 'analises',
      label: 'Análises',
      icon: TrendingUp,
      path: '/analises',
      permission: 'view_analysis'
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      path: '/clients',
      permission: 'view_clients'
    },
    {
      id: 'noc',
      label: 'NOC',
      icon: Monitor,
      path: '/noc',
      permission: 'view_noc'
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      path: '/settings',
      permission: 'view_settings'
    }
  ]

  const filteredMenuItems = menuItems.filter(item => canView(item.permission))

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={cn(
        "relative h-screen bg-gradient-to-b from-white via-purple-50 to-blue-50",
        "dark:from-gray-900 dark:via-purple-900/10 dark:to-blue-900/10",
        "border-r border-gray-200 dark:border-gray-800",
        "shadow-2xl shadow-purple-500/10",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800",
        isCollapsed && "justify-center"
      )}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-lg opacity-30"></div>
              <Brain className="w-8 h-8 text-purple-600 relative z-10" />
            </motion.div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                iFin App
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">BPO Financeiro</p>
            </div>
          </motion.div>
        )}
        
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className={cn(
            "p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors",
            "bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-800/20 dark:to-blue-800/20"
          )}
        >
          {isCollapsed ? 
            <ChevronRight className="w-5 h-5 text-purple-600" /> : 
            <ChevronLeft className="w-5 h-5 text-purple-600" />
          }
        </motion.button>
      </div>

      {/* User Info */}
      <div className={cn(
        "p-6 border-b border-gray-200 dark:border-gray-800",
        isCollapsed && "px-3"
      )}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
          
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1"
            >
              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredMenuItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onHoverStart={() => setHoveredItem(item.id)}
            onHoverEnd={() => setHoveredItem(null)}
          >
            <motion.button
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                "hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100",
                "dark:hover:from-purple-800/20 dark:hover:to-blue-800/20",
                "hover:shadow-lg hover:shadow-purple-500/10",
                hoveredItem === item.id && "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-xl"
              )}
            >
              <motion.div
                animate={{ 
                  rotate: hoveredItem === item.id ? [0, 10, -10, 0] : 0,
                  scale: hoveredItem === item.id ? [1, 1.1, 1] : 1
                }}
                transition={{ duration: 0.5 }}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  hoveredItem === item.id ? "text-white" : "text-purple-600 dark:text-purple-400"
                )} />
              </motion.div>
              
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  transition={{ delay: 0.2 }}
                  className={cn(
                    "font-medium text-sm",
                    hoveredItem === item.id ? "text-white" : "text-gray-700 dark:text-gray-300"
                  )}
                >
                  {item.label}
                </motion.span>
              )}
              
              {/* Animated indicator */}
              <AnimatePresence>
                {hoveredItem === item.id && !isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="ml-auto"
                  >
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn(
        "p-6 border-t border-gray-200 dark:border-gray-800",
        isCollapsed && "px-3"
      )}>
        <motion.button
          whileHover={{ scale: 1.02, x: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl text-left",
            "bg-gradient-to-r from-red-50 to-pink-50",
            "dark:from-red-900/20 dark:to-pink-900/20",
            "hover:from-red-100 hover:to-pink-100",
            "dark:hover:from-red-800/30 dark:hover:to-pink-800/30",
            "transition-all duration-200"
          )}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
          </motion.div>
          
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-medium text-sm text-red-700 dark:text-red-300"
            >
              Sair
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-purple-400/20 dark:bg-purple-600/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}