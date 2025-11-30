import { motion } from 'framer-motion';
import type React from 'react'
import { Search, Bell, Sun, Moon, Menu, Bot } from 'lucide-react';
import { useState } from 'react';
import { OracleModal } from './OracleModal';

interface ModernTopbarProps {
  onThemeToggle?: () => void;
  isDark?: boolean;
  oracleContext?: string;
  currentPeriod?: 'Dia' | 'Semana' | 'Mês' | 'Ano'
  onPeriodChange?: (p: 'Dia' | 'Semana' | 'Mês' | 'Ano') => void
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  selectedCompany?: string;
  onCompanyChange?: (cnpj: string) => void;
  companies?: Array<{ cnpj: string; cliente_nome: string }>;
  extraActions?: React.ReactNode;
}

export function ModernTopbar({ 
  onThemeToggle, 
  isDark = true, 
  oracleContext = '', 
  currentPeriod = 'Ano', 
  onPeriodChange,
  selectedMonth = '2025-11',
  onMonthChange,
  selectedCompany = '26888098000159',
  onCompanyChange,
  companies = [],
  extraActions
}: ModernTopbarProps) {
  const [notifications, setNotifications] = useState(3);
  const [oracleOpen, setOracleOpen] = useState(false);

  const months = [
    { value: '2025-01', label: 'Janeiro 2025' },
    { value: '2025-02', label: 'Fevereiro 2025' },
    { value: '2025-03', label: 'Março 2025' },
    { value: '2025-04', label: 'Abril 2025' },
    { value: '2025-05', label: 'Maio 2025' },
    { value: '2025-06', label: 'Junho 2025' },
    { value: '2025-07', label: 'Julho 2025' },
    { value: '2025-08', label: 'Agosto 2025' },
    { value: '2025-09', label: 'Setembro 2025' },
    { value: '2025-10', label: 'Outubro 2025' },
    { value: '2025-11', label: 'Novembro 2025' },
    { value: '2025-12', label: 'Dezembro 2025' },
  ];

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
          {/* Filtro de Empresa */}
          {companies.length > 0 && (
            <select
              value={selectedCompany}
              onChange={(e) => onCompanyChange?.(e.target.value)}
              className="px-4 py-2 rounded-xl bg-graphite-900 border border-graphite-800 text-white text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all"
            >
              <option value="">Todas as Empresas</option>
              {companies.map((company) => (
                <option key={company.cnpj} value={company.cnpj}>
                  {company.cliente_nome}
                </option>
              ))}
            </select>
          )}

          {/* Filtro de Mês */}
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange?.(e.target.value)}
            className="px-4 py-2 rounded-xl bg-graphite-900 border border-graphite-800 text-white text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

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

          {extraActions}
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
