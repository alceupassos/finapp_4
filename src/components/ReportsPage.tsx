import { useEffect, useState, useMemo } from 'react'
import { SupabaseRest, MATRIZ_CNPJ } from '../services/supabaseRest'
import { ReportFilters } from './ReportFilters'
import { DREPivotTable } from './DREPivotTable'
import { DFCPivotTable } from './DFCPivotTable'
import { MonthlyBarChart } from './MonthlyBarChart'
import { AnimatedKPICard } from './AnimatedKPICard'
import { motion } from 'framer-motion'

type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }
type DRERow = { data?: string; conta?: string; natureza?: string; valor?: number }

export function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>(MATRIZ_CNPJ)
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<'Ano' | 'Mês'>('Ano')
  const [dreData, setDreData] = useState<DRERow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'DRE' | 'DFC'>('DRE')

  useEffect(() => {
    (async () => {
      try {
        const cs = await SupabaseRest.getCompanies() as Company[]
        setCompanies(cs || [])
        if (cs.length > 0) {
          setSelectedCompany(cs[0].cnpj || MATRIZ_CNPJ)
          const uniqueGroups = Array.from(new Set(cs.map(c => c.grupo_empresarial).filter(Boolean))) as string[]
          if (uniqueGroups.length > 0) {
            setSelectedGroup(uniqueGroups[0])
          }
        }
      } catch {
        setError('Falha ao carregar empresas')
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedCompany) return
    setLoading(true)
    ;(async () => {
      try {
        const dre = await SupabaseRest.getDRE(selectedCompany) as any[]
        const norm = (Array.isArray(dre) ? dre : []).map((r) => ({
          data: r.data,
          conta: r.conta,
          natureza: r.natureza,
          valor: Number(r.valor || 0),
        }))
        setDreData(norm)
      } catch {
        setError('Falha ao carregar relatórios')
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCompany])

  // Calcular KPIs a partir dos dados DRE
  const kpis = useMemo(() => {
    let receita = 0
    let impostos = 0
    let despesas = 0
    let outrasReceitas = 0
    let outrasDespesas = 0

    dreData.forEach((r) => {
      const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
      const valor = Number(r.valor || 0)

      if (text.includes('receita') || text.includes('venda')) {
        receita += valor
      } else if (text.includes('imposto') || text.includes('taxa') || text.includes('tarifa')) {
        impostos += valor
      } else if (text.includes('despesa') || text.includes('custo')) {
        despesas += valor
      } else if (text.includes('outras receitas')) {
        outrasReceitas += valor
      } else if (text.includes('outras despesas')) {
        outrasDespesas += valor
      }
    })

    const lucro = receita - impostos - despesas + outrasReceitas - outrasDespesas
    const ebitda = lucro // Simplificado - normalmente seria lucro + depreciação + amortização

    return {
      receita: Math.max(0, receita),
      impostos: Math.max(0, impostos),
      lucro,
      ebitda,
    }
  }, [dreData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="grid gap-6">
      {/* Cards KPI no topo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedKPICard
          title="Receita Total"
          value={formatCurrency(kpis.receita)}
          change={12}
          icon="TrendingUp"
          trend="up"
          color="green"
          delay={0}
        />
        <AnimatedKPICard
          title="Impostos"
          value={formatCurrency(kpis.impostos)}
          change={-5}
          icon="TrendingDown"
          trend="down"
          color="red"
          delay={0.1}
        />
        <AnimatedKPICard
          title="Lucro Líquido"
          value={formatCurrency(kpis.lucro)}
          change={kpis.lucro > 0 ? 15 : -10}
          icon="Wallet"
          trend={kpis.lucro > 0 ? 'up' : 'down'}
          color={kpis.lucro > 0 ? 'gold' : 'red'}
          delay={0.2}
        />
        <AnimatedKPICard
          title="EBITDA"
          value={formatCurrency(kpis.ebitda)}
          change={kpis.ebitda > 0 ? 18 : -8}
          icon="Target"
          trend={kpis.ebitda > 0 ? 'up' : 'down'}
          color={kpis.ebitda > 0 ? 'blue' : 'red'}
          delay={0.3}
        />
      </div>

      {/* Layout principal: Filtros + Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtros laterais */}
        <div className="lg:col-span-1">
          <ReportFilters
            selectedPeriod={selectedPeriod}
            selectedCompany={selectedCompany}
            selectedGroup={selectedGroup}
            onPeriodChange={setSelectedPeriod}
            onCompanyChange={setSelectedCompany}
            onGroupChange={setSelectedGroup}
          />
        </div>

        {/* Conteúdo principal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs DRE/DFC */}
          <div className="flex gap-2 border-b border-graphite-800">
            <button
              onClick={() => setActiveTab('DRE')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'DRE'
                  ? 'text-gold-500 border-b-2 border-gold-500'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              DRE
            </button>
            <button
              onClick={() => setActiveTab('DFC')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'DFC'
                  ? 'text-gold-500 border-b-2 border-gold-500'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              DFC
            </button>
          </div>

          {/* Tabela Pivot */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'DRE' ? (
              <DREPivotTable cnpj={selectedCompany} period={selectedPeriod} />
            ) : (
              <DFCPivotTable cnpj={selectedCompany} period={selectedPeriod} />
            )}
          </motion.div>

          {/* Gráfico de barras mensal */}
          <MonthlyBarChart
            data={dreData}
            title={`Evolução Mensal - ${activeTab === 'DRE' ? 'DRE' : 'DFC'}`}
          />
        </div>
      </div>

      {error && (
        <div className="card-premium p-4 bg-red-500/10 border-red-500/50">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
