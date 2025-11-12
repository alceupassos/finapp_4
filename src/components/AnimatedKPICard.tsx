import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AnimatedKPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: string;
  trend?: 'up' | 'down';
  color?: 'green' | 'red' | 'gold' | 'blue';
  delay?: number;
  progress?: number;
  sparklineData?: number[];
}

const colorClasses = {
  green: {
    bg: 'from-emerald-500/20 to-emerald-600/10',
    icon: 'bg-emerald-500/20 text-emerald-400',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  red: {
    bg: 'from-red-500/20 to-red-600/10',
    icon: 'bg-red-500/20 text-red-400',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
  gold: {
    bg: 'from-gold-500/20 to-gold-600/10',
    icon: 'bg-gold-500/20 text-gold-400',
    text: 'text-gold-400',
    border: 'border-gold-500/20',
  },
  blue: {
    bg: 'from-blue-500/20 to-blue-600/10',
    icon: 'bg-blue-500/20 text-blue-400',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
};

const iconMap = {
  'TrendingUp': TrendingUp,
  'TrendingDown': TrendingDown,
  'Wallet': Wallet,
  'Target': Target,
};

export function AnimatedKPICard({
  title,
  value,
  change,
  icon,
  trend = 'up',
  color = 'gold',
  delay = 0,
  progress,
  sparklineData,
}: AnimatedKPICardProps) {
  const colors = colorClasses[color];
  const isPositive = trend === 'up';
  const IconComponent = iconMap[icon as keyof typeof iconMap] || TrendingUp;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative"
    >
      {/* Glow Effect */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${colors.bg} rounded-3xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`}
      />

      {/* Card */}
      <div className="relative neomorphic neomorphic-hover rounded-3xl p-6 border border-graphite-800/30">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-graphite-400 font-medium mb-2">{title}</p>
            <motion.h3
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.2 }}
              className="text-3xl font-bold text-white font-display"
            >
              {value}
            </motion.h3>
          </div>

          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className={`p-3 rounded-2xl bg-gradient-to-br ${colors.bg} border ${colors.border}`}
          >
            <IconComponent className="w-6 h-6 text-current" style={{ color: colors.icon.split(' ')[1].replace('text-', '') }} />
          </motion.div>
        </div>

        {/* Change Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}
          >
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {change}%
            </span>
          </motion.div>
          <span className="text-sm text-graphite-400">vs mês anterior</span>
        </div>

        {/* Sparkline */}
        {sparklineData && (
          <div className="flex items-end gap-1 h-12 mt-4">
            {sparklineData.map((value, index) => {
              const maxValue = Math.max(...sparklineData);
              const heightPercent = (value / maxValue) * 100;
              return (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ delay: delay + 0.5 + index * 0.02, duration: 0.3 }}
                  className={`flex-1 bg-gradient-to-t ${colors.bg} rounded-sm opacity-70 hover:opacity-100 transition-opacity`}
                />
              );
            })}
          </div>
        )}

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-graphite-400 mb-2">
              <span>Progresso</span>
              <span className={colors.text}>{progress}%</span>
            </div>
            <div className="h-2 bg-graphite-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: delay + 0.7, duration: 0.8, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${colors.bg} relative overflow-hidden`}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
