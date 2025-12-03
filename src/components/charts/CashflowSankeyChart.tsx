import { useMemo } from 'react'
import { ResponsiveContainer } from 'recharts'

interface CashflowSankeyChartProps {
  dfcData: Array<{ kind?: string; category?: string; amount?: number }>
}

export function CashflowSankeyChart({ dfcData }: CashflowSankeyChartProps) {
  // Por enquanto, renderizar um placeholder
  // Implementação completa de Sankey requer biblioteca específica (ex: d3-sankey)
  const hasData = dfcData && dfcData.length > 0

  return (
    <ResponsiveContainer width="100%" height={400}>
      <div className="flex items-center justify-center h-full bg-graphite-900/50 rounded-lg">
        {hasData ? (
          <div className="text-center">
            <p className="text-graphite-400 mb-2">Gráfico Sankey</p>
            <p className="text-xs text-graphite-500">
              Implementação completa requer biblioteca d3-sankey
            </p>
          </div>
        ) : (
          <p className="text-graphite-500">Nenhum dado disponível</p>
        )}
      </div>
    </ResponsiveContainer>
  )
}

