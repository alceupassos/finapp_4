import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SupabaseRest } from '../../services/supabaseRest'
import { DFCPivotTable } from '../DFCPivotTable'
import { DFCExportButton } from '../DFCExportButton'
import { AnimatedReportCard } from './AnimatedReportCard'
import { PremiumKPICard } from './PremiumKPICard'
import { PeriodFilter, type PeriodMode } from './PeriodFilter'
import { CashflowSankeyChart } from '../charts/CashflowSankeyChart'
import { FluxoCaixaBarChart, FluxoCaixaLineChart, WaterfallChart } from '../charts'
import { DFCFullModal } from './DFCFullModal'

interface DFCSectionProps {
  selectedCompanies: string[]
  selectedYear: string
  selectedMonth?: string
  period: 'Ano' | 'Mês'
}

export function DFCSection({
  selectedCompanies,
  selectedYear,
  selectedMonth,
  period,
}: DFCSectionProps) {
  const [dfcData, setDfcData] = useState<any[]>([])
  const [dfcDataPreviousYear, setDfcDataPreviousYear] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [compareWithPreviousYear, setCompareWithPreviousYear] = useState(false)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('Y')

  useEffect(() => {
    if (selectedCompanies.length === 0) {
      setDfcData([])
      setDfcDataPreviousYear([])
      setLoading(false)
      return
    }

    setLoading(true)
    ;(async () => {
      try {
        const year = parseInt(selectedYear) || new Date().getFullYear()
        const month = selectedMonth ? parseInt(selectedMonth.split('-')[1]) : undefined
        const previousYear = year - 1
        
        // Buscar DFC do ano atual
        let currentYearData: any[] = []
        if (selectedCompanies.length > 1) {
          const allDfcPromises = selectedCompanies.map((cnpj) =>
            SupabaseRest.getDFC(cnpj, year, month)
          )
          const allDfcResults = await Promise.all(allDfcPromises)
          
          const dfcMap = new Map<string, any>()
          allDfcResults.forEach((dfcArray: any[]) => {
            if (Array.isArray(dfcArray)) {
              dfcArray.forEach((item: any) => {
                const key = `${item.data || ''}_${item.descricao || ''}_${item.kind || ''}`
                const existing = dfcMap.get(key)
                if (existing) {
                  existing.entrada = (existing.entrada || 0) + Number(item.entrada || 0)
                  existing.saida = (existing.saida || 0) + Number(item.saida || 0)
                } else {
                  dfcMap.set(key, {
                    data: item.data,
                    entrada: Number(item.entrada || 0),
                    saida: Number(item.saida || 0),
                    descricao: item.descricao,
                    kind: item.kind || (item.entrada > 0 ? 'in' : 'out'),
                  })
                }
              })
            }
          })
          currentYearData = Array.from(dfcMap.values())
        } else {
          const dfc = await SupabaseRest.getDFC(selectedCompanies[0], year, month)
          currentYearData = Array.isArray(dfc) ? dfc : []
        }
        setDfcData(currentYearData)

        // Buscar dados do ano anterior se comparar estiver ativado
        if (compareWithPreviousYear) {
          let previousYearData: any[] = []
          if (selectedCompanies.length > 1) {
            const allDfcPromisesPrev = selectedCompanies.map((cnpj) =>
              SupabaseRest.getDFC(cnpj, previousYear, month)
            )
            const allDfcResultsPrev = await Promise.all(allDfcPromisesPrev)
            
            const dfcMapPrev = new Map<string, any>()
            allDfcResultsPrev.forEach((dfcArray: any[]) => {
              if (Array.isArray(dfcArray)) {
                dfcArray.forEach((item: any) => {
                  const key = `${item.data || ''}_${item.descricao || ''}_${item.kind || ''}`
                  const existing = dfcMapPrev.get(key)
                  if (existing) {
                    existing.entrada = (existing.entrada || 0) + Number(item.entrada || 0)
                    existing.saida = (existing.saida || 0) + Number(item.saida || 0)
                  } else {
                    dfcMapPrev.set(key, {
                      data: item.data,
                      entrada: Number(item.entrada || 0),
                      saida: Number(item.saida || 0),
                      descricao: item.descricao,
                      kind: item.kind || (item.entrada > 0 ? 'in' : 'out'),
                    })
                  }
                })
              }
            })
            previousYearData = Array.from(dfcMapPrev.values())
          } else {
            const dfcPrev = await SupabaseRest.getDFC(selectedCompanies[0], previousYear, month)
            previousYearData = Array.isArray(dfcPrev) ? dfcPrev : []
          }
          setDfcDataPreviousYear(previousYearData)
        } else {
          setDfcDataPreviousYear([])
        }
      } catch (error) {
        console.error('Erro ao carregar DFC:', error)
        setDfcData([])
        setDfcDataPreviousYear([])
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCompanies, selectedYear, selectedMonth, compareWithPreviousYear])

  // Calcular KPIs DFC
  const kpis = useMemo(() => {
    const entradas = dfcData
      .filter((d) => d.kind === 'in')
      .reduce((sum, d) => sum + Number(d.amount || d.entrada || 0), 0)

    const saidas = dfcData
      .filter((d) => d.kind === 'out')
      .reduce((sum, d) => sum + Number(d.amount || d.saida || 0), 0)

    const saldo = entradas - saidas

    return {
      entradas,
      saidas,
      saldo,
    }
  }, [dfcData])

  // Calcular KPIs do ano anterior para comparação
  const kpisPreviousYear = useMemo(() => {
    if (!compareWithPreviousYear || dfcDataPreviousYear.length === 0) return null

    const entradas = dfcDataPreviousYear
      .filter((d) => d.kind === 'in')
      .reduce((sum, d) => sum + Number(d.amount || d.entrada || 0), 0)

    const saidas = dfcDataPreviousYear
      .filter((d) => d.kind === 'out')
      .reduce((sum, d) => sum + Number(d.amount || d.saida || 0), 0)

    const saldo = entradas - saidas

    return { entradas, saidas, saldo }
  }, [dfcDataPreviousYear, compareWithPreviousYear])

  // Calcular variação percentual
  const calculateVariation = (current: number, previous: number | null) => {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  // Gerar sparkline data (simplificado - últimos 12 meses)
  const getSparklineData = (kpiName: string) => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthData = dfcData.filter((item: any) => {
        if (!item.data) return false
        const date = new Date(item.data)
        return date.getMonth() === i
      })
      if (kpiName === 'entradas') {
        return monthData.filter((d: any) => d.kind === 'in').reduce((sum: number, d: any) => sum + Number(d.amount || d.entrada || 0), 0)
      }
      if (kpiName === 'saidas') {
        return monthData.filter((d: any) => d.kind === 'out').reduce((sum: number, d: any) => sum + Number(d.amount || d.saida || 0), 0)
      }
      if (kpiName === 'saldo') {
        const entradas = monthData.filter((d: any) => d.kind === 'in').reduce((sum: number, d: any) => sum + Number(d.amount || d.entrada || 0), 0)
        const saidas = monthData.filter((d: any) => d.kind === 'out').reduce((sum: number, d: any) => sum + Number(d.amount || d.saida || 0), 0)
        return entradas - saidas
      }
      return 0
    })
    return months
  }

  const cnpjForCharts =
    selectedCompanies.length > 1 ? selectedCompanies : selectedCompanies[0] || ''

  return (
    <div className="space-y-6">
      {/* Filtros e Controles */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PeriodFilter
          mode={periodMode}
          onModeChange={setPeriodMode}
          className="flex-1 min-w-[300px]"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={compareWithPreviousYear}
            onChange={(e) => setCompareWithPreviousYear(e.target.checked)}
            className="w-4 h-4 rounded border-graphite-700 bg-graphite-800 text-gold-500 focus:ring-gold-500 focus:ring-2"
          />
          <span className="text-sm text-graphite-300">
            Comparar com {parseInt(selectedYear) - 1}
          </span>
        </label>
      </div>

      {/* KPI Cards Premium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PremiumKPICard
          title="Entradas"
          value={kpis.entradas}
          format="currency"
          trend={
            kpisPreviousYear
              ? (kpis.entradas >= kpisPreviousYear.entradas ? 'up' : 'down')
              : 'up'
          }
          trendValue={kpisPreviousYear ? calculateVariation(kpis.entradas, kpisPreviousYear.entradas) : undefined}
          trendPeriod={compareWithPreviousYear ? `vs ${parseInt(selectedYear) - 1}` : undefined}
          sparklineData={getSparklineData('entradas')}
          delay={0}
          onShowMore={() => setModalOpen(true)}
        />
        <PremiumKPICard
          title="Saídas"
          value={kpis.saidas}
          format="currency"
          trend={
            kpisPreviousYear
              ? (kpis.saidas <= kpisPreviousYear.saidas ? 'up' : 'down')
              : 'down'
          }
          trendValue={kpisPreviousYear ? calculateVariation(kpis.saidas, kpisPreviousYear.saidas) : undefined}
          trendPeriod={compareWithPreviousYear ? `vs ${parseInt(selectedYear) - 1}` : undefined}
          sparklineData={getSparklineData('saidas')}
          delay={0.1}
          onShowMore={() => setModalOpen(true)}
        />
        <PremiumKPICard
          title="Saldo Líquido"
          value={kpis.saldo}
          format="currency"
          trend={
            kpisPreviousYear
              ? (kpis.saldo >= kpisPreviousYear.saldo ? 'up' : 'down')
              : (kpis.saldo >= 0 ? 'up' : 'down')
          }
          trendValue={kpisPreviousYear ? calculateVariation(kpis.saldo, kpisPreviousYear.saldo) : undefined}
          trendPeriod={compareWithPreviousYear ? `vs ${parseInt(selectedYear) - 1}` : undefined}
          sparklineData={getSparklineData('saldo')}
          delay={0.2}
          onShowMore={() => setModalOpen(true)}
        />
      </div>

      {/* Export Button e Modal */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-gold-500/20 flex items-center gap-2"
        >
          Ver Completo
        </button>
        <DFCExportButton
          selectedCompanies={selectedCompanies}
          selectedMonth={selectedMonth || ''}
          period={period}
        />
      </div>

      {/* Sankey Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa - Sankey</h3>
        <CashflowSankeyChart dfcData={dfcData} />
      </motion.div>

      {/* Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa - Barras</h3>
        <FluxoCaixaBarChart cnpj={cnpjForCharts} year={parseInt(selectedYear)} />
      </motion.div>

      {/* Line Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa - Linha</h3>
        <FluxoCaixaLineChart cnpj={cnpjForCharts} year={parseInt(selectedYear)} />
      </motion.div>

      {/* Waterfall Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa - Waterfall</h3>
        <WaterfallChart cnpj={cnpjForCharts} year={parseInt(selectedYear)} />
      </motion.div>

      {/* Pivot Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">DFC Detalhada</h3>
        <DFCPivotTable cnpj={cnpjForCharts} period={period} />
      </motion.div>

      {loading && (
        <div className="card-premium p-4 text-center">
          <p className="text-sm text-muted-foreground">Carregando dados DFC...</p>
        </div>
      )}

      {!loading && dfcData.length === 0 && selectedCompanies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-premium p-8 text-center"
        >
          <p className="text-graphite-400 mb-2">Nenhum dado DFC encontrado</p>
          <p className="text-sm text-graphite-500">
            Importe dados do Excel ou API F360 para visualizar o fluxo de caixa
          </p>
        </motion.div>
      )}

      {!loading && selectedCompanies.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-premium p-8 text-center"
        >
          <p className="text-graphite-400">Selecione pelo menos uma empresa para visualizar os dados DFC</p>
        </motion.div>
      )}

      {/* Modal Completo */}
      <DFCFullModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        dfcData={dfcData}
        selectedCompanies={selectedCompanies}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />
    </div>
  )
}

