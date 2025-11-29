import { useEffect, useMemo, useState } from 'react'
import { SupabaseRest } from '../services/supabaseRest'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type DRERow = { data?: string; conta?: string; natureza?: string; valor?: number }

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ✅ Estrutura hierárquica conforme especificação
function categorizeAccount(conta: string, natureza: string): { category: string; subcategory?: string } {
  const text = `${conta} ${natureza}`.toLowerCase()
  
  // Receita Bruta de Vendas
  if (natureza === 'receita' && (text.includes('venda') || text.includes('produto') || text.includes('servico'))) {
    return { category: 'RECEITA OPERACIONAL BRUTA', subcategory: 'Receita Bruta de Vendas' }
  }
  
  // Impostos
  if (text.includes('imposto') || text.includes('icms') || text.includes('ipi') || text.includes('iss')) {
    return { category: 'DEDUÇÕES DA RECEITA BRUTA', subcategory: 'Impostos' }
  }
  
  // Taxas e Tarifas
  if (text.includes('taxa') || text.includes('tarifa') || text.includes('desconto')) {
    return { category: 'DEDUÇÕES DA RECEITA BRUTA', subcategory: 'Taxas e Tarifas' }
  }
  
  // Despesas Comerciais
  if (text.includes('comercial') || text.includes('vendas') || text.includes('marketing') || text.includes('propaganda')) {
    return { category: 'DESPESAS', subcategory: 'Despesas Comerciais' }
  }
  
  // Despesas Administrativas
  if (text.includes('administrativa') || text.includes('admin') || text.includes('geral') || text.includes('telefonia') || text.includes('correio')) {
    return { category: 'DESPESAS', subcategory: 'Despesas Administrativas' }
  }
  
  // Despesas com Pessoal
  if (text.includes('pessoal') || text.includes('salario') || text.includes('ordenado') || text.includes('folha') || text.includes('inss') || text.includes('fgts')) {
    return { category: 'DESPESAS', subcategory: 'Despesas com Pessoal' }
  }
  
  // Outras categorias
  if (natureza === 'receita') {
    return { category: 'OUTRAS RECEITAS' }
  }
  if (natureza === 'despesa') {
    return { category: 'OUTRAS DESPESAS' }
  }
  
  return { category: 'OUTROS' }
}

interface PivotRow {
  group: string
  months: number[]
  children?: Array<{ conta: string; months: number[] }>
  expanded?: boolean
  isTotal?: boolean
  isSubtotal?: boolean
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
    // Agrupar por categoria e subcategoria
    const byCategory = new Map<string, Map<string, Map<string, number[]>>>()
    
    rows.forEach((r) => {
      const d = r.data ? new Date(r.data) : new Date()
      const m = d.getMonth()
      const { category, subcategory } = categorizeAccount(r.conta || '', r.natureza || '')
      const conta = r.conta || 'Sem conta'
      const valor = r.natureza === 'despesa' ? -Math.abs(Number(r.valor || 0)) : Math.abs(Number(r.valor || 0))

      if (!byCategory.has(category)) {
        byCategory.set(category, new Map())
      }
      const categoryMap = byCategory.get(category)!
      
      const subcatKey = subcategory || conta
      if (!categoryMap.has(subcatKey)) {
        categoryMap.set(subcatKey, new Map())
      }
      const subcatMap = categoryMap.get(subcatKey)!
      
      if (!subcatMap.has(conta)) {
        subcatMap.set(conta, Array(12).fill(0))
      }
      const months = subcatMap.get(conta)!
      months[m] += valor
    })

    // Construir estrutura hierárquica
    const pivotRows: PivotRow[] = []
    
    // 1. ▼ RECEITA OPERACIONAL BRUTA
    const receitaBruta = byCategory.get('RECEITA OPERACIONAL BRUTA')
    if (receitaBruta) {
      const receitaBrutaMonths = Array(12).fill(0)
      const receitaBrutaChildren: Array<{ conta: string; months: number[] }> = []
      
      receitaBruta.forEach((subcatMap, subcat) => {
        subcatMap.forEach((months, conta) => {
          months.forEach((val, idx) => {
            receitaBrutaMonths[idx] += val
          })
          receitaBrutaChildren.push({ conta, months: [...months] })
        })
      })
      
      pivotRows.push({
        group: '▼ RECEITA OPERACIONAL BRUTA',
        months: receitaBrutaMonths,
        children: receitaBrutaChildren,
        expanded: expandedGroups.has('RECEITA OPERACIONAL BRUTA'),
        isSubtotal: true,
      })
    }

    // 2. ▼ (-) DEDUÇÕES DA RECEITA BRUTA
    const deducoes = byCategory.get('DEDUÇÕES DA RECEITA BRUTA')
    if (deducoes) {
      const deducoesMonths = Array(12).fill(0)
      const deducoesChildren: Array<{ conta: string; months: number[] }> = []
      
      deducoes.forEach((subcatMap, subcat) => {
        subcatMap.forEach((months, conta) => {
          months.forEach((val, idx) => {
            deducoesMonths[idx] += val // Já é negativo se for despesa
          })
          deducoesChildren.push({ conta, months: [...months] })
        })
      })
      
      pivotRows.push({
        group: '▼ (-) DEDUÇÕES DA RECEITA BRUTA',
        months: deducoesMonths,
        children: deducoesChildren,
        expanded: expandedGroups.has('DEDUÇÕES DA RECEITA BRUTA'),
        isSubtotal: true,
      })
    }

