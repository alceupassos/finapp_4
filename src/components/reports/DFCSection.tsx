import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SupabaseRest } from '../../services/supabaseRest'
import { DFCPivotTable } from '../DFCPivotTable'
import { DFCExportButton } from '../DFCExportButton'
import { AnimatedReportCard } from './AnimatedReportCard'
import { CashflowSankeyChart } from '../charts/CashflowSankeyChart'
import { FluxoCaixaBarChart, FluxoCaixaLineChart, WaterfallChart } from '../charts'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedCompanies.length === 0) return

    setLoading(true)
    ;(async () => {
      try {
        // Buscar dados DFC do Supabase
        // Nota: Implementar método getDFC no SupabaseRest se necessário
        const cnpj = selectedCompanies[0]
        // Por enquanto, usar dados mockados ou implementar busca real
        setDfcData([])
      } catch (error) {
        console.error('Erro ao carregar DFC:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCompanies, selectedYear, selectedMonth])

  // Calcular KPIs DFC
  const kpis = useMemo(() => {
    const entradas = dfcData
      .filter((d) => d.kind === 'in')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0)

    const saidas = dfcData
      .filter((d) => d.kind === 'out')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0)

    const saldo = entradas - saidas

    return {
      entradas,
      saidas,
      saldo,
    }
  }, [dfcData])

  const cnpjForCharts =
    selectedCompanies.length > 1 ? selectedCompanies : selectedCompanies[0] || ''

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatedReportCard
          title="Entradas"
          value={kpis.entradas}
          format="currency"
          trend="up"
          delay={0}
        />
        <AnimatedReportCard
          title="Saídas"
          value={kpis.saidas}
          format="currency"
          trend="down"
          delay={0.1}
        />
        <AnimatedReportCard
          title="Saldo Líquido"
          value={kpis.saldo}
          format="currency"
          trend={kpis.saldo >= 0 ? 'up' : 'down'}
          delay={0.2}
        />
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
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
    </div>
  )
}

