import { Card, Metric, Text, Flex, Title, BadgeDelta } from "@tremor/react"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'

type Period = 'Dia' | 'Semana' | 'Mês' | 'Ano'

const kpis = [
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
  if (period === 'Mês') return baseData.slice(-1)
  if (period === 'Semana') return baseData.slice(-1).map(d => ({ ...d, month: 'Semana' }))
  return baseData.slice(-1).map(d => ({ ...d, month: 'Hoje' }))
}

export function DashboardOverview({ period = 'Ano' }: { period?: Period }) {
  const chartData = dataByPeriod(period)
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
              <Tooltip contentStyle={{ background: '#11161C', border: '1px solid #1B232C' }} formatter={(v:any)=>`R$ ${Number(v).toLocaleString('pt-BR')}`} />
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
            <Flex justify="between" align="center">
              <Title>{k.name}</Title>
              <BadgeDelta deltaType={k.delta >= 0 ? "moderateIncrease" : "moderateDecrease"}>{k.delta}%</BadgeDelta>
            </Flex>
            <Metric>R$ {k.value.toLocaleString('pt-BR')}</Metric>
            <Text className="mt-2 text-sm text-muted-foreground">Comparado ao mês anterior</Text>
          </Card>
        ))}
      </div>
    </div>
  )
}
