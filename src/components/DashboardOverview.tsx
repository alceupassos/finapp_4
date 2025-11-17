import { Card, Metric, Text, Grid, Title, BadgeDelta } from "@tremor/react"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { SupabaseRest } from '../services/supabaseRest'
import { useEffect, useMemo, useState } from 'react'

type Period = 'Dia' | 'Semana' | 'Mês' | 'Ano'
type Tx = { data?: string; entrada?: number; saida?: number }
type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }

function monthLabel(d: Date) {
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()]
}

export function DashboardOverview({ period = 'Ano', session }: { period?: Period; session?: any }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [cnpj, setCnpj] = useState<string>('')
  const [rows, setRows] = useState<Tx[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const cs = await SupabaseRest.getCompanies() as Company[]
        setCompanies(cs || [])
        // Forçar matriz 0159 como default
        const matrizCnpj = '26888098000159'
        setCnpj(matrizCnpj)
      } catch {
        setError('Falha ao carregar empresas')
      }
    })()
  }, [])

  useEffect(() => {
    if (!cnpj) return
    setLoading(true)
    ;(async () => {
      try {
        const data = await SupabaseRest.getDFC(cnpj) as Tx[]
        setRows(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    })()
  }, [cnpj])

  const { receitaTotal, despesasTotal, lucro } = useMemo(() => {
    const r = rows.reduce((acc, tx) => {
      acc.receitaTotal += Number(tx.entrada || 0)
      acc.despesasTotal += Number(tx.saida || 0)
      return acc
    }, { receitaTotal: 0, despesasTotal: 0 })
    return { ...r, lucro: r.receitaTotal - r.despesasTotal }
  }, [rows])

  const chartData = useMemo(() => {
    const map = new Map<string, { month: string; receita: number; despesas: number }>()
    rows.forEach(tx => {
      const d = tx.data ? new Date(tx.data) : new Date()
      const m = monthLabel(d)
      const obj = map.get(m) || { month: m, receita: 0, despesas: 0 }
      obj.receita += Number(tx.entrada || 0)
      obj.despesas += Number(tx.saida || 0)
      map.set(m, obj)
    })
    const arr = Array.from(map.values())
    if (period === 'Ano') return arr
    if (period === 'Mês') return arr.slice(-1)
    if (period === 'Semana') return arr.slice(-1).map(d => ({ ...d, month: 'Semana' }))
    return arr.slice(-1).map(d => ({ ...d, month: 'Hoje' }))
  }, [rows, period])

  const kpis = [
    { name: "Receita", value: receitaTotal, delta: 0 },
    { name: "Despesas", value: despesasTotal, delta: 0 },
    { name: "Lucro", value: lucro, delta: 0 },
  ]

  return (
    <Grid numItemsSm={1} numItemsMd={2} numItemsLg={3} className="gap-6">
      {kpis.map((k) => (
        <Card key={k.name} decoration="top" decorationColor="orange" className="rounded-3xl bg-card border border-border shadow-card">
          <div className="flex items-center justify-between">
            <Title>{k.name}</Title>
            <BadgeDelta deltaType={k.delta >= 0 ? "moderateIncrease" : "moderateDecrease"}>{k.delta}%</BadgeDelta>
          </div>
          <Metric>R$ {Number(k.value).toLocaleString('pt-BR')}</Metric>
          <Text className="mt-2 text-sm text-muted-foreground">{loading ? 'Carregando...' : `Empresa ${cnpj || ''}`}</Text>
        </Card>
      ))}
      <Card className="rounded-3xl col-span-1 md:col-span-2 bg-card border border-border shadow-card">
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
        <div className="mt-4">
          <label className="text-xs text-muted-foreground">Empresa/CNPJ</label>
          <select value={cnpj} onChange={(e)=>setCnpj(e.target.value)} className="mt-1 px-3 py-2 bg-graphite-900 border border-graphite-800 rounded-md text-sm">
            <option value="">Selecione</option>
            {companies.map(c => (
              <option key={c.cnpj} value={c.cnpj}>{c.cliente_nome} • {c.cnpj}</option>
            ))}
          </select>
        </div>
      </Card>
    </Grid>
  )
}
