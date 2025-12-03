import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SupabaseRest } from '../../services/supabaseRest'

interface FluxoCaixaBarChartProps {
  cnpj: string | string[]
  year?: number
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function FluxoCaixaBarChart({ cnpj, year = new Date().getFullYear() }: FluxoCaixaBarChartProps) {
  const [data, loading] = useMemo(() => {
    // TODO: Buscar dados reais do Supabase
    // Por enquanto, dados mockados
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
      <h3 className="text-sm font-semibold mb-4">Fluxo de Caixa - Entradas vs Saídas</h3>
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
          <Bar 
            dataKey="entradas" 
            fill="#10b981" 
            name="Entradas"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="saidas" 
            fill="#ef4444" 
            name="Saídas"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

