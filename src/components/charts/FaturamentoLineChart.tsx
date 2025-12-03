import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface FaturamentoLineChartProps {
  cnpj: string | string[]
}

type PeriodType = 'semanal' | 'mensal' | 'anual'

export function FaturamentoLineChart({ cnpj }: FaturamentoLineChartProps) {
  const [period, setPeriod] = useState<PeriodType>('semanal')

  const [data, loading] = useMemo(() => {
    // TODO: Buscar dados reais
    let mockData: any[] = []
    if (period === 'semanal') {
      mockData = [
        { dia: 'Quarta', atual: 50000, anterior: 120000 },
        { dia: 'Quinta', atual: 45000, anterior: 150000 },
        { dia: 'Sexta', atual: 60000, anterior: 180000 },
        { dia: 'Sábado', atual: 35000, anterior: 200000 },
        { dia: 'Domingo', atual: 20000, anterior: 150000 },
        { dia: 'Segunda', atual: 30000, anterior: 100000 },
        { dia: 'Terça', atual: 0, anterior: 80000 },
      ]
    } else if (period === 'mensal') {
      mockData = Array.from({ length: 12 }, (_, i) => ({
        mes: `Mês ${i + 1}`,
        atual: Math.random() * 500000 + 200000,
        anterior: Math.random() * 600000 + 250000,
      }))
    } else {
      mockData = Array.from({ length: 5 }, (_, i) => ({
        ano: `${2020 + i}`,
        atual: Math.random() * 5000000 + 2000000,
        anterior: Math.random() * 6000000 + 2500000,
      }))
    }
    return [mockData, false]
  }, [cnpj, period])

  if (loading) {
    return (
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const xKey = period === 'semanal' ? 'dia' : period === 'mensal' ? 'mes' : 'ano'

  return (
    <div className="card-premium p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Faturamento</h3>
        <div className="flex gap-2">
          {(['semanal', 'mensal', 'anual'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey={xKey}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
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
          <Line 
            type="monotone" 
            dataKey="anterior" 
            stroke="#6b7280" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Período Anterior"
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="atual" 
            stroke="#10b981" 
            strokeWidth={3}
            name="Período Atual"
            dot={{ fill: '#10b981', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

