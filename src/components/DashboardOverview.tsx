import { Card, Metric, Text, Grid, Title, BadgeDelta } from "@tremor/react"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { SupabaseRest, MATRIZ_CNPJ } from '../services/supabaseRest'
import { useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '../lib/formatters'

type Period = 'Dia' | 'Semana' | 'Mês' | 'Ano'
type Tx = { data?: string; entrada?: number; saida?: number; status?: string }
type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }

function monthLabel(d: Date) {
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()]
}

export function DashboardOverview({ 
  period = 'Ano', 
  session,
  selectedCompanies = []
}: { 
  period?: Period
  session?: any
  selectedCompanies?: string[]
}) {
  const [rows, setRows] = useState<Tx[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  // Usar empresas selecionadas ou fallback para MATRIZ_CNPJ
  const companiesToLoad = selectedCompanies.length > 0 
    ? selectedCompanies 
    : [MATRIZ_CNPJ]

  // Calcular datas baseadas no período
  const getPeriodDates = (period: Period) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()
    
    let startDate: Date
    let endDate: Date = new Date(year, month, day)
    
    switch (period) {
      case 'Dia':
        startDate = new Date(year, month, day)
        break
      case 'Semana':
        const dayOfWeek = now.getDay()
        startDate = new Date(year, month, day - dayOfWeek)
        break
      case 'Mês':
        startDate = new Date(year, month, 1)
        break
      case 'Ano':
        startDate = new Date(year, 0, 1)
        break
      default:
        startDate = new Date(year, 0, 1)
    }
    
    return { startDate, endDate }
  }

  useEffect(() => {
    if (companiesToLoad.length === 0) return
    setLoading(true)
    ;(async () => {
      try {
        const { startDate, endDate } = getPeriodDates(period)
        const year = startDate.getFullYear()
        const month = period === 'Mês' || period === 'Dia' || period === 'Semana' ? startDate.getMonth() + 1 : undefined
        
        // Carregar dados de todas as empresas selecionadas
        const allDfcPromises = companiesToLoad.map(cnpj => SupabaseRest.getDFC(cnpj, year, month))
        const allDfcResults = await Promise.all(allDfcPromises)
        
        // Consolidar dados de todas as empresas
        const consolidatedRows: Tx[] = []
        allDfcResults.forEach((data: Tx[]) => {
          if (Array.isArray(data)) {
            // Filtrar por período real
            const filtered = data.filter(tx => {
              if (!tx.data) return false
              const txDate = new Date(tx.data)
              if (txDate < startDate || txDate > endDate) return false
              
              const s = String(tx.status || '').toLowerCase()
              if (s.includes('baixado') || s.includes('baixados') || s.includes('renegociado') || s.includes('renegociados')) return false
              if (!s.includes('conciliado')) return false
              return true
            })
            consolidatedRows.push(...filtered)
          }
        })
        
        // Agrupar e somar por data para evitar duplicatas
        const groupedMap = new Map<string, Tx>()
        consolidatedRows.forEach(tx => {
          const key = tx.data || ''
          const existing = groupedMap.get(key)
          if (existing) {
            existing.entrada = (existing.entrada || 0) + (tx.entrada || 0)
            existing.saida = (existing.saida || 0) + (tx.saida || 0)
          } else {
            groupedMap.set(key, { ...tx })
          }
        })
        
        setRows(Array.from(groupedMap.values()))
      } catch (err) {
        setError('Falha ao carregar dados')
        console.error('Erro ao carregar DFC:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [companiesToLoad.join(','), period])

  const { receitaTotal, despesasTotal, lucro } = useMemo(() => {
    const r = rows.reduce((acc, tx) => {
      acc.receitaTotal += Math.abs(Number(tx.entrada || 0))
      acc.despesasTotal += Math.abs(Number(tx.saida || 0))
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
          <Metric>{formatCurrency(Number(k.value))}</Metric>
          <Text className="mt-2 text-sm text-muted-foreground">
            {loading 
              ? 'Carregando...' 
              : companiesToLoad.length === 1
                ? `Empresa ${companiesToLoad[0]}`
                : `${companiesToLoad.length} empresas (Consolidado)`
            }
          </Text>
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
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
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
        <div className="mt-4 text-xs text-muted-foreground">
          {companiesToLoad.length === 1 
            ? `CNPJ ${companiesToLoad[0]}`
            : `${companiesToLoad.length} empresas consolidadas`
          }
        </div>
      </Card>
    </Grid>
  )
}
