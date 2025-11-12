import { motion } from 'framer-motion';
import { Search, Bell, Sun, Moon, Menu } from 'lucide-react';
import { useState } from 'react';

interface ModernTopbarProps {
  onThemeToggle?: () => void;
  isDark?: boolean;
}

export function ModernTopbar({ onThemeToggle, isDark = true }: ModernTopbarProps) {
  const [notifications, setNotifications] = useState(3);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 bg-charcoal-950/80 backdrop-blur-xl border-b border-graphite-900"
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-graphite-400 group-focus-within:text-gold-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar transações, clientes, relatórios..."
              className="
                w-full pl-12 pr-4 py-3 
                bg-graphite-900 
                border border-graphite-800 
                rounded-2xl 
                text-white placeholder-graphite-500
                focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20
                transition-all duration-200
              "
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 ml-6">
          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-3 rounded-xl bg-graphite-900 hover:bg-graphite-800 text-graphite-400 hover:text-white transition-all group"
          >
            <Bell className="w-5 h-5" />
            {notifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 rounded-full text-xs font-bold text-white flex items-center justify-center shadow-glow-sm"
              >
                {notifications}
              </motion.span>
            )}
          </motion.button>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onThemeToggle}
            className="p-3 rounded-xl bg-graphite-900 hover:bg-graphite-800 text-graphite-400 hover:text-white transition-all relative overflow-hidden group"
          >
            <motion.div
              initial={false}
              animate={{ 
                rotate: isDark ? 0 : 180,
                scale: isDark ? 1 : 0 
              }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="w-5 h-5" />
            </motion.div>
            <motion.div
              initial={false}
              animate={{ 
                rotate: isDark ? 180 : 0,
                scale: isDark ? 0 : 1 
              }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="w-5 h-5" />
            </motion.div>
            <div className="opacity-0">
              <Sun className="w-5 h-5" />
            </div>
          </motion.button>

          {/* Divider */}
          <div className="h-8 w-px bg-graphite-800" />

          {/* Quick Stats */}
          <div className="hidden lg:flex items-center gap-6 pl-4">
            <div className="text-right">
              <p className="text-xs text-graphite-400">Saldo Total</p>
              <p className="text-sm font-bold text-white">R$ 2.847.920,00</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-graphite-400">Variação</p>
              <p className="text-sm font-bold text-emerald-400">+12.5%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Title & Breadcrumb */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-white font-display"
            >
              Dashboard Financeiro
            </motion.h1>
            <motion.p 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-graphite-400 mt-1"
            >
              Visão geral • Atualizado agora há pouco
            </motion.p>
          </div>

          {/* Period Selector */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 bg-graphite-900 rounded-xl p-1"
          >
            {['Dia', 'Semana', 'Mês', 'Ano'].map((period, index) => (
              <button
                key={period}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${index === 3 
                    ? 'bg-gold-500 text-white shadow-glow-sm' 
                    : 'text-graphite-400 hover:text-white hover:bg-graphite-800'
                  }
                `}
              >
                {period}
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
