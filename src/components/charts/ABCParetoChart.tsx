import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, Cell } from 'recharts'

interface ABCParetoChartProps {
  cnpj: string | string[]
}

export function ABCParetoChart({ cnpj }: ABCParetoChartProps) {
  const [data, ranking, loading] = useMemo(() => {
    // TODO: Buscar dados reais
    const mockData = [
      { produto: 'Produto A', valor: 13462060, classe: 'A' },
      { produto: 'Produto B', valor: 9656580, classe: 'A' },
      { produto: 'Produto C', valor: 8615284, classe: 'B' },
      { produto: 'Produto D', valor: 1496722, classe: 'B' },
      { produto: 'Produto E', valor: 800000, classe: 'C' },
    ]
    
    const total = mockData.reduce((sum, item) => sum + item.valor, 0)
    let acumulado = 0
    const withPercent = mockData.map(item => {
      acumulado += item.valor
      return {
        ...item,
        percentual: (item.valor / total) * 100,
        percentualAcumulado: (acumulado / total) * 100,
      }
    })

    const rankingData = withPercent.map((item, idx) => ({
      rank: idx + 1,
      descricao: item.produto,
      valor: item.valor,
      classe: item.classe,
      percentualAcumulado: item.percentualAcumulado,
    }))

    return [withPercent, rankingData, false]
  }, [cnpj])

  const getClassColor = (classe: string) => {
    switch (classe) {
      case 'A': return '#8b5cf6'
      case 'B': return '#3b82f6'
      case 'C': return '#6b7280'
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
    <div className="space-y-6">
      <div className="card-premium p-6">
        <h3 className="text-sm font-semibold mb-4">Valor Vendido por Produto x Contribuição Acumulada</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="produto"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              yAxisId="left"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(1)}M`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
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
              formatter={(value: number, name: string) => {
                if (name === 'percentualAcumulado') {
                  return [`${value.toFixed(2)}%`, 'Contribuição Acumulada']
                }
                return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 'Valor']
              }}
            />
            <Legend 
              wrapperStyle={{ color: '#9ca3af' }}
            />
            <Bar yAxisId="left" dataKey="valor" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getClassColor(entry.classe)} />
              ))}
            </Bar>
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="percentualAcumulado" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Contribuição Acumulada"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="card-premium p-6">
        <h3 className="text-sm font-semibold mb-4">Ranking de Produtos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-800">
                <th className="p-3 text-left">Rank</th>
                <th className="p-3 text-left">Descrição</th>
                <th className="p-3 text-right">Valor Vendido</th>
                <th className="p-3 text-center">Classe</th>
                <th className="p-3 text-right">% Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item) => (
                <tr key={item.rank} className="border-b border-graphite-800/50 hover:bg-graphite-800/30">
                  <td className="p-3">{item.rank}</td>
                  <td className="p-3">{item.descricao}</td>
                  <td className="p-3 text-right text-emerald-400">
                    R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="p-3 text-center">
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: `${getClassColor(item.classe)}20`,
                        color: getClassColor(item.classe)
                      }}
                    >
                      {item.classe}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-2 bg-graphite-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full"
                          style={{ 
                            width: `${item.percentualAcumulado}%`,
                            backgroundColor: getClassColor(item.classe)
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {item.percentualAcumulado.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

