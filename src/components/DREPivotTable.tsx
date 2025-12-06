import { useEffect, useMemo, useState } from 'react'
import { SupabaseRest } from '../services/supabaseRest'
import { ChevronRight, ChevronDown, ChevronsDown, ChevronsRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useReactTable,
  getCoreRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
  GroupingState,
  ExpandedState,
} from '@tanstack/react-table'

type DRERow = { data?: string; conta?: string; natureza?: string; valor?: number }

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Estrutura hierárquica conforme especificação
function categorizeAccount(conta: string, natureza: string): { category: string; subcategory?: string } {
  const text = `${conta} ${natureza}`.toLowerCase()
  
  if (natureza === 'receita' && (text.includes('venda') || text.includes('produto') || text.includes('servico'))) {
    return { category: 'RECEITA OPERACIONAL BRUTA', subcategory: 'Receita Bruta de Vendas' }
  }
  
  if (text.includes('imposto') || text.includes('icms') || text.includes('ipi') || text.includes('iss')) {
    return { category: 'DEDUÇÕES DA RECEITA BRUTA', subcategory: 'Impostos' }
  }
  
  if (text.includes('taxa') || text.includes('tarifa') || text.includes('desconto')) {
    return { category: 'DEDUÇÕES DA RECEITA BRUTA', subcategory: 'Taxas e Tarifas' }
  }
  
  if (text.includes('comercial') || text.includes('vendas') || text.includes('marketing') || text.includes('propaganda')) {
    return { category: 'DESPESAS', subcategory: 'Despesas Comerciais' }
  }
  
  if (text.includes('administrativa') || text.includes('admin') || text.includes('geral') || text.includes('telefonia') || text.includes('correio')) {
    return { category: 'DESPESAS', subcategory: 'Despesas Administrativas' }
  }
  
  if (text.includes('pessoal') || text.includes('salario') || text.includes('ordenado') || text.includes('folha') || text.includes('inss') || text.includes('fgts')) {
    return { category: 'DESPESAS', subcategory: 'Despesas com Pessoal' }
  }
  
  if (natureza === 'receita') {
    return { category: 'OUTRAS RECEITAS' }
  }
  if (natureza === 'despesa') {
    return { category: 'OUTRAS DESPESAS' }
  }
  
  return { category: 'OUTROS' }
}

interface TableRow {
  id: string
  group: string
  conta?: string
  months: number[]
  total: number
  isGroup: boolean
  isTotal: boolean
  isSubtotal: boolean
  level: number
  children?: TableRow[]
}

interface DREPivotTableProps {
  cnpj: string | string[]
  period?: 'Ano' | 'Mês'
  onRowClick?: (row: any) => void
}

