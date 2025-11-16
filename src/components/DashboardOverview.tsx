import { Card, Metric, Text, Flex, Title, BadgeDelta } from "@tremor/react"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { useEffect, useState } from 'react'
import { loadCompaniesFallback, loadDFCFallback } from '../services/dataLoader'

type Period = 'Dia' | 'Semana' | 'Mês' | 'Ano'

const defaultKpis = [
  { name: "Receita", value: 847250, delta: 12.5 },
  { name: "Despesas", value: 523180, delta: -8.2 },
  { name: "Lucro", value: 324070, delta: 6.1 },
]

const baseData = [
  { month: "Jan", receita: 620000, despesas: 380000 },
  { month: "Fev", receita: 680000, despesas: 420000 },
  { month: "Mar", receita: 740000, despesas: 450000 },
  { month: "Abr", receita: 800000, despesas: 490000 },
  { month: "Mai", receita: 850000, despesas: 520000 },
  { month: "Jun", receita: 900000, despesas: 540000 },
]

function dataByPeriod(period: Period) {
  if (period === 'Ano') return baseData
  if (period === 'Mês') return [
    { month: 'Sem 1', receita: 210000, despesas: 128000 },
    { month: 'Sem 2', receita: 230000, despesas: 135000 },
    { month: 'Sem 3', receita: 190000, despesas: 120000 },
    { month: 'Sem 4', receita: 210000, despesas: 137000 },
  ]
  if (period === 'Semana') return [
    { month: 'Seg', receita: 42000, despesas: 25800 },
    { month: 'Ter', receita: 36000, despesas: 24000 },
  ]
  return [
    { month: 'Hoje', receita: 8500, despesas: 5200 },
  ]
}

export function DashboardOverview({ period = 'Ano', session }: { period?: Period; session?: any }) {
  const [chartData, setChartData] = useState(dataByPeriod(period))
  const [kpis, setKpis] = useState(defaultKpis)
  useEffect(() => {
    ;(async () => {
      try {
        const companies = await loadCompaniesFallback()
        const def = companies[0]?.cnpj || undefined
        const dfc = await loadDFCFallback(def)
        if (Array.isArray(dfc) && dfc.length) {
          const byMonth: Record<string,{ receita:number; despesas:number; saldo:number }> = {}
          dfc.forEach((d:any)=>{
            const m = new Date(d.data).toLocaleString('pt-BR',{ month:'short' })
            byMonth[m] ||= { receita:0, despesas:0, saldo:d.saldo }
            byMonth[m].receita += d.entrada || 0
            byMonth[m].despesas += d.saida || 0
            byMonth[m].saldo = typeof d.saldo === 'number' ? d.saldo : (byMonth[m].receita - byMonth[m].despesas)
          })
          const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
          const full = months.map(m=>({ month:m, receita: byMonth[m]?.receita||0, despesas: byMonth[m]?.despesas||0 }))
          setChartData(period==='Ano' ? full : period==='Mês' ? full.slice(-4) : period==='Semana' ? full.slice(-2) : full.slice(-1))
          const receitaTotal = dfc.reduce((a:number,b:any)=> a + (b.entrada||0), 0)
          const despesasTotal = dfc.reduce((a:number,b:any)=> a + (b.saida||0), 0)
          const lucro = receitaTotal - despesasTotal
          setKpis([
            { name: "Receita", value: receitaTotal, delta: 0 },
            { name: "Despesas", value: despesasTotal, delta: 0 },
            { name: "Lucro", value: lucro, delta: 0 },
          ])
          return
        }
      } catch {}
      setChartData(dataByPeriod(period))
      setKpis(defaultKpis)
    })()
  }, [period, session?.accessToken])
  const tone = [
    { ring: 'ring-orange-500/15', glow: 'shadow-glow-sm' },
    { ring: 'ring-sky-500/15', glow: 'shadow-glow-sm' },
    { ring: 'ring-emerald-500/15', glow: 'shadow-glow-sm' },
  ]
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl bg-card border border-border shadow-card">
        <Title>Evolução Mensal</Title>
        <Text className="text-sm text-muted-foreground">Receita vs Despesas</Text>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="barReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#ff7a00" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ff7a00" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="barDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#38bdf8" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.4} />
                </linearGradient>
                <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.35" />
                </filter>
              </defs>
              <CartesianGrid stroke="rgba(200,200,200,0.12)" vertical={false} />
              <XAxis dataKey="month" stroke="#bbb" tick={{ fill: '#bbb', fontSize: 12 }} />
              <YAxis stroke="#bbb" tick={{ fill: '#bbb', fontSize: 12 }} tickFormatter={(n)=>`R$ ${Number(n).toLocaleString('pt-BR')}`} />
              <Tooltip content={<OverviewTooltip />} />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="url(#barReceita)" radius={[8,8,0,0]} filter="url(#barShadow)" />
              <Bar dataKey="despesas" name="Despesas" fill="url(#barDespesas)" radius={[8,8,0,0]} filter="url(#barShadow)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {kpis.map((k, idx) => (
          <Card key={k.name} className={`rounded-3xl bg-card border border-border shadow-card ring-1 ${tone[idx].ring} ${tone[idx].glow}`}>
            <div className="flex items-center justify-between">
              <Title>{k.name}</Title>
              <BadgeDelta deltaType={k.delta >= 0 ? "moderateIncrease" : "moderateDecrease"}>{k.delta}%</BadgeDelta>
            </div>
            <Metric>R$ {k.value.toLocaleString('pt-BR')}</Metric>
            <Text className="mt-2 text-sm text-muted-foreground">Comparado ao mês anterior</Text>
          </Card>
        ))}
      </div>
    </div>
  )
}
function overviewInsight(payload: any[]): string {
  if (!payload || !payload.length) return 'Sem dados suficientes'
  const r = payload.find((p:any)=>p.dataKey==='receita')?.value || 0
  const d = payload.find((p:any)=>p.dataKey==='despesas')?.value || 0
  const diff = r - d
  if (diff > 0) return 'Positivo: receita supera despesas neste período.'
  if (diff < 0) return 'Alerta: despesas acima da receita neste período.'
  return 'Neutro: equilíbrio entre receita e despesas.'
}

const OverviewTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-charcoal-900/95 backdrop-blur-xl border border-graphite-800 rounded-2xl p-3 shadow-xl">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry:any, idx:number)=> (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{entry.name}</span>
              <span className="text-xs font-bold">{`R$ ${Number(entry.value).toLocaleString('pt-BR')}`}</span>
            </div>
          ))}
        </div>
        <p className="text-xs mt-2">{overviewInsight(payload)}</p>
      </div>
    )
  }
  return null
}
