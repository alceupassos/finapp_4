import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SupabaseRest } from '../services/supabaseRest';

interface RevenueSource {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export function RevenueDistributionGauge({ cnpj = '26888098000159', selectedMonth }: { cnpj?: string, selectedMonth?: string }) {
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([
    { name: 'Serviços BPO', value: 580000, color: '#ff7a00', percentage: 45 },
    { name: 'Consultoria', value: 320000, color: '#10b981', percentage: 25 },
    { name: 'Software', value: 250000, color: '#3b82f6', percentage: 20 },
    { name: 'Outros', value: 130000, color: '#8b5cf6', percentage: 10 },
  ]);
  const [mainPercentage, setMainPercentage] = useState(73);
  const [changePercent, setChangePercent] = useState(8.2);

  useEffect(() => {
    loadRevenueData();
  }, [cnpj, selectedMonth]);

  const loadRevenueData = async () => {
    try {
      const dreData = await SupabaseRest.getDRE(cnpj);
      if (!dreData || dreData.length === 0) return;

      // Agrupar receitas por categoria (primeiros dígitos da conta)
      const categoryMap: any = {};
      
      // Parse do ano selecionado
      const [selectedYear] = selectedMonth 
        ? selectedMonth.split('-').map(Number)
        : [new Date().getFullYear()];
      
      const currentYear = selectedYear;
      
      dreData.forEach((item: any) => {
        const itemDate = new Date(item.data);
        if (itemDate.getFullYear() !== currentYear) return;
        
        if (item.natureza === 'receita' && item.valor > 0) {
          const categoryCode = item.conta.split('-')[0].substring(0, 1);
          const categoryName = 
            categoryCode === '3' ? 'Serviços BPO' :
            categoryCode === '4' ? 'Consultoria' :
            categoryCode === '5' ? 'Software' : 'Outros';
          
          if (!categoryMap[categoryName]) categoryMap[categoryName] = 0;
          categoryMap[categoryName] += item.valor;
        }
      });

      const total = Object.values(categoryMap).reduce((sum: any, val: any) => sum + val, 0) as number;
      
      const colors = ['#ff7a00', '#10b981', '#3b82f6', '#8b5cf6'];
      const sources = Object.entries(categoryMap)
        .map(([name, value]: [string, any], idx) => ({
          name,
          value,
          color: colors[idx] || '#8b5cf6',
          percentage: Math.round((value / total) * 100)
        }))
        .sort((a, b) => b.value - a.value);

      if (sources.length > 0) {
        setRevenueSources(sources);
        const targetValue = 800000;
        const achieved = Math.round((total / targetValue) * 100);
        setMainPercentage(Math.min(achieved, 100));
      }
    } catch (error) {
      console.error('Erro ao carregar dados de receita:', error);
    }
  };

  const total = revenueSources.reduce((sum, source) => sum + source.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="neomorphic neomorphic-hover rounded-3xl p-8 border border-graphite-800/30"
    >
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white mb-1">Distribuição de Receita</h3>
        <p className="text-sm text-graphite-400">Por categoria de serviço</p>
      </div>

      {/* Gauge */}
      <div className="relative flex items-center justify-center mb-8">
        <svg width="280" height="180" viewBox="0 0 280 180" className="transform -rotate-0">
          {/* Background Arc */}
          <path
            d="M 40 140 A 100 100 0 0 1 240 140"
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="24"
            strokeLinecap="round"
          />

          {/* Animated Progress Arc */}
          <motion.path
            d="M 40 140 A 100 100 0 0 1 240 140"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="24"
            strokeLinecap="round"
            strokeDasharray="314"
            initial={{ strokeDashoffset: 314 }}
            animate={{ strokeDashoffset: 314 - (314 * mainPercentage) / 100 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#ff7a00" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Value */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
          >
            <p className="text-4xl font-bold text-white font-display mb-1">
              {mainPercentage}%
            </p>
            <p className="text-xs text-graphite-400">Meta Atingida</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">+{changePercent.toFixed(1)}%</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Revenue Sources */}
      <div className="space-y-3">
        {revenueSources.map((source, index) => (
          <motion.div
            key={source.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 + index * 0.1 }}
            className="group/item"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: source.color }}
                />
                <span className="text-sm text-graphite-300 group-hover/item:text-white transition-colors">
                  {source.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-white">
                  {source.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-graphite-400 ml-2">({source.percentage}%)</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-graphite-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${source.percentage}%` }}
                transition={{ delay: 1 + index * 0.1, duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full relative"
                style={{ backgroundColor: source.color }}
              >
                <motion.div
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: 1.5 + index * 0.1,
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Total */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-6 pt-6 border-t border-graphite-800 flex items-center justify-between"
      >
        <span className="text-sm font-semibold text-graphite-400">Total de Receita</span>
        <span className="text-lg font-bold text-gold-400">
          {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
        </span>
      </motion.div>
    </motion.div>
  );
}
