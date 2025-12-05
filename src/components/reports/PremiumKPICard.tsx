import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { formatCurrency, formatPercentage } from '../../lib/formatters'
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import * as Tooltip from '@radix-ui/react-tooltip'

interface PremiumKPICardProps {
  title: string
  value: number
  format?: 'currency' | 'number' | 'percentage'
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number // Variação percentual
  trendPeriod?: string // Ex: "vs mês anterior", "vs ano anterior"
  sparklineData?: number[] // Array de valores para o sparkline
  delay?: number
  subtitle?: string
  onShowMore?: () => void
  tooltipContent?: string
}

export function PremiumKPICard({
  title,
  value,
  format = 'currency',
  trend = 'neutral',
  trendValue,
  trendPeriod = 'vs período anterior',
  sparklineData = [],
  delay = 0,
  subtitle,
  onShowMore,
  tooltipContent,
}: PremiumKPICardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percentage':
        return formatPercentage(val)
      default:
        return val.toLocaleString('pt-BR')
    }
  }

  const trendColor =
    trend === 'up'
      ? 'text-emerald-400'
      : trend === 'down'
      ? 'text-red-400'
      : 'text-graphite-400'

  const trendBgColor =
    trend === 'up'
      ? 'bg-emerald-400/10 border-emerald-400/20'
      : trend === 'down'
      ? 'bg-red-400/10 border-red-400/20'
      : 'bg-graphite-400/10 border-graphite-400/20'

  // Preparar dados para sparkline
  const chartData = sparklineData.map((val, idx) => ({
    value: val,
    index: idx,
  }))

  // Cor da linha do sparkline baseado na tendência
  const sparklineColor =
    trend === 'up'
      ? '#34d399' // emerald-400
      : trend === 'down'
      ? '#f87171' // red-400
      : '#9ca3af' // graphite-400

  const CardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="card-premium p-6 relative overflow-hidden group"
      onClick={(e) => {
        // Não fazer nada no click do card inteiro - apenas o botão "Ver mais" deve abrir o modal
        e.stopPropagation()
      }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-graphite-400 mb-1">{title}</h4>
            {subtitle && (
              <p className="text-xs text-graphite-500">{subtitle}</p>
            )}
          </div>
          {trendValue !== undefined && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.2 }}
              className={`px-2 py-1 rounded-md border ${trendBgColor} flex items-center gap-1`}
            >
              {trend === 'up' ? (
                <TrendingUp className={`w-3 h-3 ${trendColor}`} />
              ) : trend === 'down' ? (
                <TrendingDown className={`w-3 h-3 ${trendColor}`} />
              ) : null}
              <span className={`text-xs font-semibold ${trendColor}`}>
                {trend !== 'neutral' && trendValue !== undefined
                  ? `${trend === 'up' ? '+' : ''}${formatPercentage(trendValue, 1)}`
                  : '—'}
              </span>
            </motion.div>
          )}
        </div>

        {/* Value */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.1 }}
          className="text-3xl font-bold text-white mb-4"
        >
          {formatValue(value)}
        </motion.div>

        {/* Sparkline */}
        {sparklineData.length > 0 && (
          <div className="h-12 mb-3 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-graphite-900 border border-graphite-700 rounded px-2 py-1 text-xs text-white shadow-lg">
                          {formatValue(payload[0].value as number)}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: sparklineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trend info and Show more */}
        <div className="flex items-center justify-between mt-2">
          {trendValue !== undefined && trendPeriod && (
            <span className="text-xs text-graphite-500">
              {trendPeriod}
            </span>
          )}
          {onShowMore && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('🔍 PremiumKPICard - Botão "Ver mais" clicado')
                onShowMore()
              }}
              className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 group/showmore transition-colors cursor-pointer"
              type="button"
            >
              Ver mais
              <ArrowRight className="w-3 h-3 group-hover/showmore:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

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

  // Se tiver tooltip, envolver com Tooltip
  if (tooltipContent) {
    return (
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{CardContent}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-graphite-900 border border-graphite-700 rounded-lg px-3 py-2 text-xs text-white shadow-xl z-50 max-w-xs"
              sideOffset={5}
            >
              {tooltipContent}
              <Tooltip.Arrow className="fill-graphite-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    )
  }

  return CardContent
}

