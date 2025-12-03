import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface IndicadoresBarChartProps {
  cnpj: string | string[]
  indicador: 'margem-bruta' | 'ebitda' | 'margem-liquida'
  year?: number
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function IndicadoresBarChart({ cnpj, indicador, year = new Date().getFullYear() }: IndicadoresBarChartProps) {
  const [data, loading, title] = useMemo(() => {
    // TODO: Buscar dados reais
    const titles = {
      'margem-bruta': '% Margem Bruta',
      'ebitda': '% EBITDA',
      'margem-liquida': '% Margem Líquida',
    }
    const mockData = MONTHS.map((month) => ({
      month,
      valor: Math.random() * 20 + 80, // 80-100%
    }))
    return [mockData, false, titles[indicador]]
  }, [cnpj, indicador, year])

  if (loading) {
    return (
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="card-premium p-6">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="month" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 30, 30, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
          />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#10b981" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