    // 3. = RECEITA OPERACIONAL LÍQUIDA
    const receitaLiquidaMonths = Array(12).fill(0)
    const receitaBrutaRow = pivotRows.find(r => r.group === '▼ RECEITA OPERACIONAL BRUTA')
    const deducoesRow = pivotRows.find(r => r.group === '▼ (-) DEDUÇÕES DA RECEITA BRUTA')
    receitaBrutaRow?.months.forEach((val, idx) => {
      receitaLiquidaMonths[idx] += val
    })
    deducoesRow?.months.forEach((val, idx) => {
      receitaLiquidaMonths[idx] += val
    })
    pivotRows.push({
      group: '= RECEITA OPERACIONAL LÍQUIDA',
      months: receitaLiquidaMonths,
      isTotal: true,
    })

    // 4. = LUCRO BRUTO
    pivotRows.push({
      group: '= LUCRO BRUTO',
      months: [...receitaLiquidaMonths],
      isTotal: true,
    })

    // 5. ▼ (-) DESPESAS
    const despesas = byCategory.get('DESPESAS')
    if (despesas) {
      const despesasMonths = Array(12).fill(0)
      const despesasChildren: Array<{ conta: string; months: number[] }> = []
      
      despesas.forEach((subcatMap, subcat) => {
        subcatMap.forEach((months, conta) => {
          months.forEach((val, idx) => {
            despesasMonths[idx] += val // Já é negativo
          })
          despesasChildren.push({ conta, months: [...months] })
        })
      })
      
      pivotRows.push({
        group: '▼ (-) DESPESAS',
        months: despesasMonths,
        children: despesasChildren,
        expanded: expandedGroups.has('DESPESAS'),
        isSubtotal: true,
      })
    }

    // 6. = EBITDA
    const ebitdaMonths = Array(12).fill(0)
    receitaLiquidaMonths.forEach((val, idx) => {
      ebitdaMonths[idx] += val
    })
    const despesasRow = pivotRows.find(r => r.group === '▼ (-) DESPESAS')
    despesasRow?.months.forEach((val, idx) => {
      ebitdaMonths[idx] += val
    })
    pivotRows.push({
      group: '= EBITDA',
      months: ebitdaMonths,
      isTotal: true,
    })

    // 7. = LUCRO LÍQUIDO
    pivotRows.push({
      group: '= LUCRO LÍQUIDO',
      months: [...ebitdaMonths],
      isTotal: true,
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
    const abs = Math.abs(value)
    const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return value < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`
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
              <th className="p-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={14}>
                  Carregando...
                </td>
              </tr>
            ) : pivot.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={14}>
                  Sem dados para exibir
                </td>
              </tr>
            ) : (
              pivot.map((row) => (
                <motion.tr
                  key={row.group}
                  className={`border-b border-graphite-800/50 hover:bg-graphite-800/30 transition-colors ${
                    row.isTotal ? 'bg-graphite-900/50' : ''
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td className="p-3">
                    {row.isSubtotal && row.children && row.children.length > 0 ? (
                      <button
                        onClick={() => toggleGroup(row.group)}
                        className="flex items-center gap-2 hover:text-gold-500 transition-colors"
                      >
                        {expandedGroups.has(row.group) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium">{row.group}</span>
                      </button>
                    ) : (
                      <span className={`font-medium ${row.isTotal ? 'text-gold-400' : ''}`}>
                        {row.group}
                      </span>
                    )}
                  </td>
                  {row.months.map((val, idx) => (
                    <td
                      key={idx}
                      className={`p-3 text-right ${
                        row.isTotal 
                          ? 'font-semibold text-gold-400' 
                          : val < 0 
                            ? 'text-red-400' 
                            : 'text-emerald-400'
                      }`}
                    >
                      {formatCurrency(val)}
                    </td>
                  ))}
                  <td
                    className={`p-3 text-right font-semibold ${
                      row.isTotal 
                        ? 'text-gold-400' 
                        : row.months.reduce((a, b) => a + b, 0) < 0 
                          ? 'text-red-400' 
                          : 'text-emerald-400'
                    }`}
                  >
                    {formatCurrency(row.months.reduce((a, b) => a + b, 0))}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>

        {/* Linhas expandidas (children) */}
        <AnimatePresence>
          {pivot.map((row) =>
            expandedGroups.has(row.group) && row.children && row.children.length > 0 ? (
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
                    <td className="p-3 pl-8 text-muted-foreground text-xs">{child.conta}</td>
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
                    <td
                      className={`p-3 text-right text-xs font-medium ${
                        child.months.reduce((a, b) => a + b, 0) < 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatCurrency(child.months.reduce((a, b) => a + b, 0))}
                    </td>
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
