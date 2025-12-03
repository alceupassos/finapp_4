import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface HorizontalBarChartProps {
  data: Array<{ name: string; value: number }>
  title: string
  color?: string
  maxItems?: number
}

export function HorizontalBarChart({ data, title, color = '#10b981', maxItems = 10 }: HorizontalBarChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => b.value - a.value)
      .slice(0, maxItems)
      .map(item => ({
        name: item.name.length > 30 ? `${item.name.substring(0, 30)}...` : item.name,
        value: item.value,
      }))
  }, [data, maxItems])

  return (
    <div className="card-premium p-6">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.min(400, chartData.length * 40)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            type="number"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
          />
          <YAxis 
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            style={{ fontSize: '11px' }}
            width={140}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 30, 30, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [
              `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              'Valor',
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

