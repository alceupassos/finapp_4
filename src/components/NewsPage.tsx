import * as React from 'react'
import { Search, RefreshCw, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { pushNews } from '../services/newsSync'
import type { NewsItemRecord, IndicatorsRecord } from '../types/news'
type NewsItem = { date: string; title: string; summary: string; sentiment: 'positivo'|'negativo'|'neutro'; source: string; url: string }

const grupo: NewsItem[] = [
  { date: '2025-11-12', title: 'iFinance Franquadora amplia rede BPO', summary: 'A expansão nacional da rede iFinance eleva a capilaridade e a padronização de processos, ampliando a presença em estados estratégicos. O reforço operacional promete reduzir prazos de onboarding e aumentar a satisfação do cliente, alinhado ao plano de crescimento sustentável e governança.', sentiment: 'positivo', source: 'TechFinance', url: 'https://www.ifinance.com.br/' },
  { date: '2025-11-11', title: 'iFinance integra IA generativa aos processos', summary: 'A adoção de IA generativa nos fluxos de classificação e reconciliação monetiza ganhos de eficiência e consistência. A ferramenta auxilia análises comparativas e cria narrativas gerenciais, acelerando decisões executivas com transparência e trilhas de auditoria.', sentiment: 'positivo', source: 'FinDaily', url: 'https://www.ifinance.com.br/' },
  { date: '2025-11-09', title: 'iFinance apresenta dashboard executivo', summary: 'O novo dashboard executivo consolida indicadores financeiros e operacionais em uma visão única. Com microinterações fluidas e filtros por período, facilita leituras rápidas e suporta planos táticos, reduzindo assimetrias de informação entre times.', sentiment: 'positivo', source: 'Economia Hoje', url: 'https://www.ifinance.com.br/' },
  { date: '2025-11-07', title: 'iFinance fecha parceria com ERP', summary: 'A parceria com ERP amplia integrações via APIs, diminuindo retrabalho e erros de digitação. O ganho de automação encurta ciclos de fechamento e melhora a previsibilidade de caixa, mantendo conformidade regulatória.', sentiment: 'positivo', source: 'ERP Radar', url: 'https://www.ifinance.com.br/' },
  { date: '2025-11-05', title: 'iFinance revisa metas trimestrais', summary: 'Com base em dados de mercado e sazonalidade, a revisão preventiva de metas garante estabilidade e resiliência. O ajuste preserva margens e adequa capacidades de entrega sem comprometer a experiência do cliente.', sentiment: 'neutro', source: 'Mercado360', url: 'https://www.ifinance.com.br/' },
  { date: '2025-11-03', title: 'iFinance reforça governança de dados', summary: 'Iniciativas de governança e LGPD revisitam bases, consentimentos e mecanismos de auditoria. O fortalecimento de políticas reforça segurança e confiança, fundamentais à expansão do ecossistema digital.', sentiment: 'positivo', source: 'Compliance Today', url: 'https://www.ifinance.com.br/' },
]

const concorrentes: NewsItem[] = [
  { date: '2025-11-12', title: 'Concorrente A anuncia plataforma de automação', summary: 'A nova solução de RPA busca reduzir tarefas repetitivas e liberar tempo do time para análises estratégicas. A movimentação segue a tendência do setor em digitalização e eficiência operacional.', sentiment: 'neutro', source: 'Mercado360', url: 'https://example.com/conc-a' },
  { date: '2025-11-10', title: 'Concorrente B fecha unidade regional', summary: 'A reorganização do portfólio afeta cobertura em dois estados, com impacto em presença local e relacionamento. O ajuste de custos pode sinalizar prudência em resposta ao cenário macroeconômico.', sentiment: 'negativo', source: 'Dados&Negócios', url: 'https://example.com/conc-b' },
  { date: '2025-11-08', title: 'Concorrente C reforça equipe de BI', summary: 'A aposta em analytics pode melhorar previsões de caixa e acurácia de projeções. A iniciativa reforça capacidades analíticas para disputas por grandes contas.', sentiment: 'positivo', source: 'BizNews', url: 'https://example.com/conc-c' },
  { date: '2025-11-06', title: 'Concorrente D lança programa de qualidade', summary: 'Certificações e auditorias periódicas buscam elevar padronização. O foco é reduzir retrabalhos e aumentar conformidade regulatória.', sentiment: 'neutro', source: 'Quality Hub', url: 'https://example.com/conc-d' },
]

const tendencias: NewsItem[] = [
  { date: '2025-11-12', title: 'Open Banking acelera reconciliação', summary: 'Interfaces padronizadas encurtam integrações bancárias e reduzem fricções. A melhoria contínua de APIs amplia segurança e qualidade dos dados.', sentiment: 'positivo', source: 'FinTech Radar', url: 'https://example.com/openbanking' },
  { date: '2025-11-10', title: 'LGPD: boas práticas em BPO financeiro', summary: 'Treinamentos e processos robustos de consentimento e auditoria são cruciais. A conformidade protege reputação e prepara terreno para escala sustentável.', sentiment: 'neutro', source: 'Compliance Today', url: 'https://example.com/lgpd' },
  { date: '2025-11-08', title: 'Adoção de IA em BPO cresce', summary: 'Automação com IA melhora desempenho e reduz tempos de ciclo. As melhores práticas incluem explicabilidade e monitoramento.', sentiment: 'positivo', source: 'AI Business', url: 'https://example.com/ia-bpo' },
  { date: '2025-11-06', title: 'Edge Functions ganham espaço', summary: 'Execuções próximas dos dados reduzem latência e aumentam eficiência. A arquitetura serverless habilita elasticidade e custo sob demanda.', sentiment: 'positivo', source: 'Cloud Today', url: 'https://example.com/edge' },
]

function byDateDesc(a: NewsItem, b: NewsItem) { return new Date(b.date).getTime() - new Date(a.date).getTime() }

function Badge({ s }: { s: NewsItem['sentiment'] }) {
  const map = { positivo: 'bg-success text-success-foreground', negativo: 'bg-destructive text-destructive-foreground', neutro: 'bg-warning text-warning-foreground' }
  return <span className={`px-2 py-1 rounded-md text-xs ${map[s]}`}>{s}</span>
}

export function NewsPage() {
  const tabs = ['Grupo', 'Concorrentes', 'Tendências'] as const
  const periods = ['Dia','Semana','Mês','Ano'] as const
  const [tab, setTab] = React.useState<typeof tabs[number]>('Grupo')
  const [period, setPeriod] = React.useState<typeof periods[number]>('Ano')
  const [q, setQ] = React.useState('')
  const base = (tab === 'Grupo' ? grupo : tab === 'Concorrentes' ? concorrentes : tendencias).slice().sort(byDateDesc)
  const list = React.useMemo(()=>{
    const now = new Date()
    const filteredByPeriod = base.filter(n => {
      const d = new Date(n.date)
      const diff = (now.getTime() - d.getTime())/86400000
      if (period==='Dia') return diff <= 1
      if (period==='Semana') return diff <= 7
      if (period==='Mês') return diff <= 31
      return true
    })
    if (!q.trim()) return filteredByPeriod
    const t = q.toLowerCase()
    return filteredByPeriod.filter(n => n.title.toLowerCase().includes(t) || n.summary.toLowerCase().includes(t) || n.source.toLowerCase().includes(t))
  }, [base, period, q])

  const [ind, setInd] = React.useState({ weather: { city: 'São Paulo', temp: 24, dir: 'up' as 'up'|'down'|'neutral' }, usd: { value: 5.12, dir: 'down' as 'up'|'down'|'neutral' }, btc: { value: 38200, dir: 'up' as 'up'|'down'|'neutral' }, selic: { value: 10.75, dir: 'neutral' as 'up'|'down'|'neutral' }, ibov: { value: 128400, dir: 'up' as 'up'|'down'|'neutral' } })
  const mutate = () => {
    const rnd = (v:number, p:number)=> Number((v * (1 + (Math.random()-0.5)*p)).toFixed(2))
    const dir = (from:number, to:number)=> to>from?'up':to<from?'down':'neutral'
    const usd2 = rnd(ind.usd.value, 0.02); const btc2 = rnd(ind.btc.value, 0.03); const selic2 = rnd(ind.selic.value, 0.005); const ibov2 = rnd(ind.ibov.value, 0.02)
    setInd({
      weather: { city: ind.weather.city, temp: rnd(ind.weather.temp, 0.05), dir: dir(ind.weather.temp, rnd(ind.weather.temp,0.01)) },
      usd: { value: usd2, dir: dir(ind.usd.value, usd2) },
      btc: { value: btc2, dir: dir(ind.btc.value, btc2) },
      selic: { value: selic2, dir: dir(ind.selic.value, selic2) },
      ibov: { value: ibov2, dir: dir(ind.ibov.value, ibov2) },
    })
    const items: NewsItemRecord[] = list.map(n => ({ ...n, tab: tab, period }))
    const indicators: IndicatorsRecord[] = [
      { metric: 'clima', value: ind.weather.temp, direction: ind.weather.dir },
      { metric: 'usd_brl', value: ind.usd.value, direction: ind.usd.dir },
      { metric: 'btc_usd', value: ind.btc.value, direction: ind.btc.dir },
      { metric: 'selic', value: ind.selic.value, direction: ind.selic.dir },
      { metric: 'ibov', value: ind.ibov.value, direction: ind.ibov.dir },
    ]
    pushNews(items, indicators).catch(()=>{})
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl bg-card border border-border shadow-card p-4">
        <p className="text-sm text-muted-foreground">Cliente: iFinance Franquadora de BPO • www.ifinance.com.br</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[
          { name: 'Clima', value: `${ind.weather.city} • ${ind.weather.temp}°C`, dir: ind.weather.dir },
          { name: 'USD/BRL', value: `R$ ${ind.usd.value.toFixed(2)}`, dir: ind.usd.dir },
          { name: 'BTC/USD', value: `$ ${ind.btc.value.toFixed(0)}`, dir: ind.btc.dir },
          { name: 'Selic', value: `${ind.selic.value.toFixed(2)}%`, dir: ind.selic.dir },
          { name: 'Ibovespa', value: `${Math.round(ind.ibov.value).toLocaleString('pt-BR')}`, dir: ind.ibov.dir },
        ].map((k,i)=> (
          <div key={i} className="rounded-2xl bg-card border border-border shadow-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{k.name}</p>
              <p className="text-sm font-semibold">{k.value}</p>
            </div>
            {k.dir==='up' ? <ArrowUpRight className="w-5 h-5 text-emerald-500"/> : k.dir==='down' ? <ArrowDownRight className="w-5 h-5 text-red-500"/> : <Minus className="w-5 h-5 text-graphite-400"/>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-graphite-900 rounded-xl p-1">
          {tabs.map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm ${tab===t ? 'bg-gold-500 text-white' : 'text-muted-foreground hover:text-foreground hover:bg-graphite-800'}`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-graphite-900 rounded-xl p-1">
          {periods.map(p => (
            <button key={p} onClick={()=>setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-sm ${period===p ? 'bg-gold-500 text-white' : 'text-muted-foreground hover:text-foreground hover:bg-graphite-800'}`}>{p}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar por título, resumo ou fonte" className="pl-10 pr-3 py-2 rounded-xl bg-graphite-900 border border-graphite-800 text-sm"/>
        </div>
        <button onClick={mutate} className="rounded-xl bg-secondary text-secondary-foreground border border-border px-3 py-2 text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Atualizar</button>
      </div>
      <div className="rounded-3xl bg-card border border-border shadow-card">
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Notícias • {tab}</p>
        </div>
        <div className="p-4 pt-0 space-y-3">
          {list.map((n, i) => (
            <a key={i} href={n.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-graphite-800 p-4 hover:bg-graphite-900 transition">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{n.title}</h4>
                <Badge s={n.sentiment} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{n.summary}</p>
              <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
                <span>{new Date(n.date).toLocaleDateString('pt-BR')}</span>
                <span>{n.source}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
