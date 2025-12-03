import { TrendingUp, Table, Receipt, Building, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'

export type ChartTabId = 'fluxo' | 'dre-dfc' | 'pagar-receber' | 'bancos' | 'indicadores'

interface ChartNavigationTabsProps {
  activeTab: ChartTabId
  onTabChange: (tab: ChartTabId) => void
}

const tabs: Array<{ id: ChartTabId; label: string; icon: any }> = [
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: TrendingUp },
  { id: 'dre-dfc', label: 'DRE | DFC', icon: Table },
  { id: 'pagar-receber', label: 'A Pagar & Receber', icon: Receipt },
  { id: 'bancos', label: 'Contas Bancárias', icon: Building },
  { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
]

export function ChartNavigationTabs({ activeTab, onTabChange }: ChartNavigationTabsProps) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        
        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20'
                : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

