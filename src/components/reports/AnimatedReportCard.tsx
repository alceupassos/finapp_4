import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatNumber, formatPercentage } from '../../lib/formatters'

interface AnimatedReportCardProps {
  title: string
  value: number
  format?: 'currency' | 'number' | 'percentage'
  trend?: 'up' | 'down' | 'neutral'
  delay?: number
  subtitle?: string
}

export function AnimatedReportCard({
  title,
  value,
  format = 'currency',
  trend = 'neutral',
  delay = 0,
  subtitle,
}: AnimatedReportCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percentage':
        return formatPercentage(val)
      default:
        return formatNumber(val)
    }
  }

  const trendColor =
    trend === 'up'
      ? 'text-emerald-400'
      : trend === 'down'
      ? 'text-red-400'
      : 'text-graphite-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="card-premium p-6 relative overflow-hidden group"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-graphite-400">{title}</h4>
          {trend !== 'neutral' && (
            <motion.div
              animate={{ rotate: trend === 'up' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {trend === 'up' ? (
                <TrendingUp className={`w-4 h-4 ${trendColor}`} />
              ) : (
                <TrendingDown className={`w-4 h-4 ${trendColor}`} />
              )}
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.1 }}
          className="text-2xl font-bold text-white mb-1"
        >
          {formatValue(value)}
        </motion.div>

        {subtitle && (
          <p className="text-xs text-graphite-500">{subtitle}</p>
        )}

        {/* Animated border */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-500 to-gold-600"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.2 }}
        />
      </div>
    </motion.div>
  )
}