export function DREPivotTable({ cnpj, period = 'Ano', onRowClick }: DREPivotTableProps) {
  const [rows, setRows] = useState<DRERow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [grouping, setGrouping] = useState<GroupingState>(['group'])
  const [expanded, setExpanded] = useState<ExpandedState>({})

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const cnpjs = Array.isArray(cnpj) ? cnpj : [cnpj]
        
        if (cnpjs.length > 1) {
          const allDrePromises = cnpjs.map(c => SupabaseRest.getDRE(c))
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
          setRows(Array.from(dreMap.values()))
        } else {
          const data = await SupabaseRest.getDRE(cnpjs[0]) as any[]
          const norm = (Array.isArray(data) ? data : []).map((r) => ({
            data: r.data,
            conta: r.conta,
            natureza: r.natureza,
            valor: Number(r.valor || 0),
          }))
          setRows(norm)
        }
      } catch (e: any) {
        setError('Falha ao carregar DRE')
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [Array.isArray(cnpj) ? cnpj.join(',') : cnpj])

  const tableData = useMemo(() => {
    const byCategory = new Map<string, Map<string, Map<string, number[]>>>()
    
    rows.forEach((r) => {
      const d = r.data ? new Date(r.data) : new Date()
      const m = d.getMonth()
      const { category, subcategory } = categorizeAccount(r.conta || '', r.natureza || '')
      
      if (!byCategory.has(category)) {
        byCategory.set(category, new Map())
      }
      const categoryMap = byCategory.get(category)!
      
      const subcatKey = subcategory || 'Outros'
      if (!categoryMap.has(subcatKey)) {
        categoryMap.set(subcatKey, new Map())
      }
      const subcatMap = categoryMap.get(subcatKey)!
      
      const contaKey = r.conta || 'Conta'
      if (!subcatMap.has(contaKey)) {
        subcatMap.set(contaKey, Array(12).fill(0))
      }
      const months = subcatMap.get(contaKey)!
      months[m] += Number(r.valor || 0)
    })

    const tableRows: TableRow[] = []
    
    // 1. RECEITA OPERACIONAL BRUTA
    const receitaBruta = byCategory.get('RECEITA OPERACIONAL BRUTA')
    if (receitaBruta) {
      const receitaBrutaMonths = Array(12).fill(0)
      const receitaBrutaChildren: TableRow[] = []
      
      receitaBruta.forEach((subcatMap, subcat) => {
        const subcatMonths = Array(12).fill(0)
        const subcatChildren: TableRow[] = []
        
        subcatMap.forEach((months, conta) => {
          months.forEach((val, idx) => {
            subcatMonths[idx] += val
            receitaBrutaMonths[idx] += val
          })
          subcatChildren.push({
            id: `receita-${subcat}-${conta}`,
            group: subcat,
            conta,
            months: [...months],
            total: months.reduce((a, b) => a + b, 0),
            isGroup: false,
            isTotal: false,
            isSubtotal: false,
            level: 2,
          })
        })
        
        receitaBrutaChildren.push({
          id: `receita-${subcat}`,
          group: subcat,
          months: subcatMonths,
          total: subcatMonths.reduce((a, b) => a + b, 0),
          isGroup: true,
          isTotal: false,
          isSubtotal: true,
          level: 1,
          children: subcatChildren,
        } as any)
      })
      
      tableRows.push({
        id: 'receita-bruta',
        group: 'RECEITA OPERACIONAL BRUTA',
        months: receitaBrutaMonths,
        total: receitaBrutaMonths.reduce((a, b) => a + b, 0),
        isGroup: true,
        isTotal: false,
        isSubtotal: true,
        level: 0,
        children: receitaBrutaChildren,
      } as any)
    }

    // 2. DEDUÇÕES DA RECEITA BRUTA
    const deducoes = byCategory.get('DEDUÇÕES DA RECEITA BRUTA')
    if (deducoes) {
      const deducoesMonths = Array(12).fill(0)
      const deducoesChildren: TableRow[] = []
      
      deducoes.forEach((subcatMap, subcat) => {
        const subcatMonths = Array(12).fill(0)
        subcatMap.forEach((months) => {
          months.forEach((val, idx) => {
            subcatMonths[idx] += val
            deducoesMonths[idx] += val
          })
        })
        deducoesChildren.push({
          id: `deducoes-${subcat}`,
          group: subcat,
          months: subcatMonths,
          total: subcatMonths.reduce((a, b) => a + b, 0),
          isGroup: false,
          isTotal: false,
          isSubtotal: false,
          level: 1,
        })
      })
      
      tableRows.push({
        id: 'deducoes',
        group: '(-) DEDUÇÕES DA RECEITA BRUTA',
        months: deducoesMonths,
        total: deducoesMonths.reduce((a, b) => a + b, 0),
        isGroup: true,
        isTotal: false,
        isSubtotal: true,
        level: 0,
        children: deducoesChildren,
      } as any)
    }

    // 3. = RECEITA OPERACIONAL LÍQUIDA
    const receitaLiquidaMonths = Array(12).fill(0)
    const receitaBrutaRow = tableRows.find(r => r.id === 'receita-bruta')
    const deducoesRow = tableRows.find(r => r.id === 'deducoes')
    receitaBrutaRow?.months.forEach((val, idx) => {
      receitaLiquidaMonths[idx] += val
    })
    deducoesRow?.months.forEach((val, idx) => {
      receitaLiquidaMonths[idx] -= Math.abs(val)
    })
    tableRows.push({
      id: 'receita-liquida',
      group: '= RECEITA OPERACIONAL LÍQUIDA',
      months: receitaLiquidaMonths,
      total: receitaLiquidaMonths.reduce((a, b) => a + b, 0),
      isGroup: false,
      isTotal: true,
      isSubtotal: false,
      level: 0,
    })

    // 4. DESPESAS
    const despesas = byCategory.get('DESPESAS')
    if (despesas) {
      const despesasMonths = Array(12).fill(0)
      const despesasChildren: TableRow[] = []
      
      despesas.forEach((subcatMap, subcat) => {
        const subcatMonths = Array(12).fill(0)
        const subcatChildren: TableRow[] = []
        
        subcatMap.forEach((months, conta) => {
          months.forEach((val, idx) => {
            subcatMonths[idx] += val
            despesasMonths[idx] += val
          })
          subcatChildren.push({
            id: `despesas-${subcat}-${conta}`,
            group: subcat,
            conta,
            months: [...months],
            total: months.reduce((a, b) => a + b, 0),
            isGroup: false,
            isTotal: false,
            isSubtotal: false,
            level: 2,
          })
        })
        
        despesasChildren.push({
          id: `despesas-${subcat}`,
          group: subcat,
          months: subcatMonths,
          total: subcatMonths.reduce((a, b) => a + b, 0),
          isGroup: true,
          isTotal: false,
          isSubtotal: true,
          level: 1,
          children: subcatChildren,
        } as any)
      })
      
      tableRows.push({
        id: 'despesas',
        group: '▼ (-) DESPESAS',
        months: despesasMonths,
        total: despesasMonths.reduce((a, b) => a + b, 0),
        isGroup: true,
        isTotal: false,
        isSubtotal: true,
        level: 0,
        children: despesasChildren,
      } as any)
    }

    // 5. = EBITDA
    const ebitdaMonths = Array(12).fill(0)
    receitaLiquidaMonths.forEach((val, idx) => {
      ebitdaMonths[idx] += val
    })
    const despesasRow = tableRows.find(r => r.id === 'despesas')
    despesasRow?.months.forEach((val, idx) => {
      ebitdaMonths[idx] += val
    })
    tableRows.push({
      id: 'ebitda',
      group: '= EBITDA',
      months: ebitdaMonths,
      total: ebitdaMonths.reduce((a, b) => a + b, 0),
      isGroup: false,
      isTotal: true,
      isSubtotal: false,
      level: 0,
    })

    // 6. = LUCRO LÍQUIDO
    tableRows.push({
      id: 'lucro-liquido',
      group: '= LUCRO LÍQUIDO',
      months: [...ebitdaMonths],
      total: ebitdaMonths.reduce((a, b) => a + b, 0),
      isGroup: false,
      isTotal: true,
      isSubtotal: false,
      level: 0,
    })

    return tableRows
  }, [rows])

  const columns = useMemo(() => [
    {
      accessorKey: 'group',
      header: 'Grupo/Conta',
      cell: ({ row, getValue }: any) => {
        const isExpanded = row.getIsExpanded()
        const hasChildren = row.original.children && row.original.children.length > 0
        
        const level = row.original.level || 0
        const indentSize = level * 20
        
        return (
          <div className="flex items-center gap-2" style={{ paddingLeft: `${indentSize}px` }}>
            {hasChildren ? (
              <button
                onClick={() => row.toggleExpanded()}
                className="flex items-center gap-2 hover:text-gold-500 transition-colors group"
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gold-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-graphite-400 group-hover:text-gold-500" />
                  )}
                </motion.div>
                <span className={`font-medium transition-colors ${
                  row.original.isTotal 
                    ? 'text-gold-400 text-base' 
                    : level === 0 
                      ? 'text-white text-sm' 
                      : level === 1 
                        ? 'text-graphite-200 text-sm' 
                        : 'text-graphite-400 text-xs'
                }`}>
                  {getValue()}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4" /> {/* Spacer for alignment */}
                <span className={`${
                  row.original.isTotal 
                    ? 'font-semibold text-gold-400 text-base' 
                    : row.original.conta 
                      ? 'text-sm text-graphite-400' 
                      : 'font-medium text-graphite-300 text-sm'
                }`}>
                  {row.original.conta || getValue()}
                </span>
              </div>
            )}
          </div>
        )
      },
    },
    ...MONTHS.map((month, idx) => ({
      id: `month-${idx}`,
      header: month,
      cell: ({ row }: any) => {
        const value = row.original.months[idx] || 0
        return (
          <div className={`text-right ${
            row.original.isTotal 
              ? 'font-semibold text-gold-400' 
              : value < 0 
                ? 'text-red-400' 
                : 'text-emerald-400'
          }`}>
            {formatCurrency(value)}
          </div>
        )
      },
    })),
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }: any) => {
        const total = row.original.total || 0
        return (
          <div className={`text-right font-semibold ${
            row.original.isTotal 
              ? 'text-gold-400' 
              : total < 0 
                ? 'text-red-400' 
                : 'text-emerald-400'
          }`}>
            {formatCurrency(total)}
          </div>
        )
      },
    },
  ], [])

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      grouping,
      expanded,
    },
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row: any) => row.children,
  })

  const formatCurrency = (value: number) => {
    const abs = Math.abs(value)
    const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return value < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`
  }

  const expandAll = () => {
    const allIds = tableData.map(row => row.id)
    const newExpanded: ExpandedState = {}
    allIds.forEach(id => {
      newExpanded[id] = true
    })
    setExpanded(newExpanded)
  }

  const collapseAll = () => {
    setExpanded({})
  }

  const allExpanded = useMemo(() => {
    return tableData.every(row => {
      if (row.children && row.children.length > 0) {
        return expanded[row.id] === true
      }
      return true
    })
  }, [expanded, tableData])

  return (
    <div className="card-premium p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">DRE Consolidada</h3>
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
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-graphite-800">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="p-3 text-left font-semibold"
                    style={header.id.startsWith('month-') || header.id === 'total' ? { textAlign: 'right' } : {}}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={14}>
                  Carregando...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={14}>
                  Sem dados para exibir
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => {
                const isExpanded = row.getIsExpanded()
                const hasChildren = row.original.children && row.original.children.length > 0
                
                return (
                  <>
                    <motion.tr
                      key={row.id}
                      className={`border-b border-graphite-800/50 hover:bg-graphite-800/30 transition-colors ${
                        row.original.isTotal ? 'bg-graphite-900/50' : ''
                      } ${onRowClick && !row.original.isTotal && !row.original.isGroup ? 'cursor-pointer' : ''}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => {
                        if (onRowClick && !row.original.isTotal && !row.original.isGroup && row.original.conta) {
                          onRowClick(row.original)
                        }
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="p-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                    {isExpanded && hasChildren && (
                      <AnimatePresence>
                        {row.original.children?.map((child: TableRow) => (
                          <motion.tr
                            key={child.id}
                            className="border-b border-graphite-800/30 hover:bg-graphite-800/20 transition-colors"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <td className="p-3 pl-8">
                              <span className="text-sm text-slate-400">{child.conta || child.group}</span>
                            </td>
                            {child.months.map((val, idx) => (
                              <td
                                key={idx}
                                className={`p-3 text-right ${
                                  val < 0 ? 'text-red-400' : 'text-emerald-400'
                                }`}
                              >
                                {formatCurrency(val)}
                              </td>
                            ))}
                            <td className={`p-3 text-right font-semibold ${
                              child.total < 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                              {formatCurrency(child.total)}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
