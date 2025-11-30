/**
 * FinancialKPICards - 5 Cards KPI
 * 
 * Cards com indicadores financeiros principais
 * - Receita Bruta
 * - Impostos  
 * - Lucro Bruto
 * - EBITDA
 * - Lucro Líquido
 */

import React from 'react';
import { TrendingUp, TrendingDown, Receipt, Percent, DollarSign, BarChart3, Wallet } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface KPIData {
  receitaBruta: number;
  impostos: number;
  lucroBruto: number;
  ebitda: number;
  lucroLiquido: number;
  variacaoReceitaBruta?: number;
  variacaoImpostos?: number;
  variacaoLucroBruto?: number;
  variacaoEbitda?: number;
  variacaoLucroLiquido?: number;
}

interface FinancialKPICardsProps {
  data: KPIData;
  className?: string;
}

interface SingleCardProps {
  title: string;
  value: number;
  variacao?: number;
  icon: React.ReactNode;
  colorScheme: 'green' | 'red' | 'blue' | 'amber' | 'auto';
  delay?: number;
}

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1_000_000_000) {
    return `${sign}R$ ${(abs / 1_000_000_000).toFixed(2).replace('.', ',')} B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(2).replace('.', ',')} M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toFixed(0)} K`;
  }
  
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}%`;
};

// ============================================================
// SINGLE CARD COMPONENT
// ============================================================

const KPICard: React.FC<SingleCardProps> = ({
  title,
  value,
  variacao = 0,
  icon,
  colorScheme,
  delay = 0
}) => {
  const isPositive = value >= 0;
  const isVariacaoPositive = variacao >= 0;
  
  // Determine color based on scheme
  const getColors = () => {
    if (colorScheme === 'auto') {
      return isPositive 
        ? { bg: 'from-emerald-900/40 to-emerald-950/60', border: 'border-emerald-700/30', text: 'text-emerald-400', icon: 'text-emerald-500' }
        : { bg: 'from-red-900/40 to-red-950/60', border: 'border-red-700/30', text: 'text-red-400', icon: 'text-red-500' };
    }
    
    const colorMap = {
      green: { bg: 'from-emerald-900/40 to-emerald-950/60', border: 'border-emerald-700/30', text: 'text-emerald-400', icon: 'text-emerald-500' },
      red: { bg: 'from-red-900/40 to-red-950/60', border: 'border-red-700/30', text: 'text-red-400', icon: 'text-red-500' },
      blue: { bg: 'from-blue-900/40 to-blue-950/60', border: 'border-blue-700/30', text: 'text-blue-400', icon: 'text-blue-500' },
      amber: { bg: 'from-amber-900/40 to-amber-950/60', border: 'border-amber-700/30', text: 'text-amber-400', icon: 'text-amber-500' }
    };
    
    return colorMap[colorScheme];
  };
  
  const colors = getColors();

  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl border ${colors.border}
        bg-gradient-to-br ${colors.bg} backdrop-blur-sm
        p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
      `}
      style={{ 
        animationDelay: `${delay}ms`,
        animation: 'fadeInUp 0.5s ease-out forwards'
      }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-1.5 rounded-lg bg-black/20 ${colors.icon}`}>
          {icon}
        </div>
      </div>
      
      {/* Value */}
      <div className={`text-xl font-bold ${colors.text} mb-2`}>
        {formatCurrency(value)}
      </div>
      
      {/* Variation */}
      <div className="flex items-center gap-1.5">
        {isVariacaoPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-400" />
        )}
        <span className={`text-xs font-medium ${isVariacaoPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatPercent(variacao)}
        </span>
        <span className="text-xs text-gray-500">vs mês anterior</span>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const FinancialKPICards: React.FC<FinancialKPICardsProps> = ({
  data,
  className = ''
}) => {
  return (
    <>
      {/* CSS Animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
        <KPICard
          title="Receita Bruta"
          value={data.receitaBruta}
          variacao={data.variacaoReceitaBruta || 12}
          icon={<Receipt className="w-4 h-4" />}
          colorScheme="green"
          delay={0}
        />
        
        <KPICard
          title="Impostos"
          value={data.impostos}
          variacao={data.variacaoImpostos || -5}
          icon={<Percent className="w-4 h-4" />}
          colorScheme="red"
          delay={100}
        />
        
        <KPICard
          title="Lucro Bruto"
          value={data.lucroBruto}
          variacao={data.variacaoLucroBruto || 15}
          icon={<DollarSign className="w-4 h-4" />}
          colorScheme="auto"
          delay={200}
        />
        
        <KPICard
          title="EBITDA"
          value={data.ebitda}
          variacao={data.variacaoEbitda || 18}
          icon={<BarChart3 className="w-4 h-4" />}
          colorScheme="blue"
          delay={300}
        />
        
        <KPICard
          title="Lucro Líquido"
          value={data.lucroLiquido}
          variacao={data.variacaoLucroLiquido || 20}
          icon={<Wallet className="w-4 h-4" />}
          colorScheme="auto"
          delay={400}
        />
      </div>
    </>
  );
};

export default FinancialKPICards;
