import * as React from 'react'
type NewsItem = { date: string; title: string; summary: string; sentiment: 'positivo'|'negativo'|'neutro'; source: string; url: string }

const grupo: NewsItem[] = [
  { date: '2025-11-12', title: 'iFinance Franquadora amplia rede BPO', summary: 'Expansão nacional reforça cobertura e qualidade de atendimento.', sentiment: 'positivo', source: 'TechFinance', url: 'https://www.ifinance.com.br/' },
  { date: '2025-11-11', title: 'iFinance integra IA generativa aos processos', summary: 'Novos fluxos com IA elevam eficiência e precisão contábil.', sentiment: 'positivo', source: 'FinDaily', url: 'https://www.ifinance.com.br/' },
  { date: '2025-11-09', title: 'iFinance apresenta dashboard executivo', summary: 'Visão gerencial consolidada para tomada de decisão rápida.', sentiment: 'positivo', source: 'Economia Hoje', url: 'https://www.ifinance.com.br/' },
  { date: '2025-11-07', title: 'iFinance fecha parceria com ERP', summary: 'Integrações reduzem retrabalho e aceleram reconciliações.', sentiment: 'positivo', source: 'ERP Radar', url: 'https://www.ifinance.com.br/' },
  { date: '2025-11-05', title: 'iFinance revisa metas trimestrais', summary: 'Ajuste preventivo para estabilidade operacional.', sentiment: 'neutro', source: 'Mercado360', url: 'https://www.ifinance.com.br/' },
]

const concorrentes: NewsItem[] = [
  { date: '2025-11-12', title: 'Concorrente A anuncia plataforma de automação', summary: 'Ferramenta de RPA promete reduzir tarefas repetitivas.', sentiment: 'neutro', source: 'Mercado360', url: 'https://example.com/conc-a' },
  { date: '2025-11-10', title: 'Concorrente B fecha unidade regional', summary: 'Reorganização afeta cobertura em dois estados.', sentiment: 'negativo', source: 'Dados&Negócios', url: 'https://example.com/conc-b' },
  { date: '2025-11-08', title: 'Concorrente C reforça equipe de BI', summary: 'Aposta em analytics para melhorar previsões.', sentiment: 'positivo', source: 'BizNews', url: 'https://example.com/conc-c' },
]

const tendencias: NewsItem[] = [
  { date: '2025-11-12', title: 'Open Banking acelera reconciliação', summary: 'Integrações reduzem fricção operacional.', sentiment: 'positivo', source: 'FinTech Radar', url: 'https://example.com/openbanking' },
  { date: '2025-11-10', title: 'LGPD: boas práticas em BPO financeiro', summary: 'Processos de consentimento e auditoria ganham força.', sentiment: 'neutro', source: 'Compliance Today', url: 'https://example.com/lgpd' },
  { date: '2025-11-08', title: 'Adoção de IA em BPO cresce', summary: 'Empresas aumentam automações com ganhos de eficiência.', sentiment: 'positivo', source: 'AI Business', url: 'https://example.com/ia-bpo' },
]

function byDateDesc(a: NewsItem, b: NewsItem) { return new Date(b.date).getTime() - new Date(a.date).getTime() }

function Badge({ s }: { s: NewsItem['sentiment'] }) {
  const map = { positivo: 'bg-success text-success-foreground', negativo: 'bg-destructive text-destructive-foreground', neutro: 'bg-warning text-warning-foreground' }
  return <span className={`px-2 py-1 rounded-md text-xs ${map[s]}`}>{s}</span>
}

export function NewsPage() {
  const tabs = ['Grupo', 'Concorrentes', 'Tendências'] as const
  const [tab, setTab] = React.useState<typeof tabs[number]>('Grupo')
  const list = (tab === 'Grupo' ? grupo : tab === 'Concorrentes' ? concorrentes : tendencias).slice().sort(byDateDesc)
  return (
    <div className="grid gap-6">
      <div className="rounded-3xl bg-card border border-border shadow-card p-4">
        <p className="text-sm text-muted-foreground">Cliente: iFinance Franquadora de BPO • www.ifinance.com.br</p>
      </div>
      <div className="flex items-center gap-2 bg-graphite-900 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm ${tab===t ? 'bg-gold-500 text-white' : 'text-muted-foreground hover:text-foreground hover:bg-graphite-800'}`}>{t}</button>
        ))}
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
