import { useState } from 'react'
import { motion } from 'framer-motion'
import { IndicadoresBarChart } from '../charts/IndicadoresBarChart'
import { DonutStatusChart } from '../charts/DonutStatusChart'
import { PremiumKPICard } from './PremiumKPICard'

interface IndicadoresSectionProps {
  selectedCompanies: string[]
  selectedYear: string
  selectedMonth?: string
}

export function IndicadoresSection({
  selectedCompanies,
  selectedYear,
  selectedMonth,
}: IndicadoresSectionProps) {
  const [indicadorSelecionado, setIndicadorSelecionado] = useState<
    'margem-bruta' | 'ebitda' | 'margem-liquida'
  >('margem-bruta')

  const cnpjForCharts =
    selectedCompanies.length > 1 ? selectedCompanies : selectedCompanies[0] || ''

  // TODO: Buscar dados reais de indicadores do Supabase
  const mockKPIs = {
    margemBruta: 85.5,
    ebitda: 72.3,
    margemLiquida: 68.1,
    roe: 15.2,
    roa: 8.5,
  }

  if (selectedCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card-premium p-6">
          <p className="text-graphite-400 text-center">
            Selecione ao menos uma empresa para visualizar os indicadores.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold">Indicadores Financeiros</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIndicadorSelecionado('margem-bruta')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                indicadorSelecionado === 'margem-bruta'
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              Margem Bruta
            </button>
            <button
              onClick={() => setIndicadorSelecionado('ebitda')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                indicadorSelecionado === 'ebitda'
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              EBITDA
            </button>
            <button
              onClick={() => setIndicadorSelecionado('margem-liquida')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                indicadorSelecionado === 'margem-liquida'
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              Margem Líquida
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <PremiumKPICard
          title="Margem Bruta"
          value={mockKPIs.margemBruta}
          format="percentage"
          trend="up"
          delay={0}
        />
        <PremiumKPICard
          title="EBITDA"
          value={mockKPIs.ebitda}
          format="percentage"
          trend="up"
          delay={0.1}
        />
        <PremiumKPICard
          title="Margem Líquida"
          value={mockKPIs.margemLiquida}
          format="percentage"
          trend="up"
          delay={0.2}
        />
        <PremiumKPICard
          title="ROE"
          value={mockKPIs.roe}
          format="percentage"
          trend="up"
          delay={0.3}
        />
      </div>

      {/* Gráfico de Indicadores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Evolução de Indicadores</h3>
        <IndicadoresBarChart
          companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts}
        />
      </motion.div>

      {/* Gráfico Donut Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Status de Pagamentos</h3>
        <DonutStatusChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
      </motion.div>
    </div>
  )
}



