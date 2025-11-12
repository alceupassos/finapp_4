import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar, Treemap, Sankey, ScatterChart, Scatter, ZAxis } from 'recharts'

type Row = { id: string; label: string; value: number; children?: Row[] }

const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const sampleSeries = months.map((m, i) => ({ month: m, receita: 50 + i * 4, despesas: 30 + i * 3, saldo: 20 + i * 1 }))

import { loadCompaniesFallback, loadDREFallback, loadDFCFallback } from '../services/dataLoader'
const initialDre: Row[] = []
const initialDfc: Row[] = []

interface AnaliticosModalProps {
  open: boolean
  onClose: () => void
}

export function AnaliticosModal({ open, onClose }: AnaliticosModalProps) {
  const [tab, setTab] = useState<'DRE'|'DFC'|'Mapa'|'Avancadas'>('Mapa')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [grouped, setGrouped] = useState(true)
  const [selected, setSelected] = useState<string[]>(['Grupo Volpe'])
  const [dreRows, setDreRows] = useState<Row[]>(initialDre)
  const [dfcRows, setDfcRows] = useState<Row[]>(initialDfc)
  const rows = tab === 'DRE' ? dreRows : dfcRows
  const [series, setSeries] = useState(sampleSeries)
  const [modalPeriod, setModalPeriod] = useState<'Dia'|'Semana'|'Mês'|'Ano'>('Ano')

  useEffect(() => {
    if (!open) return
    ;(async () => {
      const companies = await loadCompaniesFallback()
      const def = companies[0]?.cnpj || undefined
      const dre = await loadDREFallback(def)
      const dfc = await loadDFCFallback(def)
      const rec = dre.filter((d:any)=>d.valor>0)
      const ded = dre.filter((d:any)=>d.valor<0)
      const receitaTotal = rec.reduce((a:number,b:any)=>a+b.valor,0)
      const deducoesTotal = Math.abs(ded.reduce((a:number,b:any)=>a+b.valor,0))
      setDreRows([
        { id: 'rec', label: 'Receita Bruta', value: receitaTotal, children: rec.map((r:any,idx:number)=>({ id: `r${idx}`, label: r.conta, value: r.valor })) },
        { id: 'ded', label: 'Deduções/Custos', value: deducoesTotal },
        { id: 'luc', label: 'Resultado', value: receitaTotal - deducoesTotal },
      ])
      const entradas = dfc.filter((d:any)=>d.entrada>0)
      const saídas = dfc.filter((d:any)=>d.saida>0)
      const entradasTotal = entradas.reduce((a:number,b:any)=>a+b.entrada,0)
      const saidasTotal = saídas.reduce((a:number,b:any)=>a+b.saida,0)
      setDfcRows([
        { id: 'entrada', label: 'Entradas', value: entradasTotal, children: entradas.map((e:any,i:number)=>({ id:`e${i}`, label: e.descricao, value: e.entrada })) },
        { id: 'saida', label: 'Saídas', value: saidasTotal, children: saídas.map((s:any,i:number)=>({ id:`s${i}`, label: s.descricao, value: s.saida })) },
        { id: 'saldo', label: 'Saldo', value: (dfc[dfc.length-1]?.saldo) ?? (entradasTotal - saidasTotal) },
      ])
      const byMonth: Record<string,{ receita:number; despesas:number; saldo:number }> = {}
      dfc.forEach((d:any)=>{
        const m = new Date(d.data).toLocaleString('pt-BR',{ month:'short' })
        byMonth[m] ||= { receita:0, despesas:0, saldo:d.saldo }
        byMonth[m].receita += d.entrada
        byMonth[m].despesas += d.saida
        byMonth[m].saldo = d.saldo
      })
      setSeries(months.map(m=>({ month:m, receita: byMonth[m]?.receita||0, despesas: byMonth[m]?.despesas||0, saldo: byMonth[m]?.saldo||0 })))
    })()
  }, [open])

  if (!open) return null

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }))
  const toggleCompany = (name: string) => setSelected((s) => s.includes(name) ? s.filter(x => x !== name) : [...s, name])

  return (
    <motion.div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-16 max-w-[1200px] max-h-[85vh] bg-card border border-border rounded-3xl shadow-soft-lg overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Analíticos Dashboard • DRE e DFC (12 meses)</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-graphite-900 rounded-xl p-1">
            {(['Mapa','DRE','DFC','Avancadas'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm ${tab===t ? 'bg-gold-500 text-white' : 'text-muted-foreground hover:text-foreground hover:bg-graphite-800'}`}>{t}</button>
            ))}
          </div>
          <div className="h-8 w-px bg-graphite-800" />
          <div className="flex items-center gap-2">
            <button onClick={() => setGrouped(g => !g)} className="px-3 py-1.5 rounded-lg text-sm bg-info text-info-foreground">
              {grouped ? 'Agrupado' : 'Individual'}
            </button>
            <div className="flex items-center gap-2">
              {['Grupo Volpe','Empresa A','Empresa B','Empresa C'].map((c) => (
                <button key={c} onClick={() => toggleCompany(c)} className={`px-3 py-1.5 rounded-lg text-xs ${selected.includes(c) ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground'}`}>{c}</button>
              ))}
            </div>
            <div className="h-8 w-px bg-graphite-800" />
            <div className="flex items-center gap-2 bg-graphite-900 rounded-xl p-1">
              {(['Dia','Semana','Mês','Ano'] as const).map((p) => (
                <button key={p} onClick={()=>setModalPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs ${modalPeriod===p ? 'bg-gold-500 text-white' : 'text-muted-foreground hover:text-foreground hover:bg-graphite-800'}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        {tab === 'Mapa' && (
          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card-premium">
              <div className="p-4">
                <p className="text-sm text-muted-foreground">Receita vs Despesas • 12 meses</p>
              </div>
              <div className="p-4 pt-0 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={modalPeriod==='Ano' ? series : modalPeriod==='Mês' ? series.slice(-4) : modalPeriod==='Semana' ? series.slice(-2) : series.slice(-1)}>
                    <defs>
                      <linearGradient id="receita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff7a00" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ff7a00" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="despesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(200,200,200,0.15)" vertical={false} />
                    <XAxis dataKey="month" stroke="#bbb" tick={{ fill: '#bbb', fontSize: 12 }} />
                    <YAxis stroke="#bbb" tick={{ fill: '#bbb', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#11161C', border: '1px solid #1B232C' }} />
                    <Legend />
                    <Area type="monotone" dataKey="receita" stroke="#ff7a00" fill="url(#receita)" />
                    <Area type="monotone" dataKey="despesas" stroke="#38bdf8" fill="url(#despesas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card-premium">
              <div className="p-4">
                <p className="text-sm text-muted-foreground">Saldo • 12 meses</p>
              </div>
              <div className="p-4 pt-0 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={modalPeriod==='Ano' ? series : modalPeriod==='Mês' ? series.slice(-4) : modalPeriod==='Semana' ? series.slice(-2) : series.slice(-1)}>
                    <CartesianGrid stroke="rgba(200,200,200,0.15)" vertical={false} />
                    <XAxis dataKey="month" stroke="#bbb" tick={{ fill: '#bbb', fontSize: 12 }} />
                    <YAxis stroke="#bbb" tick={{ fill: '#bbb', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#11161C', border: '1px solid #1B232C' }} />
                    <Legend />
                    <Line type="monotone" dataKey="saldo" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab !== 'Mapa' && (
          <div className="p-6">
            {tab === 'Avancadas' ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="card-premium">
                  <div className="p-4"><p className="text-sm text-muted-foreground">Waterfall DRE</p></div>
                  <div className="p-4 pt-0 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={[{n:'Receita',v:980},{n:'Deduções',v:-120},{n:'Custos',v:-536},{n:'Lucro',v:324}]}> 
                        <CartesianGrid stroke="rgba(200,200,200,0.15)" vertical={false}/>
                        <XAxis dataKey="n" stroke="#bbb" tick={{fill:'#bbb',fontSize:12}}/>
                        <YAxis stroke="#bbb" tick={{fill:'#bbb',fontSize:12}}/>
                        <Tooltip contentStyle={{ background: '#11161C', border: '1px solid #1B232C' }}/>
                        <Bar dataKey="v" fill="#ff7a00" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card-premium">
                  <div className="p-4"><p className="text-sm text-muted-foreground">Treemap DRE por categorias</p></div>
                  <div className="p-4 pt-0 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap 
                        data={[{name:'Serviços',size:650,fill:'#ff7a00'},{name:'Produtos',size:330,fill:'#38bdf8'},{name:'Deduções',size:120,fill:'#10b981'}]}
                        dataKey="size" 
                        stroke="#1B232C" 
                        isAnimationActive={false}
                        content={({ x, y, width, height, name, value, fill }: any) => (
                          <g>
                            <rect x={x} y={y} width={width} height={height} fill={fill} opacity={0.85} />
                            <text x={x+8} y={y+22} fill="#0e0e0e" fontSize={12} fontWeight={600}>{name}</text>
                            <text x={x+8} y={y+40} fill="#0e0e0e" fontSize={11}>{`R$ ${Number(value*1000).toLocaleString('pt-BR')}`}</text>
                          </g>
                        )}
                      />
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card-premium">
                  <div className="p-4"><p className="text-sm text-muted-foreground">Sankey DFC</p></div>
                  <div className="p-4 pt-0 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <Sankey width={600} height={320} data={{nodes:[{name:'Clientes'},{name:'Receitas'},{name:'Fornecedores'},{name:'Saídas'}],links:[{source:0,target:1,value:540},{source:2,target:3,value:360}]}} nodePadding={20} link={{ stroke: '#38bdf8' }} node={{ fill: '#ff7a00' }} />
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card-premium">
                  <div className="p-4"><p className="text-sm text-muted-foreground">Heatmap de Caixa</p></div>
                  <div className="p-4 pt-0 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid stroke="rgba(200,200,200,0.15)" />
                        <XAxis type="category" dataKey="m" stroke="#bbb"/>
                        <YAxis type="category" dataKey="d" stroke="#bbb"/>
                        <ZAxis type="number" dataKey="v" range={[80,400]} />
                        <Tooltip cursor={{ stroke: '#ff7a00' }} />
                        <Scatter data={Array.from({length:72}).map((_,i)=>({m:months[i%12],d:`D${(i%6)+1}`,v:Math.round(20+Math.random()*80)}))} fill="#ff7a00" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-graphite-900">
                    <tr>
                      <th className="text-left p-3">{tab}</th>
                      <th className="text-right p-3">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <>
                        <tr key={r.id} className="border-t border-border">
                          <td className="p-3">
                            {r.children ? (
                              <button onClick={() => toggle(r.id)} className="inline-flex items-center gap-2 text-foreground">
                                {expanded[r.id] ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                                {r.label}
                              </button>
                            ) : (
                              <span>{r.label}</span>
                            )}
                          </td>
                          <td className="p-3 text-right">R$ {r.value.toLocaleString('pt-BR')}</td>
                        </tr>
                        {expanded[r.id] && r.children?.map((c) => (
                          <tr key={c.id} className="border-t border-border bg-graphite-900/40">
                            <td className="p-3 pl-8 text-muted-foreground">{c.label}</td>
                            <td className="p-3 text-right">R$ {c.value.toLocaleString('pt-BR')}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
