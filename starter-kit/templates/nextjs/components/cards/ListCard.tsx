import { Card } from '@tremor/react'
export function ListCard({ title, items }:{ title:string; items:{ title:string; value:number|string }[] }){
  return (
    <Card className="bg-[var(--color-ui-surface)] border border-[var(--color-ui-border)]">
      <div className="text-lg font-semibold mb-3">{title}</div>
      <ul className="space-y-2">
        {items.map((it,i)=> (
          <li key={i} className="flex items-center justify-between">
            <span className="text-[var(--color-ui-muted)]">{it.title}</span>
            <span>{typeof it.value==='number'? it.value.toLocaleString('pt-BR'): it.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  )}