import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SupabaseRest } from '../../services/supabaseRest'
import { DREPivotTable } from '../DREPivotTable'
import { LucroBrutoBarChart } from '../LucroBrutoBarChart'
import { DREExportButton } from '../DREExportButton'
import { AnimatedReportCard } from './AnimatedReportCard'
import { PremiumKPICard } from './PremiumKPICard'
import { PeriodFilter, type PeriodMode } from './PeriodFilter'
import { DREWaterfallChart } from '../charts/DREWaterfallChart'
import { DREFullModal } from './DREFullModal'
import { LucroBrutoChart } from '../LucroBrutoChart'
import { MonthlyBarChart } from '../MonthlyBarChart'
import { AnaliticosModal } from '../AnaliticosModal'
import { DREDetailModal } from '../DREDetailModal'

interface DRESectionProps {
  selectedCompanies: string[]
  selectedYear: string
  selectedMonth?: string
  period: 'Ano' | 'Mês'
}

export function DRESection({
  selectedCompanies,
  selectedYear,
  selectedMonth,
  period,
}: DRESectionProps) {
  const [dreData, setDreData] = useState<any[]>([])
  const [dreDataPreviousYear, setDreDataPreviousYear] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [analiticosModalOpen, setAnaliticosModalOpen] = useState(false)
  const [dreDetailModalOpen, setDreDetailModalOpen] = useState(false)
  const [selectedDreRow, setSelectedDreRow] = useState<any>(null)
  const [compareWithPreviousYear, setCompareWithPreviousYear] = useState(false)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('Y')

  // Debug: Log selectedCompanies e outros props
  useEffect(() => {
    console.log('🔍 DRESection - selectedCompanies:', selectedCompanies)
    console.log('🔍 DRESection - selectedYear:', selectedYear)
    console.log('🔍 DRESection - selectedMonth:', selectedMonth)
    console.log('🔍 DRESection - period:', period)
  }, [selectedCompanies, selectedYear, selectedMonth, period])

  // Debug: Log quando modalOpen muda
  useEffect(() => {
    console.log('🔍 DRESection - modalOpen mudou para:', modalOpen)
  }, [modalOpen])

  const handleOpenModal = () => {
    console.log('🔍 DRESection - handleOpenModal chamado')
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    console.log('🔍 DRESection - handleCloseModal chamado')
    setModalOpen(false)
  }

  const handleOpenAnaliticosModal = () => {
    console.log('🔍 DRESection - handleOpenAnaliticosModal chamado')
    setAnaliticosModalOpen(true)
  }

  const handleCloseAnaliticosModal = () => {
    setAnaliticosModalOpen(false)
  }

  const handleOpenDreDetailModal = (row: any) => {
    console.log('🔍 DRESection - handleOpenDreDetailModal chamado com row:', row)
    setSelectedDreRow(row)
    setDreDetailModalOpen(true)
  }

  const handleCloseDreDetailModal = () => {
    setDreDetailModalOpen(false)
    setSelectedDreRow(null)
  }

  useEffect(() => {
    if (selectedCompanies.length === 0) return

    setLoading(true)
    ;(async () => {
      try {
        const year = parseInt(selectedYear) || new Date().getFullYear()
        const month = selectedMonth ? parseInt(selectedMonth.split('-')[1]) : undefined
        const previousYear = year - 1
        
        // Buscar dados do ano atual
        let currentYearData: any[] = []
        if (selectedCompanies.length > 1) {
          const allDrePromises = selectedCompanies.map((cnpj) =>
            SupabaseRest.getDRE(cnpj, year, month)
          )
          const allDreResults = await Promise.all(allDrePromises)

          const dreMap = new Map<string, any>()
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
          currentYearData = Array.from(dreMap.values())
        } else {
          const dre = await SupabaseRest.getDRE(selectedCompanies[0], year, month)
          currentYearData = (Array.isArray(dre) ? dre : []).map((r) => ({
            data: r.data,
            conta: r.conta,
            natureza: r.natureza,
            valor: Number(r.valor || 0),
          }))
        }
        setDreData(currentYearData)

        // Buscar dados do ano anterior se comparar estiver ativado
        if (compareWithPreviousYear) {
          let previousYearData: any[] = []
          if (selectedCompanies.length > 1) {
            const allDrePromisesPrev = selectedCompanies.map((cnpj) =>
              SupabaseRest.getDRE(cnpj, previousYear, month)
            )
            const allDreResultsPrev = await Promise.all(allDrePromisesPrev)

            const dreMapPrev = new Map<string, any>()
            allDreResultsPrev.forEach((dreArray: any[]) => {
              if (Array.isArray(dreArray)) {
                dreArray.forEach((item: any) => {
                  const key = `${item.data || ''}_${item.conta || ''}_${item.natureza || ''}`
                  const existing = dreMapPrev.get(key)
                  if (existing) {
                    existing.valor = (existing.valor || 0) + Number(item.valor || 0)
                  } else {
                    dreMapPrev.set(key, {
                      data: item.data,
                      conta: item.conta,
                      natureza: item.natureza,
                      valor: Number(item.valor || 0),
                    })
                  }
                })
              }
            })
            previousYearData = Array.from(dreMapPrev.values())
          } else {
            const drePrev = await SupabaseRest.getDRE(selectedCompanies[0], previousYear, month)
            previousYearData = (Array.isArray(drePrev) ? drePrev : []).map((r) => ({
              data: r.data,
              conta: r.conta,
              natureza: r.natureza,
              valor: Number(r.valor || 0),
            }))
          }
          setDreDataPreviousYear(previousYearData)
        } else {
          setDreDataPreviousYear([])
        }
      } catch (error) {
        console.error('Erro ao carregar DRE:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCompanies, selectedYear, selectedMonth, period, compareWithPreviousYear])

  // Calcular KPIs (ano atual)
  const kpis = useMemo(() => {
    // Garantir valores padrão mesmo sem dados
    if (!dreData || dreData.length === 0) {
      return {
        receitaBruta: 0,
        receitaLiquida: 0,
        ebitda: 0,
        lucroLiquido: 0,
      }
    }

    const grouped = dreData.reduce(
      (acc, item) => {
        const key = item.natureza || 'outros'
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(item)
        return acc
      },
      {} as Record<string, any[]>
    )

    const receitaBruta =
      (grouped.receita || []).reduce(
        (sum, r) => sum + Math.abs(Number(r.valor || 0)),
        0
      )

    const deducoes = dreData
      .filter((r) => {
        const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
        return (
          text.includes('imposto') ||
          text.includes('taxa') ||
          text.includes('tarifa') ||
          text.includes('deducao')
        )
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const receitaLiquida = receitaBruta - deducoes

    const despesasComerciais = dreData
      .filter((r) => {
        const text = `${r.conta || ''}`.toLowerCase()
        return (
          text.includes('comercial') ||
          text.includes('vendas') ||
          text.includes('marketing')
        )
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const despesasAdministrativas = dreData
      .filter((r) => {
        const text = `${r.conta || ''}`.toLowerCase()
        return (
          text.includes('administrativa') ||
          text.includes('admin') ||
          text.includes('geral')
        )
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const despesasPessoal = dreData
      .filter((r) => {
        const text = `${r.conta || ''}`.toLowerCase()
        return (
          text.includes('pessoal') ||
          text.includes('salario') ||
          text.includes('ordenado') ||
          text.includes('folha')
        )
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const despesasTotal = despesasComerciais + despesasAdministrativas + despesasPessoal
    const lucroBruto = receitaLiquida
    const ebitda = lucroBruto - despesasTotal

    const outrasReceitas = dreData
      .filter((r) => {
        const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
        return (
          r.natureza === 'receita' &&
          (text.includes('financeira') || text.includes('outras'))
        )
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const outrasDespesas = dreData
      .filter((r) => {
        const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
        return (
          r.natureza === 'despesa' &&
          (text.includes('financeira') || text.includes('juros') || text.includes('outras'))
        )
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)

    const lucroLiquido = ebitda + outrasReceitas - outrasDespesas

    return {
      receitaBruta,
      receitaLiquida,
      impostos: deducoes,
      lucroBruto,
      ebitda,
      lucroLiquido,
      despesasTotal,
    }
  }, [dreData])

  // Calcular KPIs do ano anterior para comparação
  const kpisPreviousYear = useMemo(() => {
    if (!compareWithPreviousYear || dreDataPreviousYear.length === 0) return null

    const grouped = dreDataPreviousYear.reduce(
      (acc, item) => {
        const key = item.natureza || 'outros'
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(item)
        return acc
      },
      {} as Record<string, any[]>
    )

    const receitaBruta = (grouped.receita || []).reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)
    const deducoes = dreDataPreviousYear
      .filter((r) => {
        const text = `${r.conta || ''} ${r.natureza || ''}`.toLowerCase()
        return text.includes('imposto') || text.includes('taxa') || text.includes('tarifa') || text.includes('deducao')
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)
    const receitaLiquida = receitaBruta - deducoes
    const despesasTotal = dreDataPreviousYear
      .filter((r) => {
        const text = `${r.conta || ''}`.toLowerCase()
        return text.includes('comercial') || text.includes('vendas') || text.includes('marketing') ||
               text.includes('administrativa') || text.includes('admin') || text.includes('geral') ||
               text.includes('pessoal') || text.includes('salario') || text.includes('ordenado') || text.includes('folha')
      })
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)
    const lucroBruto = receitaLiquida
    const ebitda = lucroBruto - despesasTotal
    const outrasReceitas = dreDataPreviousYear
      .filter((r) => r.natureza === 'receita' && `${r.conta || ''} ${r.natureza || ''}`.toLowerCase().includes('financeira'))
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)
    const outrasDespesas = dreDataPreviousYear
      .filter((r) => r.natureza === 'despesa' && `${r.conta || ''} ${r.natureza || ''}`.toLowerCase().includes('financeira'))
      .reduce((sum, r) => sum + Math.abs(Number(r.valor || 0)), 0)
    const lucroLiquido = ebitda + outrasReceitas - outrasDespesas

    return { receitaBruta, receitaLiquida, ebitda, lucroLiquido }
  }, [dreDataPreviousYear, compareWithPreviousYear])

  // Calcular variação percentual e sparkline data
  const calculateVariation = (current: number, previous: number | null) => {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  const getSparklineData = (kpiName: string) => {
    // Gerar dados mensais para sparkline (últimos 12 meses)
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthData = dreData.filter((item: any) => {
        if (!item.data) return false
        const date = new Date(item.data)
        return date.getMonth() === i
      })

      // Calcular valor do KPI para este mês (simplificado)
      if (kpiName === 'receitaBruta') {
        return monthData.filter((r: any) => r.natureza === 'receita').reduce((sum: number, r: any) => sum + Math.abs(Number(r.valor || 0)), 0)
      }
      if (kpiName === 'ebitda') {
        const receitas = monthData.filter((r: any) => r.natureza === 'receita').reduce((sum: number, r: any) => sum + Math.abs(Number(r.valor || 0)), 0)
        const despesas = monthData.filter((r: any) => r.natureza === 'despesa').reduce((sum: number, r: any) => sum + Math.abs(Number(r.valor || 0)), 0)
        return receitas - despesas
      }
      // Adicionar outros KPIs conforme necessário
      return 0
    })
    return months
  }

  const cnpjForCharts =
    selectedCompanies.length > 1 ? selectedCompanies : selectedCompanies[0] || ''

  // Se não há empresas selecionadas, mostrar mensagem mas ainda renderizar botões
  if (selectedCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card-premium p-6">
          <p className="text-graphite-400 text-center">
            Selecione ao menos uma empresa para visualizar o relatório DRE.
          </p>
        </div>
        {/* Ainda renderizar botões para teste */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-gold-500/20 flex items-center gap-2"
          >
            Ver Completo
          </button>
        </div>
        {/* Modal ainda disponível para teste */}
        <DREFullModal
          open={modalOpen}
          onClose={handleCloseModal}
          dreData={[]}
          selectedCompanies={[]}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Controles */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PeriodFilter
          mode={periodMode}
          onModeChange={setPeriodMode}
          className="flex-1 min-w-[300px]"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={compareWithPreviousYear}
            onChange={(e) => setCompareWithPreviousYear(e.target.checked)}
            className="w-4 h-4 rounded border-graphite-700 bg-graphite-800 text-gold-500 focus:ring-gold-500 focus:ring-2"
          />
          <span className="text-sm text-graphite-300">
            Comparar com {parseInt(selectedYear) - 1}
          </span>
        </label>
      </div>

      {/* KPI Cards Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <PremiumKPICard
          title="Receita Bruta"
          value={kpis.receitaBruta}
          format="currency"
          trend={
            kpisPreviousYear
              ? (kpis.receitaBruta >= kpisPreviousYear.receitaBruta ? 'up' : 'down')
              : (kpis.receitaBruta >= 0 ? 'up' : 'down')
          }
          trendValue={kpisPreviousYear ? calculateVariation(kpis.receitaBruta, kpisPreviousYear.receitaBruta) : undefined}
          trendPeriod={compareWithPreviousYear ? `vs ${parseInt(selectedYear) - 1}` : undefined}
          sparklineData={getSparklineData('receitaBruta')}
          delay={0}
          onShowMore={handleOpenModal}
        />
        <PremiumKPICard
          title="Receita Líquida"
          value={kpis.receitaLiquida}
          format="currency"
          trend={
            kpisPreviousYear
              ? (kpis.receitaLiquida >= kpisPreviousYear.receitaLiquida ? 'up' : 'down')
              : (kpis.receitaLiquida >= 0 ? 'up' : 'down')
          }
          trendValue={kpisPreviousYear ? calculateVariation(kpis.receitaLiquida, kpisPreviousYear.receitaLiquida) : undefined}
          trendPeriod={compareWithPreviousYear ? `vs ${parseInt(selectedYear) - 1}` : undefined}
          delay={0.1}
          onShowMore={handleOpenModal}
        />
        <PremiumKPICard
          title="EBITDA"
          value={kpis.ebitda}
          format="currency"
          trend={
            kpisPreviousYear
              ? (kpis.ebitda >= kpisPreviousYear.ebitda ? 'up' : 'down')
              : (kpis.ebitda >= 0 ? 'up' : 'down')
          }
          trendValue={kpisPreviousYear ? calculateVariation(kpis.ebitda, kpisPreviousYear.ebitda) : undefined}
          trendPeriod={compareWithPreviousYear ? `vs ${parseInt(selectedYear) - 1}` : undefined}
          sparklineData={getSparklineData('ebitda')}
          delay={0.2}
          onShowMore={handleOpenModal}
        />
        <PremiumKPICard
          title="Lucro Líquido"
          value={kpis.lucroLiquido}
          format="currency"
          trend={
            kpisPreviousYear
              ? (kpis.lucroLiquido >= kpisPreviousYear.lucroLiquido ? 'up' : 'down')
              : (kpis.lucroLiquido >= 0 ? 'up' : 'down')
          }
          trendValue={kpisPreviousYear ? calculateVariation(kpis.lucroLiquido, kpisPreviousYear.lucroLiquido) : undefined}
          trendPeriod={compareWithPreviousYear ? `vs ${parseInt(selectedYear) - 1}` : undefined}
          delay={0.3}
          onShowMore={handleOpenModal}
        />
      </div>

      {/* Export Button e Modal */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleOpenAnaliticosModal}
          className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-purple-500/20 flex items-center gap-2"
        >
          Ver Analíticos
        </button>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-gold-500/20 flex items-center gap-2"
        >
          Ver Completo
        </button>
        <DREExportButton
          selectedCompanies={selectedCompanies}
          selectedMonth={selectedMonth || ''}
          period={period}
        />
      </div>

      {/* Waterfall Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Evolução DRE - Waterfall</h3>
        <DREWaterfallChart dreData={dreData} />
      </motion.div>

      {/* Pivot Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">DRE Detalhada</h3>
        <DREPivotTable 
          cnpj={cnpjForCharts} 
          period={period}
          onRowClick={handleOpenDreDetailModal}
        />
      </motion.div>

      {/* Lucro Bruto Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Análise de Lucro Bruto</h3>
        <LucroBrutoBarChart dreData={dreData} />
      </motion.div>

      {/* Lucro Bruto Chart (LucroBrutoChart) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Lucro Bruto Mensal</h3>
        <LucroBrutoChart companyCnpj={Array.isArray(selectedCompanies) ? selectedCompanies[0] : selectedCompanies} />
      </motion.div>

      {/* Monthly Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Evolução Mensal</h3>
        <MonthlyBarChart companyCnpj={Array.isArray(selectedCompanies) ? selectedCompanies[0] : selectedCompanies} />
      </motion.div>

      {loading && (
        <div className="card-premium p-4 text-center">
          <p className="text-sm text-muted-foreground">Carregando dados DRE...</p>
        </div>
      )}

      {/* Modais */}
      <DREFullModal
        open={modalOpen}
        onClose={handleCloseModal}
        dreData={dreData}
        selectedCompanies={selectedCompanies}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />
      <AnaliticosModal
        open={analiticosModalOpen}
        onClose={handleCloseAnaliticosModal}
      />
      {selectedDreRow && (
        <DREDetailModal
          open={dreDetailModalOpen}
          onClose={handleCloseDreDetailModal}
          dreData={dreData.filter((item: any) => {
            // Filtrar dados relacionados à linha selecionada
            if (selectedDreRow.conta) {
              return item.conta === selectedDreRow.conta
            }
            return false
          })}
          selectedMonth={selectedMonth || ''}
          dreMonths={Array.from(new Set(dreData.map((item: any) => {
            if (item.data) {
              const date = new Date(item.data)
              return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            }
            return ''
          }))).filter(Boolean)}
        />
      )}
    </div>
  )
}

