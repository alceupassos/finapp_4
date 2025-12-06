import { useState } from 'react'
import { motion } from 'framer-motion'
import { ClientesAnaliseChart } from '../charts/ClientesAnaliseChart'
import { ABCParetoChart } from '../charts/ABCParetoChart'
import { HorizontalBarChart } from '../charts/HorizontalBarChart'

interface ClientesSectionProps {
  selectedCompanies: string[]
  selectedYear: string
  selectedMonth?: string
}

export function ClientesSection({
  selectedCompanies,
  selectedYear,
  selectedMonth,
}: ClientesSectionProps) {
  const [analiseTipo, setAnaliseTipo] = useState<'valor' | 'quantidade' | 'ticket-medio'>('valor')

  const cnpjForCharts =
    selectedCompanies.length > 1 ? selectedCompanies : selectedCompanies[0] || ''

  // TODO: Buscar dados reais de clientes do Supabase
  const mockClientesData = [
    { name: 'Cliente A', value: 359000 },
    { name: 'Cliente B', value: 179000 },
    { name: 'Cliente C', value: 179000 },
    { name: 'Cliente D', value: 150000 },
    { name: 'Cliente E', value: 120000 },
    { name: 'Cliente F', value: 95000 },
    { name: 'Cliente G', value: 80000 },
    { name: 'Cliente H', value: 65000 },
  ]

  if (selectedCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card-premium p-6">
          <p className="text-graphite-400 text-center">
            Selecione ao menos uma empresa para visualizar a análise de clientes.
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
          <h2 className="text-2xl font-bold">Análise de Clientes</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setAnaliseTipo('valor')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                analiseTipo === 'valor'
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              Valor
            </button>
            <button
              onClick={() => setAnaliseTipo('quantidade')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                analiseTipo === 'quantidade'
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              Quantidade
            </button>
            <button
              onClick={() => setAnaliseTipo('ticket-medio')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                analiseTipo === 'ticket-medio'
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              Ticket Médio
            </button>
          </div>
        </div>
      </motion.div>

      {/* Gráfico de Análise de Clientes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Análise por Cliente</h3>
        <ClientesAnaliseChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
      </motion.div>

      {/* Gráfico ABC/Pareto */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Análise ABC/Pareto</h3>
        <ABCParetoChart companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts} />
      </motion.div>

      {/* Gráfico Comparativo Horizontal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <HorizontalBarChart
          companyCnpj={Array.isArray(cnpjForCharts) ? cnpjForCharts[0] : cnpjForCharts}
        />
      </motion.div>
    </div>
  )
}



