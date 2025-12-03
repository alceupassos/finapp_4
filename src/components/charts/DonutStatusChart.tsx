import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface DonutStatusChartProps {
  cnpj: string | string[]
}

const COLORS = {
  aVencer: '#3b82f6',
  venceHoje: '#f59e0b',
  venceEsteMes: '#60a5fa',
  atrasado: '#ef4444',
}

export function DonutStatusChart({ cnpj }: DonutStatusChartProps) {
  const [data, loading] = useMemo(() => {
    // TODO: Buscar dados reais
    const mockData = [
      { name: 'A Vencer', value: 348259, color: COLORS.aVencer },
      { name: 'Vence Este Mês', value: 144185, color: COLORS.venceEsteMes },
      { name: 'Vence Hoje', value: 5000, color: COLORS.venceHoje },
      { name: 'Atrasado', value: 140, color: COLORS.atrasado },
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

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="card-premium p-6">
      <h3 className="text-sm font-semibold mb-4">Status de Pagamentos</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
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
            wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">Total em Aberto</p>
        <p className="text-lg font-semibold text-gold-400">
          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  )
}

