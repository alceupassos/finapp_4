import { useEffect, useMemo, useState } from 'react'
import { SupabaseRest } from '../services/supabaseRest'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type DRERow = { data?: string; conta?: string; natureza?: string; valor?: number }

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const groupMap: { name: string; match: RegExp[] }[] = [
  { name: 'Receitas Operacionais', match: [/vendas/i, /receita/i] },
  { name: 'Deduções', match: [/desconto/i, /taxa/i, /tarifa/i] },
  { name: 'Custos', match: [/custo/i, /cmv/i] },
  { name: 'Despesas Operacionais', match: [/despesa/i, /salario/i, /ordenado/i, /combustivel/i, /frete/i, /correio/i] },
  { name: 'Outras Receitas', match: [/outras receitas/i, /obtidos/i] },
  { name: 'Outras Despesas', match: [/outras despesas/i, /concedido/i, /juros/i] },
]

function resolveGroup(r: DRERow): string {
  const text = `${r.conta || ''} ${r.natureza || ''}`
  for (const g of groupMap) {
    if (g.match.some((m) => m.test(text))) return g.name
  }
  return 'Outros'
}

interface PivotRow {
  group: string
  months: number[]
  children?: Array<{ conta: string; months: number[] }>
  expanded?: boolean
}

interface DREPivotTableProps {
  cnpj: string
  period?: 'Ano' | 'Mês'
}

export function DREPivotTable({ cnpj, period = 'Ano' }: DREPivotTableProps) {
  const [rows, setRows] = useState<DRERow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    (async () => {
      try {
        const data = await SupabaseRest.getDRE(cnpj) as any[]
        const norm = (Array.isArray(data) ? data : []).map((r) => ({
          data: r.data,
          conta: r.conta,
          natureza: r.natureza,
          valor: Number(r.valor || 0),
        }))
        setRows(norm)
      } catch (e: any) {
        setError('Falha ao carregar DRE')
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [cnpj])

  const pivot = useMemo(() => {
    // Agrupar por grupo e conta
    const byGroup = new Map<string, Map<string, number[]>>()

    rows.forEach((r) => {
      const d = r.data ? new Date(r.data) : new Date()
      const m = d.getMonth()
      const group = resolveGroup(r)
      const conta = r.conta || 'Sem conta'

      if (!byGroup.has(group)) {
        byGroup.set(group, new Map())
      }
      const groupMap = byGroup.get(group)!
      if (!groupMap.has(conta)) {
        groupMap.set(conta, Array(12).fill(0))
      }
      const months = groupMap.get(conta)!
      months[m] += Number(r.valor || 0)
    })

    // Converter para estrutura de pivot
    const pivotRows: PivotRow[] = Array.from(byGroup.entries()).map(([group, contasMap]) => {
      const groupMonths = Array(12).fill(0)
      const children: Array<{ conta: string; months: number[] }> = []

      contasMap.forEach((months, conta) => {
        months.forEach((val, idx) => {
          groupMonths[idx] += val
        })
        children.push({ conta, months: [...months] })
      })

      return {
        group,
        months: groupMonths,
        children,
        expanded: expandedGroups.has(group),
      }
    })

    return pivotRows
  }, [rows, expandedGroups])

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(group)) {
      newExpanded.delete(group)
    } else {
      newExpanded.add(group)
    }
    setExpandedGroups(newExpanded)
  }

  const formatCurrency = (value: number) => {
    return `R$ ${Math.round(value).toLocaleString('pt-BR')}`
  }

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold mb-4">DRE Consolidada</h3>
      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
      
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-graphite-800">
              <th className="p-3 text-left font-semibold">Grupo/Conta</th>
              {MONTHS.map((m) => (
                <th key={m} className="p-3 text-right font-semibold">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={13}>
                  Carregando...
                </td>
              </tr>
            ) : pivot.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={13}>
                  Sem dados para exibir
                </td>
              </tr>
            ) : (
              pivot.map((row) => (
                <motion.tr
                  key={row.group}
                  className="border-b border-graphite-800/50 hover:bg-graphite-800/30 transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td className="p-3">
                    <button
                      onClick={() => toggleGroup(row.group)}
                      className="flex items-center gap-2 hover:text-gold-500 transition-colors"
                    >
                      {row.children && row.children.length > 0 ? (
                        expandedGroups.has(row.group) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )
                      ) : (
                        <span className="w-4 h-4" />
                      )}
                      <span className="font-medium">{row.group}</span>
                    </button>
                  </td>
                  {row.months.map((val, idx) => (
                    <td
                      key={idx}
                      className={`p-3 text-right ${
                        val < 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatCurrency(val)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>

        {/* Linhas expandidas (children) */}
        <AnimatePresence>
          {pivot.map((row) =>
            expandedGroups.has(row.group) && row.children ? (
              <motion.tbody
                key={`${row.group}-children`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {row.children.map((child, idx) => (
                  <tr
                    key={`${row.group}-${child.conta}-${idx}`}
                    className="border-b border-graphite-800/30 bg-graphite-900/30"
                  >
                    <td className="p-3 pl-8 text-muted-foreground">{child.conta}</td>
                    {child.months.map((val, monthIdx) => (
                      <td
                        key={monthIdx}
                        className={`p-3 text-right text-xs ${
                          val < 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {formatCurrency(val)}
                      </td>
                    ))}
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

