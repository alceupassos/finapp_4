import { useEffect, useState, useMemo } from 'react'
import { SupabaseRest, MATRIZ_CNPJ } from '../services/supabaseRest'
import { DREPivotTable } from './DREPivotTable'
import { DFCPivotTable } from './DFCPivotTable'
import { LucroBrutoBarChart } from './LucroBrutoBarChart'
import { KPICardsRow } from './KPICardsRow'
import { HorizontalFilters } from './HorizontalFilters'
import { ChartNavigationTabs, ChartTabId } from './ChartNavigationTabs'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { motion } from 'framer-motion'
import {
  FluxoCaixaBarChart,
  FluxoCaixaLineChart,
  WaterfallChart,
  DonutStatusChart,
  HorizontalBarChart,
  SaldoBancarioChart,
  IndicadoresBarChart,
  FaturamentoLineChart,
  ClientesAnaliseChart,
  ABCParetoChart,
  APagarReceberCards,
} from './charts'

type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }
type DRERow = { data?: string; conta?: string; natureza?: string; valor?: number }

interface ReportsPageProps {
  companies?: Company[];
  selectedCompanies?: string[];
  selectedMonth?: string;
}

export function ReportsPage({ 
  companies: propCompanies = [], 
  selectedCompanies: propSelectedCompanies = [],
  selectedMonth: propSelectedMonth = ''
}: ReportsPageProps = {}) {
  const companies = propCompanies.length > 0 ? propCompanies : []
  const selectedCompanies = propSelectedCompanies.length > 0 ? propSelectedCompanies : [MATRIZ_CNPJ]
  const globalSelectedMonth = propSelectedMonth
  
  const selectedCompany = selectedCompanies.length > 0 ? selectedCompanies[0] : MATRIZ_CNPJ
  
  const [selectedPeriod, setSelectedPeriod] = useState<'Ano' | 'Mês'>('Ano')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>(globalSelectedMonth || '')
  const [selectedQuarter, setSelectedQuarter] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('')
  const [dreData, setDreData] = useState<DRERow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [activeChartTab, setActiveChartTab] = useState<ChartTabId>('fluxo')
  const [activeDreDfcTab, setActiveDreDfcTab] = useState<'DRE' | 'DFC'>('DRE')
  const [indicadorSelecionado, setIndicadorSelecionado] = useState<'margem-bruta' | 'ebitda' | 'margem-liquida'>('margem-bruta')
  const [clienteTipo, setClienteTipo] = useState<'valor' | 'quantidade' | 'ticket-medio'>('valor')

  // Carregar dados quando empresas selecionadas mudarem
  useEffect(() => {
    if (selectedCompanies.length === 0) return
    setLoading(true)
    ;(async () => {
      try {
        if (selectedCompanies.length > 1) {
          const allDrePromises = selectedCompanies.map(cnpj => SupabaseRest.getDRE(cnpj))
          const allDreResults = await Promise.all(allDrePromises)
          
          const dreMap = new Map<string, DRERow>()
          allDreResults.forEach((dreArray: any[]) => {
            if (Array.isArray(dreArray)) {
              dreArray.forEach((item: any) => {
                const key = `${item.data || ''}_${item.conta || ''}_${item.natureza || ''}`
                const existing = dreMap.get(key)
                if (existing) {
                  existing.valor = (existing.valor || 0) + Number(item.valor || 0)
                } else {
                  dreMap.set(key, {
                    data: item.data,
                    conta: item.conta,
                    natureza: item.natureza,
                    valor: Number(item.valor || 0),
                  })
                }
              })
            }
          })
          setDreData(Array.from(dreMap.values()))
        } else {
          const dre = await SupabaseRest.getDRE(selectedCompany) as any[]
          const norm = (Array.isArray(dre) ? dre : []).map((r) => ({
            data: r.data,
            conta: r.conta,
            natureza: r.natureza,
            valor: Number(r.valor || 0),
          }))
          setDreData(norm)
        }
      } catch {
        setError('Falha ao carregar relatórios')
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCompanies, selectedCompany])

  // Cálculos DRE
  const kpis = useMemo(() => {
    const grouped = dreData.reduce((acc, item) => {
      const key = item.natureza || 'outros'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    }, {} as Record<string, DRERow[]>)

    const receitaBruta = (grouped.receita || []).reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const deducoes = dreData
      .filter((r) => {
        const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
        return text.includes('imposto') || text.includes('taxa') || text.includes('tarifa') || text.includes('deducao')
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const receitaLiquida = receitaBruta - deducoes

    const despesasComerciais = dreData
      .filter((r) => {
        const text = `${r.conta || ''}`.toLowerCase()
        return text.includes('comercial') || text.includes('vendas') || text.includes('marketing')
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const despesasAdministrativas = dreData
      .filter((r) => {
        const text = `${r.conta || ''}`.toLowerCase()
        return text.includes('administrativa') || text.includes('admin') || text.includes('geral')
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const despesasPessoal = dreData
      .filter((r) => {
        const text = `${r.conta || ''}`.toLowerCase()
        return text.includes('pessoal') || text.includes('salario') || text.includes('ordenado') || text.includes('folha')
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const despesasTotal = despesasComerciais + despesasAdministrativas + despesasPessoal
    const lucroBruto = receitaLiquida
    const ebitda = lucroBruto - despesasTotal

    const outrasReceitas = dreData
      .filter((r) => {
        const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
        return r.natureza === 'receita' && (text.includes('financeira') || text.includes('outras'))
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const outrasDespesas = dreData
      .filter((r) => {
        const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
        return r.natureza === 'despesa' && (text.includes('financeira') || text.includes('juros') || text.includes('outras'))
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const lucroLiquido = ebitda + outrasReceitas - outrasDespesas

    return {
      receitaBruta,
      impostos: deducoes,
      lucroBruto,
      ebitda,
      lucroLiquido,
    }
  }, [dreData])

  // Dados mockados para gráficos (TODO: integrar com dados reais)
  const fornecedoresData = useMemo(() => [
    { name: 'GUILHERME KUYUMJIAN', value: 5187233 },
    { name: 'FILIPE ANDERY MORENO', value: 5177753 },
    { name: 'RECEITA FEDERAL', value: 3093243 },
    { name: 'GUSTAVO CARVALHO P...', value: 2593711 },
    { name: 'SECRETARIA DO GOVE...', value: 625294 },
  ], [])

  const clientesData = useMemo(() => [
    { name: 'NOURISHFLOW BRASIL...', value: 8000000 },
    { name: 'MANA POKE - S. J. DOS...', value: 462607 },
    { name: 'MANA POKE - VILA MA...', value: 444562 },
    { name: 'MANA POKE - JUNDIAI', value: 355949 },
    { name: 'MANA POKE - SANTANA', value: 335655 },
  ], [])

  const cnpjForCharts = selectedCompanies.length > 1 ? selectedCompanies : selectedCompany

  return (
    <div className="space-y-6">
      {/* Filtros horizontais no topo */}
      <HorizontalFilters
        selectedPeriod={selectedPeriod}
        selectedYear={selectedYear}
        selectedQuarter={selectedQuarter}
        selectedMonth={selectedMonth}
        selectedCategory={selectedCategory}
        selectedBankAccount={selectedBankAccount}
        onPeriodChange={setSelectedPeriod}
        onYearChange={setSelectedYear}
        onQuarterChange={setSelectedQuarter}
        onMonthChange={setSelectedMonth}
        onCategoryChange={setSelectedCategory}
        onBankAccountChange={setSelectedBankAccount}
      />

      {/* KPI Cards */}
      <KPICardsRow
        receitaBruta={kpis.receitaBruta}
        impostos={kpis.impostos}
        lucroBruto={kpis.lucroBruto}
        ebitda={kpis.ebitda}
        lucroLiquido={kpis.lucroLiquido}
      />

      {/* Navegação por tabs de gráficos */}
      <ChartNavigationTabs activeTab={activeChartTab} onTabChange={setActiveChartTab} />

      {/* Conteúdo dinâmico baseado no tab selecionado */}
      <motion.div
        key={activeChartTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeChartTab === 'fluxo' && (
          <div className="space-y-6">
            <FluxoCaixaBarChart cnpj={cnpjForCharts} year={parseInt(selectedYear)} />
            <FluxoCaixaLineChart cnpj={cnpjForCharts} year={parseInt(selectedYear)} />
            <WaterfallChart cnpj={cnpjForCharts} year={parseInt(selectedYear)} />
          </div>
        )}

        {activeChartTab === 'dre-dfc' && (
          <div className="space-y-6">
            <Tabs value={activeDreDfcTab} onValueChange={(v) => setActiveDreDfcTab(v as 'DRE' | 'DFC')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="DRE">DRE</TabsTrigger>
                <TabsTrigger value="DFC">DFC</TabsTrigger>
              </TabsList>

              <TabsContent value="DRE" className="space-y-6">
                <DREPivotTable cnpj={cnpjForCharts} period={selectedPeriod} />
                <LucroBrutoBarChart dreData={dreData} />
              </TabsContent>

              <TabsContent value="DFC" className="space-y-6">
                <DFCPivotTable cnpj={cnpjForCharts} period={selectedPeriod} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {activeChartTab === 'pagar-receber' && (
          <div className="space-y-6">
            <APagarReceberCards cnpj={cnpjForCharts} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DonutStatusChart cnpj={cnpjForCharts} />
              <div className="space-y-6">
                <HorizontalBarChart
                  data={fornecedoresData}
                  title="Valor em Aberto por Fornecedor"
                  color="#ef4444"
                />
                <HorizontalBarChart
                  data={clientesData}
                  title="Valor em Aberto por Cliente"
                  color="#10b981"
                />
              </div>
            </div>
          </div>
        )}

        {activeChartTab === 'bancos' && (
          <div className="space-y-6">
            <SaldoBancarioChart cnpj={cnpjForCharts} />
            <HorizontalBarChart
              data={[
                { name: 'Itaú - Royalties', value: 802007 },
                { name: 'Itaú - Taxa', value: 85663 },
                { name: 'Santander', value: 0 },
              ]}
              title="Saldo por Conta Bancária"
              color="#10b981"
            />
          </div>
        )}

        {activeChartTab === 'indicadores' && (
          <div className="space-y-6">
            <div className="flex gap-2 mb-4">
              {(['margem-bruta', 'ebitda', 'margem-liquida'] as const).map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndicadorSelecionado(ind)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    indicadorSelecionado === ind
                      ? 'bg-gold-500 text-white'
                      : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
                  }`}
                >
                  {ind === 'margem-bruta' ? '% Margem Bruta' : ind === 'ebitda' ? '% EBITDA' : '% Margem Líquida'}
                </button>
              ))}
            </div>
            <IndicadoresBarChart
              cnpj={cnpjForCharts}
              indicador={indicadorSelecionado}
              year={parseInt(selectedYear)}
            />
            <FaturamentoLineChart cnpj={cnpjForCharts} />
            <div className="flex gap-2 mb-4">
              {(['valor', 'quantidade', 'ticket-medio'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setClienteTipo(tipo)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    clienteTipo === tipo
                      ? 'bg-gold-500 text-white'
                      : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
                  }`}
                >
                  {tipo === 'valor' ? 'Valor de Vendas' : tipo === 'quantidade' ? 'Qtd. de Vendas' : 'Valor Méd. Vendas'}
                </button>
              ))}
            </div>
            <ClientesAnaliseChart cnpj={cnpjForCharts} tipo={clienteTipo} />
            <ABCParetoChart cnpj={cnpjForCharts} />
          </div>
        )}
      </motion.div>

      {error && (
        <div className="card-premium p-4 bg-red-500/10 border-red-500/50">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="card-premium p-4 text-center">
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      )}
    </div>
  )
}
