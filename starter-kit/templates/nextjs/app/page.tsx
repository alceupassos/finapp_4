import { KpiCard } from '@/components/cards/KpiCard'
import { ChartCard } from '@/components/cards/ChartCard'
import { ListCard } from '@/components/cards/ListCard'
export default function Page(){
  const items=[{ title:'Receita', value:125000 },{ title:'Despesa', value:92000 }]
  const series=[{ name:'Receita', data:[10,12,13,15,18]},{ name:'Despesa', data:[7,9,11,12,14]}]
  return (
    <main className="p-6 grid gap-6 grid-cols-1 md:grid-cols-2">
      <KpiCard title="Lucro" value={33000} subtitle="Mês atual"/>
      <ChartCard title="Receita x Despesa" series={series}/>
      <ListCard title="Resumo" items={items}/>
    </main>
  )
}