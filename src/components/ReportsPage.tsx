import { useEffect, useState, useMemo } from 'react'
import { SupabaseRest, MATRIZ_CNPJ } from '../services/supabaseRest'
import { ReportFilters } from './ReportFilters'
import { DREPivotTable } from './DREPivotTable'
import { DFCPivotTable } from './DFCPivotTable'
import { LucroBrutoBarChart } from './LucroBrutoBarChart'
import { KPICardsRow } from './KPICardsRow'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { motion } from 'framer-motion'

type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }
type DRERow = { data?: string; conta?: string; natureza?: string; valor?: number }

export function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>(MATRIZ_CNPJ)
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<'Ano' | 'Mês'>('Ano')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedQuarter, setSelectedQuarter] = useState<string>('')
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

  // ✅ Cálculos DRE conforme especificação
  const kpis = useMemo(() => {
    // Agrupar dados por natureza/conta
    const grouped = dreData.reduce((acc, item) => {
      const key = item.natureza || 'outros'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    }, {} as Record<string, DRERow[]>)

    // Calcular Receita Bruta (todas as receitas)
    const receitaBruta = (grouped.receita || []).reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    // Calcular Deduções (impostos, taxas, tarifas)
    const deducoes = dreData
      .filter((r) => {
        const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
        return text.includes('imposto') || text.includes('taxa') || text.includes('tarifa') || text.includes('deducao')
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    // Receita Operacional Líquida
    const receitaLiquida = receitaBruta - deducoes

    // Calcular Despesas (comerciais, administrativas, pessoal)
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

    // Lucro Bruto = Receita Líquida (simplificado, normalmente seria Receita - CMV)
    const lucroBruto = receitaLiquida

    // EBITDA = Lucro Bruto - Despesas Operacionais
    const ebitda = lucroBruto - despesasTotal

    // Outras Receitas/Despesas
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

    // Lucro Líquido = EBITDA + Outras Receitas - Outras Despesas
    const lucroLiquido = ebitda + outrasReceitas - outrasDespesas

    return {
      receitaBruta,
      impostos: deducoes,
      lucroBruto,
      ebitda,
      lucroLiquido,
    }
  }, [dreData])

  return (
    <div className="space-y-6">
      {/* 5 Cards KPI no topo */}
      <KPICardsRow
        receitaBruta={kpis.receitaBruta}
        impostos={kpis.impostos}
        lucroBruto={kpis.lucroBruto}
        ebitda={kpis.ebitda}
        lucroLiquido={kpis.lucroLiquido}
      />

      {/* Layout principal: Filtros + Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtros laterais */}
        <div className="lg:col-span-1">
          <ReportFilters
            selectedPeriod={selectedPeriod}
            selectedCompany={selectedCompany}
            selectedGroup={selectedGroup}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            selectedMonth={selectedMonth}
            onPeriodChange={setSelectedPeriod}
            onCompanyChange={setSelectedCompany}
            onGroupChange={setSelectedGroup}
            onYearChange={setSelectedYear}
            onQuarterChange={setSelectedQuarter}
            onMonthChange={setSelectedMonth}
          />
        </div>

        {/* Conteúdo principal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs DRE/DFC */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'DRE' | 'DFC')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="DRE">DRE</TabsTrigger>
              <TabsTrigger value="DFC">DFC</TabsTrigger>
            </TabsList>

            <TabsContent value="DRE" className="space-y-6 mt-6">
              {/* Tabela Pivot DRE */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <DREPivotTable cnpj={selectedCompany} period={selectedPeriod} />
              </motion.div>

              {/* Gráfico de barras mensal - Lucro Bruto */}
              <LucroBrutoBarChart dreData={dreData} />
            </TabsContent>

            <TabsContent value="DFC" className="space-y-6 mt-6">
              {/* Tabela Pivot DFC */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <DFCPivotTable cnpj={selectedCompany} period={selectedPeriod} />
              </motion.div>

              {/* Gráfico de barras mensal - DFC */}
              <LucroBrutoBarChart dreData={dreData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

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
