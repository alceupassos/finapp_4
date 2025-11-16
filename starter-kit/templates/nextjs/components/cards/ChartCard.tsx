import { Card, Title } from '@tremor/react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
export function ChartCard({ title, series }:{ title:string; series:{ name:string; data:number[] }[] }){
  const data = Array.from({ length: Math.max(...series.map(s=>s.data.length)) }, (_,i)=>{
    const row: any = { idx:i+1 }
    series.forEach(s=>{ row[s.name]=s.data[i]??null })
    return row
  })
  return (
    <Card className="bg-[var(--color-ui-surface)] border border-[var(--color-ui-border)]">
      <Title>{title}</Title>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="idx"/>
            <YAxis/>
            <Tooltip/>
            {series.map(s=> <Line key={s.name} type="monotone" dataKey={s.name} stroke="var(--color-brand-primary)" dot={false}/>)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}