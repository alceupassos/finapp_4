import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface MonthlyBarChartProps {
  data: Array<{ data?: string; conta?: string; natureza?: string; valor?: number }>
  title?: string
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const COLORS = ['#ff7a00', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

export function MonthlyBarChart({ data, title = 'Evolução Mensal' }: MonthlyBarChartProps) {
  const chartData = useMemo(() => {
    const byMonth = new Map<number, number>()
    
    data.forEach((r) => {
      if (!r.data) return
      const d = new Date(r.data)
      const month = d.getMonth()
      const current = byMonth.get(month) || 0
      byMonth.set(month, current + Number(r.valor || 0))
    })

    return MONTHS.map((month, index) => ({
      month,
      valor: byMonth.get(index) || 0,
    }))
  }, [data])

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#ff7a00" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#ff7a00" stopOpacity={0.4} />
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
            <Bar 
              dataKey="valor" 
              name="Valor" 
              fill="url(#barGradient)" 
              radius={[8, 8, 0, 0]} 
              filter="url(#barShadow)"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

