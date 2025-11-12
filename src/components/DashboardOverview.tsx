import { Card, Metric, Text, Flex, Grid, Title, BarChart, BadgeDelta } from "@tremor/react"

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
  return (
    <Grid numItemsSm={1} numItemsMd={2} numItemsLg={3} className="gap-6">
      {kpis.map((k) => (
        <Card key={k.name} decoration="top" decorationColor="orange" className="rounded-3xl bg-card border border-border shadow-card">
          <Flex justify="between" align="center">
            <Title>{k.name}</Title>
            <BadgeDelta deltaType={k.delta >= 0 ? "moderateIncrease" : "moderateDecrease"}>{k.delta}%</BadgeDelta>
          </Flex>
          <Metric>R$ {k.value.toLocaleString('pt-BR')}</Metric>
          <Text className="mt-2 text-sm text-muted-foreground">Comparado ao mês anterior</Text>
        </Card>
      ))}
      <Card className="rounded-3xl col-span-1 md:col-span-2 bg-card border border-border shadow-card">
        <Title>Evolução Mensal</Title>
        <Text className="text-sm text-muted-foreground">Receita vs Despesas</Text>
        <BarChart
          className="mt-4 h-56"
          data={chartData}
          index="month"
          categories={["receita", "despesas"]}
          colors={["orange", "sky"]}
          valueFormatter={(n) => `R$ ${Number(n).toLocaleString('pt-BR')}`}
          yAxisWidth={56}
          showLegend
        />
      </Card>
    </Grid>
  )
}
