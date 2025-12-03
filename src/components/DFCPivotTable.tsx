import { useEffect, useMemo, useState } from 'react'
import { SupabaseRest } from '../services/supabaseRest'
import { ChevronRight, ChevronDown, ChevronsDown, ChevronsRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type DFCRow = { data?: string; descricao?: string; entrada?: number; saida?: number; saldo?: number }

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface PivotRow {
  category: string
  months: { entrada: number; saida: number; saldo: number }[]
  children?: Array<{ descricao: string; months: { entrada: number; saida: number; saldo: number }[] }>
}

interface DFCPivotTableProps {
  cnpj: string | string[]
  period?: 'Ano' | 'Mês'
}

export function DFCPivotTable({ cnpj, period = 'Ano' }: DFCPivotTableProps) {
  const [rows, setRows] = useState<DFCRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const cnpjs = Array.isArray(cnpj) ? cnpj : [cnpj]
        
        // Se múltiplos CNPJs, carregar e consolidar
        if (cnpjs.length > 1) {
          const allDfcPromises = cnpjs.map(c => SupabaseRest.getDFC(c))
          const allDfcResults = await Promise.all(allDfcPromises)
          
          // Consolidar: agrupar por data/descrição e somar valores
          const dfcMap = new Map<string, DFCRow>()
          allDfcResults.forEach((dfcArray: any[]) => {
            if (Array.isArray(dfcArray)) {
              dfcArray.forEach((item: any) => {
                const key = `${item.data || ''}_${item.descricao || item.category || ''}`
                const existing = dfcMap.get(key)
                if (existing) {
                  existing.entrada = (existing.entrada || 0) + Number(item.entrada || 0)
                  existing.saida = (existing.saida || 0) + Number(item.saida || 0)
                  existing.saldo = (existing.saldo || 0) + Number(item.saldo || 0)
                } else {
                  dfcMap.set(key, {
                    data: item.data,
                    descricao: item.descricao || item.category || 'Lançamento',
                    entrada: Number(item.entrada || 0),
                    saida: Number(item.saida || 0),
                    saldo: Number(item.saldo || 0),
                  })
                }
              })
            }
          })
          const norm = Array.from(dfcMap.values())
          setRows(norm)
        } else {
          // CNPJ único
          const data = await SupabaseRest.getDFC(cnpjs[0]) as any[]
          const norm = (Array.isArray(data) ? data : []).map((r) => ({
            data: r.data,
            descricao: r.descricao || r.category || 'Lançamento',
            entrada: Number(r.entrada || 0),
            saida: Number(r.saida || 0),
            saldo: Number(r.saldo || 0),
          }))
          setRows(norm)
        }
      } catch (e: any) {
        setError('Falha ao carregar DFC')
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [Array.isArray(cnpj) ? cnpj.join(',') : cnpj])

  const pivot = useMemo(() => {
    // Agrupar por categoria e descrição
    const byCategory = new Map<string, Map<string, { entrada: number; saida: number; saldo: number }[]>>()

    rows.forEach((r) => {
      const d = r.data ? new Date(r.data) : new Date()
      const m = d.getMonth()
      const category = r.descricao?.split(' - ')[0] || r.descricao || 'Outros'
      const descricao = r.descricao || 'Lançamento'

      if (!byCategory.has(category)) {
        byCategory.set(category, new Map())
      }
      const categoryMap = byCategory.get(category)!
      if (!categoryMap.has(descricao)) {
        categoryMap.set(descricao, Array(12).fill({ entrada: 0, saida: 0, saldo: 0 }))
      }
      const months = categoryMap.get(descricao)!
      months[m] = {
        entrada: months[m].entrada + Number(r.entrada || 0),
        saida: months[m].saida + Number(r.saida || 0),
        saldo: months[m].saldo + Number(r.saldo || 0),
      }
    })

    // Converter para estrutura de pivot
    const pivotRows: PivotRow[] = Array.from(byCategory.entries()).map(([category, descMap]) => {
      const categoryMonths = Array(12).fill({ entrada: 0, saida: 0, saldo: 0 })
      const children: Array<{ descricao: string; months: { entrada: number; saida: number; saldo: number }[] }> = []

      descMap.forEach((months, descricao) => {
        months.forEach((val, idx) => {
          categoryMonths[idx] = {
            entrada: categoryMonths[idx].entrada + val.entrada,
            saida: categoryMonths[idx].saida + val.saida,
            saldo: categoryMonths[idx].saldo + val.saldo,
          }
        })
        children.push({ descricao, months: [...months] })
      })

      return {
        category,
        months: categoryMonths,
        children,
      }
    })

    return pivotRows
  }, [rows])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const formatCurrency = (value: number) => {
    return `R$ ${Math.round(value).toLocaleString('pt-BR')}`
  }

  const expandAll = () => {
    const allCategories = pivot.map(row => row.category)
    setExpandedCategories(new Set(allCategories))
  }

  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  const allExpanded = pivot.length > 0 && pivot.every(row => expandedCategories.has(row.category))

  return (
    <div className="card-premium p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Fluxo de Caixa (DFC)</h3>
        <div className="flex gap-2">
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-graphite-800 hover:bg-graphite-700 text-xs font-medium transition-colors"
            title={allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
          >
            {allExpanded ? (
              <>
                <ChevronsRight className="w-3 h-3" />
                Recolher Tudo
              </>
            ) : (
              <>
                <ChevronsDown className="w-3 h-3" />
                Expandir Tudo
              </>
            )}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
      
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-graphite-800">
              <th className="p-3 text-left font-semibold">Categoria</th>
              {MONTHS.map((m) => (
                <th key={m} className="p-3 text-right font-semibold" colSpan={3}>
                  {m}
                </th>
              ))}
            </tr>
            <tr className="border-b border-graphite-800">
              <th className="p-3"></th>
              {MONTHS.flatMap((m) => [
                <th key={`${m}-entrada`} className="p-2 text-right text-xs text-muted-foreground">
                  Entrada
                </th>,
                <th key={`${m}-saida`} className="p-2 text-right text-xs text-muted-foreground">
                  Saída
                </th>,
                <th key={`${m}-saldo`} className="p-2 text-right text-xs text-muted-foreground">
                  Saldo
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={37}>
                  Carregando...
                </td>
              </tr>
            ) : pivot.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={37}>
                  Sem dados para exibir
                </td>
              </tr>
            ) : (
              <>
                {pivot.map((row) => (
                  <motion.tr
                    key={row.category}
                    className="border-b border-graphite-800/50 hover:bg-graphite-800/30 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td className="p-3">
                      <button
                        onClick={() => toggleCategory(row.category)}
                        className="flex items-center gap-2 hover:text-gold-500 transition-colors group"
                      >
                        {row.children && row.children.length > 0 ? (
                          <motion.div
                            animate={{ rotate: expandedCategories.has(row.category) ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {expandedCategories.has(row.category) ? (
                              <ChevronDown className="w-4 h-4 text-gold-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-graphite-400 group-hover:text-gold-500" />
                            )}
                          </motion.div>
                        ) : (
                          <span className="w-4 h-4" />
                        )}
                        <span className="font-medium text-sm text-white">{row.category}</span>
                      </button>
                    </td>
                    {row.months.flatMap((month, idx) => [
                      <td key={`${idx}-entrada`} className="p-3 text-right text-emerald-400 font-medium">
                        {formatCurrency(month.entrada)}
                      </td>,
                      <td key={`${idx}-saida`} className="p-3 text-right text-red-400 font-medium">
                        {formatCurrency(month.saida)}
                      </td>,
                      <td key={`${idx}-saldo`} className={`p-3 text-right font-semibold ${
                        month.saldo < 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {formatCurrency(month.saldo)}
                      </td>,
                    ])}
                  </motion.tr>
                ))}
                {/* Linha de totais */}
                {pivot.length > 0 && (
                  <tr className="border-t-2 border-gold-500/30 bg-graphite-900/50">
                    <td className="p-3 font-semibold text-gold-400">Total</td>
                    {Array.from({ length: 12 }, (_, idx) => {
                      const totalEntrada = pivot.reduce((sum, row) => sum + row.months[idx].entrada, 0)
                      const totalSaida = pivot.reduce((sum, row) => sum + row.months[idx].saida, 0)
                      const totalSaldo = pivot.reduce((sum, row) => sum + row.months[idx].saldo, 0)
                      return [
                        <td key={`${idx}-entrada`} className="p-3 text-right text-emerald-400 font-semibold">
                          {formatCurrency(totalEntrada)}
                        </td>,
                        <td key={`${idx}-saida`} className="p-3 text-right text-red-400 font-semibold">
                          {formatCurrency(totalSaida)}
                        </td>,
                        <td key={`${idx}-saldo`} className={`p-3 text-right font-bold text-base ${
                          totalSaldo < 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {formatCurrency(totalSaldo)}
                        </td>,
                      ]
                    }).flat()}
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>

        {/* Linhas expandidas (children) */}
        <AnimatePresence>
          {pivot.map((row) =>
            expandedCategories.has(row.category) && row.children ? (
              <motion.tbody
                key={`${row.category}-children`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {row.children.map((child, idx) => (
                  <tr
                    key={`${row.category}-${child.descricao}-${idx}`}
                    className="border-b border-graphite-800/30 bg-graphite-900/30"
                  >
                    <td className="p-3 pl-12 text-graphite-400 text-xs">{child.descricao}</td>
                    {child.months.flatMap((month, monthIdx) => [
                      <td key={`${monthIdx}-entrada`} className="p-3 text-right text-xs text-emerald-400 font-medium">
                        {formatCurrency(month.entrada)}
                      </td>,
                      <td key={`${monthIdx}-saida`} className="p-3 text-right text-xs text-red-400 font-medium">
                        {formatCurrency(month.saida)}
                      </td>,
                      <td key={`${monthIdx}-saldo`} className={`p-3 text-right text-xs font-semibold ${
                        month.saldo < 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {formatCurrency(month.saldo)}
                      </td>,
                    ])}
                  </tr>
                ))}
              </motion.tbody>
            ) : null
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

