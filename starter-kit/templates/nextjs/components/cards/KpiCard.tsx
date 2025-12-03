import { Card, Metric, Text } from '@tremor/react'
export function KpiCard({ title, value, subtitle }:{ title:string; value:number|string; subtitle?:string }){
  return (
    <Card className="bg-[var(--color-ui-surface)] border border-[var(--color-ui-border)]">
      <Text className="text-[var(--color-ui-muted)]">{title}</Text>
      <Metric>{typeof value==='number'? value.toLocaleString('pt-BR'): value}</Metric>
      {subtitle? <Text className="text-[var(--color-ui-muted)]">{subtitle}</Text>: null}
    </Card>
  )
}