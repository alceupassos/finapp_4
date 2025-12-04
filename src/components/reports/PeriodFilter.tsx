import { motion } from 'framer-motion'
import { Calendar, X } from 'lucide-react'
import { useState } from 'react'

export type PeriodMode = 'D' | 'M' | 'Y' | 'All' | 'Custom'

interface PeriodFilterProps {
  mode: PeriodMode
  onModeChange: (mode: PeriodMode) => void
  onCustomRangeSelect?: (start: Date, end: Date) => void
  customStart?: Date
  customEnd?: Date
  className?: string
}

export function PeriodFilter({
  mode,
  onModeChange,
  onCustomRangeSelect,
  customStart,
  customEnd,
  className = '',
}: PeriodFilterProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const modes: Array<{ value: PeriodMode; label: string; title: string }> = [
    { value: 'D', label: 'D', title: 'Dia (últimos 30 dias)' },
    { value: 'M', label: 'M', title: 'Mês (mês atual)' },
    { value: 'Y', label: 'Y', title: 'Ano (ano atual)' },
    { value: 'All', label: 'All', title: 'Todos os dados' },
    { value: 'Custom', label: 'Custom', title: 'Período personalizado' },
  ]

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    if (!onCustomRangeSelect) return
    
    const date = new Date(value)
    if (type === 'start') {
      const end = customEnd || new Date()
      onCustomRangeSelect(date, end)
    } else {
      const start = customStart || new Date(new Date().setFullYear(new Date().getFullYear() - 1))
      onCustomRangeSelect(start, date)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Toggle buttons */}
      <div className="flex items-center gap-1 bg-graphite-900/50 rounded-lg p-1 border border-graphite-800">
        {modes.map((m) => (
          <motion.button
            key={m.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (m.value === 'Custom') {
                setShowCustomPicker(!showCustomPicker)
              } else {
                setShowCustomPicker(false)
                onModeChange(m.value)
              }
            }}
            title={m.title}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
              ${
                mode === m.value
                  ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20'
                  : 'text-graphite-400 hover:text-white hover:bg-graphite-800'
              }
            `}
          >
            {m.label}
          </motion.button>
        ))}
      </div>

      {/* Custom date picker */}
      {showCustomPicker && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 bg-graphite-900/95 backdrop-blur-sm border border-graphite-700 rounded-lg px-3 py-2 shadow-xl"
        >
          <Calendar className="w-4 h-4 text-gold-400" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart ? customStart.toISOString().split('T')[0] : ''}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              className="px-2 py-1 text-xs bg-graphite-800 border border-graphite-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              title="Data inicial"
            />
            <span className="text-graphite-500 text-xs">até</span>
            <input
              type="date"
              value={customEnd ? customEnd.toISOString().split('T')[0] : ''}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              className="px-2 py-1 text-xs bg-graphite-800 border border-graphite-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              title="Data final"
            />
          </div>
          <button
            onClick={() => {
              setShowCustomPicker(false)
              if (mode !== 'Custom') {
                onModeChange('M') // Voltar para Mês se não estava em Custom
              }
            }}
            className="p-1 hover:bg-graphite-800 rounded transition-colors"
            title="Fechar"
          >
            <X className="w-3 h-3 text-graphite-400" />
          </button>
        </motion.div>
      )}

      {/* Active period display */}
      {mode === 'Custom' && customStart && customEnd && (
        <div className="text-xs text-graphite-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>
            {customStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} -{' '}
            {customEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  )
}

