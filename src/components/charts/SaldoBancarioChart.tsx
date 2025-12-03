import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, LineChart, ComposedChart } from 'recharts'

interface SaldoBancarioChartProps {
  cnpj: string | string[]
}

export function SaldoBancarioChart({ cnpj }: SaldoBancarioChartProps) {
  const [data, loading] = useMemo(() => {
    // TODO: Buscar dados reais
    const mockData = [
      { month: 'Nov/2025', receitas: 1867386, despesas: 887670, saldo: 979715 },
      { month: 'Dez/2025', receitas: 2727030, despesas: 1867386, saldo: 859644 },
      { month: 'Jan/2026', receitas: 2644441, despesas: 2727030, saldo: -82588 },
    ]
    return [mockData, false]
  }, [cnpj])

  if (loading) {
    return (
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="card-premium p-6">
      <h3 className="text-sm font-semibold mb-4">Saldo Projetado</h3>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="month" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 30, 30, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [
              `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              '',
            ]}
          />
          <Legend 
            wrapperStyle={{ color: '#9ca3af' }}
            iconType="square"
          />
          <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
          <Line 
            type="monotone" 
            dataKey="saldo" 
            stroke="#f59e0b" 
            strokeWidth={3}
            name="Saldo Projetado"
            dot={{ fill: '#f59e0b', r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

