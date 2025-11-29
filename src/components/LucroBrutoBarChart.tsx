import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell, ComposedChart } from 'recharts'

interface LucroBrutoBarChartProps {
  dreData: Array<{ data?: string; conta?: string; natureza?: string; valor?: number }>
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function LucroBrutoBarChart({ dreData }: LucroBrutoBarChartProps) {
  const chartData = useMemo(() => {
    const byMonth = new Map<number, { receita: number; despesa: number; lucro: number }>()
    
    dreData.forEach((r) => {
      if (!r.data) return
      const d = new Date(r.data)
      const month = d.getMonth()
      const current = byMonth.get(month) || { receita: 0, despesa: 0, lucro: 0 }
      
      const valor = Number(r.valor || 0)
      if (r.natureza === 'receita') {
        current.receita += valor
      } else if (r.natureza === 'despesa') {
        current.despesa += Math.abs(valor)
      }
      current.lucro = current.receita - current.despesa
      
      byMonth.set(month, current)
    })

    const data = MONTHS.map((month, index) => {
      const monthData = byMonth.get(index) || { receita: 0, despesa: 0, lucro: 0 }
      return {
        month,
        lucro: monthData.lucro,
      }
    })

    // Calcular média para linha pontilhada
    const lucros = data.map(d => d.lucro).filter(l => l !== 0)
    const media = lucros.length > 0 ? lucros.reduce((a, b) => a + b, 0) / lucros.length : 0

    return { data, media }
  }, [dreData])

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold mb-4">Lucro Bruto por Mês</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData.data}>
            <defs>
              <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#10b981" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#ef4444" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
              </linearGradient>
              <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
              </filter>
            </defs>
            <CartesianGrid stroke="rgba(200,200,200,0.12)" vertical={false} />
            <XAxis 
              dataKey="month" 
              stroke="#bbb" 
              tick={{ fill: '#bbb', fontSize: 12 }} 
            />
            <YAxis 
              stroke="#bbb" 
              tick={{ fill: '#bbb', fontSize: 12 }} 
              tickFormatter={(n) => `R$ ${Number(n).toLocaleString('pt-BR')}`} 
            />
            <Tooltip 
              contentStyle={{ 
                background: '#11161C', 
                border: '1px solid #1B232C',
                borderRadius: '8px'
              }} 
              formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR')}`} 
            />
            <Legend />
            <Bar 
              dataKey="lucro" 
              name="Lucro Bruto" 
              radius={[8, 8, 0, 0]} 
              filter="url(#barShadow)"
            >
              {chartData.data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.lucro >= 0 ? '#10b981' : '#ef4444'} 
                />
              ))}
            </Bar>
            <ReferenceLine 
              y={chartData.media} 
              stroke="#f59e0b" 
              strokeDasharray="5 5" 
              label={{ value: 'Média', position: 'right', fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

