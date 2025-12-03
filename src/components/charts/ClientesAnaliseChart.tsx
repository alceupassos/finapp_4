import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts'

interface ClientesAnaliseChartProps {
  cnpj: string | string[]
  tipo: 'valor' | 'quantidade' | 'ticket-medio'
}

export function ClientesAnaliseChart({ cnpj, tipo }: ClientesAnaliseChartProps) {
  const [barData, lineData, loading] = useMemo(() => {
    // TODO: Buscar dados reais
    const mockBarData = [
      { cliente: 'Cliente A', valor: 359000 },
      { cliente: 'Cliente B', valor: 179000 },
      { cliente: 'Cliente C', valor: 179000 },
      { cliente: 'Cliente D', valor: 150000 },
      { cliente: 'Cliente E', valor: 120000 },
    ]
    const mockLineData = Array.from({ length: 12 }, (_, i) => ({
      mes: `M${i + 1}`,
      clientes: Math.floor(Math.random() * 100 + 50),
    }))
    return [mockBarData, mockLineData, false]
  }, [cnpj, tipo])

  if (loading) {
    return (
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card-premium p-6">
        <h3 className="text-sm font-semibold mb-4">Análise por Cliente</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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
              dataKey="cliente"
              stroke="#9ca3af"
              style={{ fontSize: '11px' }}
              width={90}
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
            <Bar dataKey="valor" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card-premium p-6">
        <h3 className="text-sm font-semibold mb-4">Análise por Período</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="mes"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
              }}
            />
            <Line 
              type="monotone" 
              dataKey="clientes" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Clientes"
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

