import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '../../lib/formatters'

interface DREWaterfallChartProps {
  dreData: Array<{ conta?: string; natureza?: string; valor?: number }>
}

export function DREWaterfallChart({ dreData }: DREWaterfallChartProps) {
  const chartData = useMemo(() => {
    const grouped = dreData.reduce(
      (acc, item) => {
        const key = item.natureza || 'outros'
        if (!acc[key]) {
          acc[key] = 0
        }
        acc[key] += Math.abs(Number(item.valor || 0))
        return acc
      },
      {} as Record<string, number>
    )

    const receitaBruta = grouped.receita || 0
    const deducoes = dreData
      .filter((r) => {
        const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
        return (
          text.includes('imposto') ||
          text.includes('taxa') ||
          text.includes('tarifa') ||
          text.includes('deducao')
        )
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const receitaLiquida = receitaBruta - deducoes

    const despesas = dreData
      .filter((r) => r.natureza === 'despesa')
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const lucroLiquido = receitaLiquida - despesas

    return [
      { name: 'Receita Bruta', value: receitaBruta, type: 'positive' },
      { name: '(-) Deduções', value: -deducoes, type: 'negative' },
      { name: 'Receita Líquida', value: receitaLiquida, type: 'positive' },
      { name: '(-) Despesas', value: -despesas, type: 'negative' },
      { name: 'Lucro Líquido', value: lucroLiquido, type: lucroLiquido >= 0 ? 'positive' : 'negative' },
    ]
  }, [dreData])

  const colors = {
    positive: '#10b981',
    negative: '#ef4444',
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="name"
          stroke="#9ca3af"
          style={{ fontSize: '12px' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          stroke="#9ca3af"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => formatCurrency(value, { showSymbol: true })}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[entry.type as keyof typeof colors]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

