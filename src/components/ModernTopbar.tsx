import { motion } from 'framer-motion';
import { Search, Bell, Sun, Moon, Menu, Bot, LogOut } from 'lucide-react';
 import { getSession, logout } from '../services/auth';
import { useState } from 'react';
import { OracleModal } from './OracleModal';

interface ModernTopbarProps {
  onThemeToggle?: () => void;
  isDark?: boolean;
  oracleContext?: string;
  currentPeriod?: 'Dia' | 'Semana' | 'Mês' | 'Ano'
  onPeriodChange?: (p: 'Dia' | 'Semana' | 'Mês' | 'Ano') => void
}

export function ModernTopbar({ onThemeToggle, isDark = true, oracleContext = '', currentPeriod = 'Ano', onPeriodChange }: ModernTopbarProps) {
  const [notifications, setNotifications] = useState(3);
  const [oracleOpen, setOracleOpen] = useState(false);
  const session = getSession()

  return (
    <>
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
          {/* Oráculo de IA */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOracleOpen(true)}
            className="p-3 rounded-xl bg-graphite-900 hover:bg-graphite-800 text-graphite-400 hover:text-white transition-all group"
            aria-label="Abrir Oráculo de IA"
          >
            <Bot className="w-5 h-5" />
          </motion.button>
          

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
           {/* Usuário Logado */}
           {session && (
             <div className="flex items-center gap-3 pl-2 pr-3 py-2 rounded-xl bg-graphite-900 border border-graphite-800">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-[11px] font-bold text-white">
                 {session.email?.[0]?.toUpperCase() || 'U'}
               </div>
               <div className="min-w-0 max-w-[140px]">
                 <p className="text-xs font-semibold text-white truncate">{session.email}</p>
                 <p className="text-[10px] text-graphite-400 truncate">{session.mode==='supabase' ? 'Conta Supabase' : session.mode==='demo' ? 'Modo Demo' : 'Sessão'}</p>
               </div>
               <motion.button whileHover={{ scale:1.1}} whileTap={{scale:0.92}} onClick={()=>{ logout(); window.dispatchEvent(new CustomEvent('logout')) }} className="p-1 rounded-md bg-graphite-800 hover:bg-graphite-700 text-graphite-300 hover:text-white" aria-label="Sair">
                 <LogOut className="w-4 h-4" />
               </motion.button>
             </div>
           )}

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
            {(['Dia','Semana','Mês','Ano'] as const).map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange && onPeriodChange(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentPeriod === period ? 'bg-gold-500 text-white shadow-glow-sm' : 'text-graphite-400 hover:text-white hover:bg-graphite-800'}`}
              >
                {period}
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.header>
    <OracleModal open={oracleOpen} onClose={() => setOracleOpen(false)} contextRules={oracleContext} />
    </>
  );
}
