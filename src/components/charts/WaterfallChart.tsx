import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface WaterfallChartProps {
  cnpj: string | string[]
  year?: number
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function WaterfallChart({ cnpj, year = new Date().getFullYear() }: WaterfallChartProps) {
  const [data, loading] = useMemo(() => {
    // TODO: Buscar dados reais
    let acumulado = 0
    const mockData = MONTHS.map((month, idx) => {
      const valor = (Math.random() - 0.3) * 2000000
      acumulado += valor
      return {
        month,
        valor,
        acumulado,
        tipo: valor > 0 ? 'aumentar' : valor < 0 ? 'diminuir' : 'neutro',
      }
    })
    // Adicionar total
    mockData.push({
      month: 'Total',
      valor: acumulado,
      acumulado,
      tipo: acumulado > 0 ? 'total-pos' : 'total-neg',
    })
    return [mockData, false]
  }, [cnpj, year])

  const getColor = (tipo: string) => {
    switch (tipo) {
      case 'aumentar': return '#10b981'
      case 'diminuir': return '#ef4444'
      case 'total-pos': return '#f59e0b'
      case 'total-neg': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="card-premium p-6">
      <h3 className="text-sm font-semibold mb-4">Geração de Caixa - Waterfall</h3>
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
              'Valor',
            ]}
          />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
            {data.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.tipo)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-muted-foreground">Aumentar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-muted-foreground">Diminuir</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gold-500" />
          <span className="text-muted-foreground">Total</span>
        </div>
      </div>
    </div>
  )
}

