import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SupabaseRest } from '../../services/supabaseRest'
import { DREPivotTable } from '../DREPivotTable'
import { LucroBrutoBarChart } from '../LucroBrutoBarChart'
import { DREExportButton } from '../DREExportButton'
import { AnimatedReportCard } from './AnimatedReportCard'
import { DREWaterfallChart } from '../charts/DREWaterfallChart'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedCompanies.length === 0) return

    setLoading(true)
    ;(async () => {
      try {
        if (selectedCompanies.length > 1) {
          // Consolidar múltiplas empresas
          const allDrePromises = selectedCompanies.map((cnpj) =>
            SupabaseRest.getDRE(cnpj)
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
          setDreData(Array.from(dreMap.values()))
        } else {
          const dre = await SupabaseRest.getDRE(selectedCompanies[0])
          const norm = (Array.isArray(dre) ? dre : []).map((r) => ({
            data: r.data,
            conta: r.conta,
            natureza: r.natureza,
            valor: Number(r.valor || 0),
          }))
          setDreData(norm)
        }
      } catch (error) {
        console.error('Erro ao carregar DRE:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCompanies, selectedYear, selectedMonth])

  // Calcular KPIs
  const kpis = useMemo(() => {
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

  const cnpjForCharts =
    selectedCompanies.length > 1 ? selectedCompanies : selectedCompanies[0] || ''

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <AnimatedReportCard
          title="Receita Bruta"
          value={kpis.receitaBruta}
          format="currency"
          trend={kpis.receitaBruta >= 0 ? 'up' : 'down'}
          delay={0}
        />
        <AnimatedReportCard
          title="Receita Líquida"
          value={kpis.receitaLiquida}
          format="currency"
          trend={kpis.receitaLiquida >= 0 ? 'up' : 'down'}
          delay={0.1}
        />
        <AnimatedReportCard
          title="EBITDA"
          value={kpis.ebitda}
          format="currency"
          trend={kpis.ebitda >= 0 ? 'up' : 'down'}
          delay={0.2}
        />
        <AnimatedReportCard
          title="Lucro Líquido"
          value={kpis.lucroLiquido}
          format="currency"
          trend={kpis.lucroLiquido >= 0 ? 'up' : 'down'}
          delay={0.3}
        />
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
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
        <DREPivotTable cnpj={cnpjForCharts} period={period} />
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

      {loading && (
        <div className="card-premium p-4 text-center">
          <p className="text-sm text-muted-foreground">Carregando dados DRE...</p>
        </div>
      )}
    </div>
  )
}

