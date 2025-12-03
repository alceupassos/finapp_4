import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { AnimatedReportCard } from './AnimatedReportCard'

interface ReconciliationSectionProps {
  selectedCompanies: string[]
  selectedYear: string
  selectedMonth?: string
}

type ReconciliationStatus = 'matched' | 'unmatched' | 'divergent' | 'pending'

interface ReconciliationItem {
  id: string
  bankTransaction: {
    date: string
    description: string
    amount: number
    type: 'credit' | 'debit'
  }
  accountingEntry?: {
    date: string
    description: string
    amount: number
  }
  status: ReconciliationStatus
  matchType?: 'auto' | 'manual'
  confidence?: number
  amountDiff?: number
}

export function ReconciliationSection({
  selectedCompanies,
  selectedYear,
  selectedMonth,
}: ReconciliationSectionProps) {
  const [items, setItems] = useState<ReconciliationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<ReconciliationStatus | 'all'>('all')

  useEffect(() => {
    if (selectedCompanies.length === 0) return

    setLoading(true)
    ;(async () => {
      try {
        // Buscar itens de conciliação do Supabase
        // Implementar busca real quando necessário
        setItems([])
      } catch (error) {
        console.error('Erro ao carregar conciliação:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCompanies, selectedYear, selectedMonth])

  // Filtrar itens por status
  const filteredItems = useMemo(() => {
    if (selectedStatus === 'all') return items
    return items.filter((item) => item.status === selectedStatus)
  }, [items, selectedStatus])

  // Calcular KPIs
  const kpis = useMemo(() => {
    const matched = items.filter((i) => i.status === 'matched').length
    const unmatched = items.filter((i) => i.status === 'unmatched').length
    const divergent = items.filter((i) => i.status === 'divergent').length
    const pending = items.filter((i) => i.status === 'pending').length

    const totalAmount = items.reduce(
      (sum, item) => sum + Math.abs(item.bankTransaction.amount),
      0
    )

    const matchedAmount = items
      .filter((i) => i.status === 'matched')
      .reduce((sum, item) => sum + Math.abs(item.bankTransaction.amount), 0)

    const matchRate = items.length > 0 ? (matched / items.length) * 100 : 0

    return {
      total: items.length,
      matched,
      unmatched,
      divergent,
      pending,
      totalAmount,
      matchedAmount,
      matchRate,
    }
  }, [items])

  const statusConfig: Record<ReconciliationStatus, { label: string; icon: any; color: string }> =
    {
      matched: { label: 'Conciliado', icon: CheckCircle2, color: 'text-emerald-400' },
      unmatched: { label: 'Não Conciliado', icon: XCircle, color: 'text-red-400' },
      divergent: { label: 'Divergente', icon: AlertCircle, color: 'text-yellow-400' },
      pending: { label: 'Pendente', icon: Clock, color: 'text-graphite-400' },
    }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <AnimatedReportCard
          title="Total de Itens"
          value={kpis.total}
          format="number"
          trend="neutral"
          delay={0}
        />
        <AnimatedReportCard
          title="Conciliados"
          value={kpis.matched}
          format="number"
          trend="up"
          delay={0.1}
          subtitle={`${kpis.matchRate.toFixed(1)}% de match`}
        />
        <AnimatedReportCard
          title="Pendentes"
          value={kpis.pending}
          format="number"
          trend="neutral"
          delay={0.2}
        />
        <AnimatedReportCard
          title="Valor Total"
          value={kpis.totalAmount}
          format="currency"
          trend="neutral"
          delay={0.3}
        />
      </div>

      {/* Filtros de Status */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedStatus === 'all'
              ? 'bg-gold-500 text-white'
              : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
          }`}
        >
          Todos ({kpis.total})
        </button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon
          const count = kpis[status as keyof typeof kpis] as number
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status as ReconciliationStatus)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedStatus === status
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${config.color}`} />
              {config.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Tabela de Conciliação */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Itens de Conciliação</h3>
        {filteredItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-graphite-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-graphite-400">
                    Data
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-graphite-400">
                    Descrição
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-graphite-400">
                    Valor
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-graphite-400">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-graphite-400">
                    Match
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const statusInfo = statusConfig[item.status]
                  const StatusIcon = statusInfo.icon
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-graphite-800/50 hover:bg-graphite-900/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-graphite-300">
                        {new Date(item.bankTransaction.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-white">
                        {item.bankTransaction.description}
                      </td>
                      <td
                        className={`py-3 px-4 text-sm text-right font-medium ${
                          item.bankTransaction.type === 'credit'
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {item.bankTransaction.type === 'credit' ? '+' : '-'}
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Math.abs(item.bankTransaction.amount))}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                          <span className="text-sm text-graphite-300">{statusInfo.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-graphite-400">
                        {item.matchType === 'auto' && item.confidence
                          ? `${(item.confidence * 100).toFixed(0)}%`
                          : item.matchType === 'manual'
                          ? 'Manual'
                          : '-'}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-graphite-500 text-center py-8">
            {selectedStatus === 'all'
              ? 'Nenhum item de conciliação encontrado'
              : `Nenhum item com status "${statusConfig[selectedStatus as ReconciliationStatus].label}"`}
          </p>
        )}
      </motion.div>

      {loading && (
        <div className="card-premium p-4 text-center">
          <p className="text-sm text-muted-foreground">Carregando conciliação...</p>
        </div>
      )}
    </div>
  )
}

