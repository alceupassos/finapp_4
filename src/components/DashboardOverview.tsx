import { Card, Metric, Text, Flex, Grid, Title, BarChart, BadgeDelta } from "@tremor/react"

const kpis = [
  { name: "Receita", value: 847250, delta: 12.5 },
  { name: "Despesas", value: 523180, delta: -8.2 },
  { name: "Lucro", value: 324070, delta: 6.1 },
]

const chartData = [
  { month: "Jan", receita: 62, despesas: 38 },
  { month: "Fev", receita: 68, despesas: 42 },
  { month: "Mar", receita: 74, despesas: 45 },
  { month: "Abr", receita: 80, despesas: 49 },
  { month: "Mai", receita: 85, despesas: 52 },
  { month: "Jun", receita: 90, despesas: 54 },
]

export function DashboardOverview() {
  return (
    <Grid numItemsSm={1} numItemsMd={2} numItemsLg={3} className="gap-6">
      {kpis.map((k) => (
        <Card key={k.name} decoration="top" decorationColor="orange" className="rounded-3xl">
          <Flex justify="between" align="center">
            <Title>{k.name}</Title>
            <BadgeDelta deltaType={k.delta >= 0 ? "moderateIncrease" : "moderateDecrease"}>{k.delta}%</BadgeDelta>
          </Flex>
          <Metric>R$ {k.value.toLocaleString('pt-BR')}</Metric>
          <Text className="mt-2 text-sm text-muted-foreground">Comparado ao mês anterior</Text>
        </Card>
      ))}
      <Card className="rounded-3xl col-span-1 md:col-span-2">
        <Title>Evolução Mensal</Title>
        <Text className="text-sm text-muted-foreground">Receita vs Despesas</Text>
        <BarChart
          className="mt-4 h-56"
          data={chartData}
          index="month"
          categories={["receita", "despesas"]}
          colors={["orange", "neutral"]}
          valueFormatter={(n) => `${n}%`}
          yAxisWidth={40}
          showLegend
        />
      </Card>
    </Grid>
  )
}

