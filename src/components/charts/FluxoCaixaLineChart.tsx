import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface FluxoCaixaLineChartProps {
  cnpj: string | string[]
  year?: number
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function FluxoCaixaLineChart({ cnpj, year = new Date().getFullYear() }: FluxoCaixaLineChartProps) {
  const [data, loading] = useMemo(() => {
    // TODO: Buscar dados reais do Supabase
    const mockData = MONTHS.map((month, idx) => ({
      month,
      entradas: Math.random() * 2000000 + 500000,
      saidas: Math.random() * 1500000 + 400000,
    }))
    return [mockData, false]
  }, [cnpj, year])

  if (loading) {
    return (
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="card-premium p-6">
      <h3 className="text-sm font-semibold mb-4">Fluxo de Caixa - Tendência</h3>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            iconType="line"
          />
          <Area
            type="monotone"
            dataKey="entradas"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorEntradas)"
            name="Entradas"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="saidas"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#colorSaidas)"
            name="Saídas"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

