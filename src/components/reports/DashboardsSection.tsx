import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChartNavigationTabs, type ChartTabId } from '../ChartNavigationTabs'
import { FaturamentoLineChart } from '../charts/FaturamentoLineChart'
import { DonutStatusChart } from '../charts/DonutStatusChart'
import { IndicadoresBarChart } from '../charts/IndicadoresBarChart'
import { ClientesAnaliseChart } from '../charts/ClientesAnaliseChart'
import { ABCParetoChart } from '../charts/ABCParetoChart'

interface DashboardsSectionProps {
  selectedCompanies: string[]
  selectedYear: string
  selectedMonth?: string
}

export function DashboardsSection({
  selectedCompanies,
  selectedYear,
  selectedMonth,
}: DashboardsSectionProps) {
  const [activeTab, setActiveTab] = useState<ChartTabId>('fluxo')

  const cnpjForCharts =
    selectedCompanies.length > 1 ? selectedCompanies : selectedCompanies[0] || ''

  if (selectedCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card-premium p-6">
          <p className="text-graphite-400 text-center">
            Selecione ao menos uma empresa para visualizar os dashboards.
          </p>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'fluxo':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Faturamento</h3>
              <FaturamentoLineChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Status de Pagamentos</h3>
              <DonutStatusChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
            </motion.div>
          </div>
        )
      case 'dre-dfc':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Indicadores DRE</h3>
              <IndicadoresBarChart
                companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Faturamento DFC</h3>
              <FaturamentoLineChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
            </motion.div>
          </div>
        )
      case 'pagar-receber':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Status de Pagamentos</h3>
              <DonutStatusChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Análise de Clientes</h3>
              <ClientesAnaliseChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
            </motion.div>
          </div>
        )
      case 'bancos':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Faturamento</h3>
              <FaturamentoLineChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Status</h3>
              <DonutStatusChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
            </motion.div>
          </div>
        )
      case 'indicadores':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Margem Bruta</h3>
              <IndicadoresBarChart
                companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">EBITDA</h3>
              <IndicadoresBarChart
                companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Análise ABC</h3>
              <ABCParetoChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-premium p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Clientes</h3>
              <ClientesAnaliseChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
            </motion.div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-6"
      >
        <h2 className="text-2xl font-bold mb-4">Dashboards Consolidados</h2>
        <p className="text-graphite-400">
          Visualizações consolidadas de todos os principais indicadores e métricas
        </p>
      </motion.div>

      {/* Navegação por Tabs */}
      <ChartNavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Conteúdo da Tab */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderTabContent()}
      </motion.div>
    </div>
  )
}



