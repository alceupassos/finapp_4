import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ChevronRight, ChevronDown, Search, Filter } from 'lucide-react'
import { formatCurrency } from '../../lib/formatters'
import * as XLSX from 'xlsx'
import * as Tooltip from '@radix-ui/react-tooltip'

interface DREFullModalProps {
  open: boolean
  onClose: () => void
  dreData: Array<{ data?: string; conta?: string; natureza?: string; valor?: number }>
  selectedCompanies: string[]
  selectedYear: string
  selectedMonth?: string
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Categorizar contas em grupos hierárquicos
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
  
  if (text.includes('comercial') || text.includes('vendas') || text.includes('marketing')) {
    return { category: 'DESPESAS', subcategory: 'Despesas Comerciais' }
  }
  
  if (text.includes('administrativa') || text.includes('admin') || text.includes('geral')) {
    return { category: 'DESPESAS', subcategory: 'Despesas Administrativas' }
  }
  
  if (text.includes('pessoal') || text.includes('salario') || text.includes('ordenado') || text.includes('folha')) {
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

export function DREFullModal({
  open,
  onClose,
  dreData,
  selectedCompanies,
  selectedYear,
  selectedMonth,
}: DREFullModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNatureza, setFilterNatureza] = useState<string>('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set())

  // Processar dados em estrutura hierárquica
  const processedData = useMemo(() => {
    const categoryMap = new Map<string, Map<string, Map<string, { months: number[]; total: number }>>>()
    
    dreData.forEach(item => {
      if (!item.data || !item.conta) return
      
      const date = new Date(item.data)
      const month = date.getMonth()
      const year = date.getFullYear()
      
      // Filtrar por ano/mês se necessário
      if (year.toString() !== selectedYear) return
      if (selectedMonth) {
        const monthStr = selectedMonth.split('-')[1]
        if (String(month + 1).padStart(2, '0') !== monthStr) return
      }
      
      const { category, subcategory } = categorizeAccount(item.conta, item.natureza || '')
      const valor = Number(item.valor || 0)
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map())
      }
      const subcategoryMap = categoryMap.get(category)!
      
      const subcatKey = subcategory || 'Geral'
      if (!subcategoryMap.has(subcatKey)) {
        subcategoryMap.set(subcatKey, new Map())
      }
      const accountMap = subcategoryMap.get(subcatKey)!
      
      const accountKey = item.conta
      if (!accountMap.has(accountKey)) {
        accountMap.set(accountKey, { months: Array(12).fill(0), total: 0 })
      }
      const account = accountMap.get(accountKey)!
      
      account.months[month] += valor
      account.total += valor
    })
    
    // Converter para estrutura hierárquica
    const result: Array<{
      category: string
      subcategories: Array<{
        subcategory: string
        accounts: Array<{
          conta: string
          months: number[]
          total: number
        }>
        total: number
      }>
      total: number
    }> = []
    
    categoryMap.forEach((subcategoryMap, category) => {
      const subcategories: Array<{
        subcategory: string
        accounts: Array<{ conta: string; months: number[]; total: number }>
        total: number
      }> = []
      
      subcategoryMap.forEach((accountMap, subcategory) => {
        const accounts: Array<{ conta: string; months: number[]; total: number }> = []
        let subtotal = 0
        
        accountMap.forEach((account, conta) => {
          // Filtrar por busca
          if (searchTerm && !conta.toLowerCase().includes(searchTerm.toLowerCase())) return
          // Filtrar por natureza
          if (filterNatureza) {
            const natureza = dreData.find(d => d.conta === conta)?.natureza || ''
            if (natureza !== filterNatureza) return
          }
          
          accounts.push({ conta, ...account })
          subtotal += account.total
        })
        
        if (accounts.length > 0) {
          subcategories.push({ subcategory, accounts, total: subtotal })
        }
      })
      
      const categoryTotal = subcategories.reduce((sum, sub) => sum + sub.total, 0)
      if (subcategories.length > 0) {
        result.push({ category, subcategories, total: categoryTotal })
      }
    })
    
    return result.sort((a, b) => {
      // Ordem: Receitas primeiro, depois Deduções, depois Despesas
      const order: Record<string, number> = {
        'RECEITA OPERACIONAL BRUTA': 1,
        'DEDUÇÕES DA RECEITA BRUTA': 2,
        'DESPESAS': 3,
        'OUTRAS RECEITAS': 4,
        'OUTRAS DESPESAS': 5,
        'OUTROS': 6,
      }
      return (order[a.category] || 99) - (order[b.category] || 99)
    })
  }, [dreData, selectedYear, selectedMonth, searchTerm, filterNatureza])

  const toggleGroup = (category: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleSubgroup = (key: string) => {
    const newExpanded = new Set(expandedSubgroups)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedSubgroups(newExpanded)
  }

  const exportToExcel = () => {
    const header = ['Categoria', 'Subcategoria', 'Conta', ...MONTHS, 'Total']
    const rows: any[] = []
    
    processedData.forEach(cat => {
      cat.subcategories.forEach(sub => {
        sub.accounts.forEach(acc => {
          rows.push([
            cat.category,
            sub.subcategory,
            acc.conta,
            ...acc.months,
            acc.total,
          ])
        })
      })
    })
    
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'DRE')
    XLSX.writeFile(wb, `DRE_${selectedYear}${selectedMonth ? '_' + selectedMonth : ''}.xlsx`)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-graphite-950 border border-graphite-800 rounded-2xl shadow-2xl w-[95vw] h-[90vh] flex flex-col"
        >
          {/* Header - Sticky with blur backdrop */}
          <div className="p-4 border-b border-graphite-800 flex items-center justify-between flex-shrink-0 bg-graphite-950/95 backdrop-blur-sm sticky top-0 z-20 shadow-lg">
            <div>
              <h2 className="text-lg font-bold text-white">DRE Completo</h2>
              <p className="text-xs text-graphite-400">
                {selectedCompanies.length === 1 
                  ? `Empresa: ${selectedCompanies[0]}` 
                  : `${selectedCompanies.length} empresas (Consolidado)`
                } • Ano: {selectedYear}
                {selectedMonth && ` • Mês: ${selectedMonth}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                className="px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-105 shadow-lg shadow-gold-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Excel
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-graphite-800 hover:bg-graphite-700 text-white transition-all hover:scale-110"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="p-3 border-b border-graphite-800 flex items-center gap-3 flex-shrink-0 bg-graphite-900/50">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-400" />
              <input
                type="text"
                placeholder="Buscar conta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-graphite-800 border border-graphite-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-graphite-400" />
              <select
                value={filterNatureza}
                onChange={(e) => setFilterNatureza(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-graphite-800 border border-graphite-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">Todas naturezas</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
            </div>
          </div>

          {/* Tabela */}
          <Tooltip.Provider>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-[10px] border-collapse">
                <thead className="sticky top-0 bg-graphite-900/95 backdrop-blur-sm z-10 shadow-md">
                  <tr>
                    <th className="p-2 text-left font-semibold text-graphite-300 border-b border-graphite-700 bg-graphite-900/95">Categoria / Conta</th>
                    {MONTHS.map(month => (
                      <th key={month} className="p-2 text-right font-semibold text-graphite-300 border-b border-graphite-700 min-w-[70px] bg-graphite-900/95">
                        {month}
                      </th>
                    ))}
                    <th className="p-2 text-right font-semibold text-graphite-300 border-b border-graphite-700 min-w-[80px] bg-graphite-900/95">Total</th>
                  </tr>
                </thead>
              <tbody>
                {processedData.map((category, catIdx) => {
                  const isCategoryExpanded = expandedGroups.has(category.category)
                  
                  return (
                    <React.Fragment key={category.category}>
                      {/* Linha de Categoria */}
                      <tr className="bg-graphite-900/50 hover:bg-graphite-900/80 transition-colors group/row">
                        <td className="p-2 font-bold text-white border-b border-graphite-700">
                          <button
                            onClick={() => toggleGroup(category.category)}
                            className="flex items-center gap-1 hover:text-gold-400 transition-colors group/button"
                          >
                            <motion.div
                              animate={{ rotate: isCategoryExpanded ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {isCategoryExpanded ? (
                                <ChevronDown className="w-3 h-3 group-hover/button:text-gold-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 group-hover/button:text-gold-400" />
                              )}
                            </motion.div>
                            {category.category}
                          </button>
                        </td>
                        {MONTHS.map((_, monthIdx) => {
                          const monthTotal = category.subcategories.reduce(
                            (sum, sub) => sum + sub.accounts.reduce((accSum, acc) => accSum + acc.months[monthIdx], 0),
                            0
                          )
                          return (
                            <Tooltip.Root key={monthIdx}>
                              <Tooltip.Trigger asChild>
                                <td className="p-2 text-right font-semibold text-white border-b border-graphite-700 cursor-help hover:bg-graphite-800/50 transition-colors">
                                  {isCategoryExpanded ? formatCurrency(monthTotal) : '—'}
                                </td>
                              </Tooltip.Trigger>
                              {isCategoryExpanded && monthTotal !== 0 && (
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    className="bg-graphite-900 border border-graphite-700 rounded px-2 py-1 text-xs text-white shadow-xl z-50"
                                    sideOffset={5}
                                  >
                                    {MONTHS[monthIdx]} {selectedYear}: {formatCurrency(monthTotal)}
                                    <Tooltip.Arrow className="fill-graphite-900" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              )}
                            </Tooltip.Root>
                          )
                        })}
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <td className="p-2 text-right font-bold text-gold-400 border-b border-graphite-700 cursor-help hover:bg-graphite-800/50 transition-colors">
                              {formatCurrency(category.total)}
                            </td>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="bg-graphite-900 border border-graphite-700 rounded px-2 py-1 text-xs text-white shadow-xl z-50"
                              sideOffset={5}
                            >
                              Total {category.category}: {formatCurrency(category.total)}
                              <Tooltip.Arrow className="fill-graphite-900" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </tr>

                      {/* Subcategorias e Contas */}
                      {isCategoryExpanded && category.subcategories.map((subcategory, subIdx) => {
                        const subKey = `${category.category}_${subcategory.subcategory}`
                        const isSubExpanded = expandedSubgroups.has(subKey)
                        
                        return (
                          <React.Fragment key={subKey}>
                            {/* Linha de Subcategoria - Zebra row */}
                            <tr className={`${subIdx % 2 === 0 ? 'bg-graphite-800/20' : 'bg-graphite-800/10'} hover:bg-graphite-800/60 transition-colors`}>
                              <td className="p-2 pl-6 font-semibold text-graphite-200 border-b border-graphite-700/50">
                                <button
                                  onClick={() => toggleSubgroup(subKey)}
                                  className="flex items-center gap-1 hover:text-gold-400 transition-colors group/subbutton"
                                >
                                  <motion.div
                                    animate={{ rotate: isSubExpanded ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    {isSubExpanded ? (
                                      <ChevronDown className="w-3 h-3 group-hover/subbutton:text-gold-400" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 group-hover/subbutton:text-gold-400" />
                                    )}
                                  </motion.div>
                                  {subcategory.subcategory}
                                </button>
                              </td>
                              {MONTHS.map((_, monthIdx) => {
                                const monthTotal = subcategory.accounts.reduce(
                                  (sum, acc) => sum + acc.months[monthIdx],
                                  0
                                )
                                return (
                                  <Tooltip.Root key={monthIdx}>
                                    <Tooltip.Trigger asChild>
                                      <td className="p-2 text-right text-graphite-300 border-b border-graphite-700/50 cursor-help hover:bg-graphite-700/30 transition-colors">
                                        {isSubExpanded ? formatCurrency(monthTotal) : '—'}
                                      </td>
                                    </Tooltip.Trigger>
                                    {isSubExpanded && monthTotal !== 0 && (
                                      <Tooltip.Portal>
                                        <Tooltip.Content
                                          className="bg-graphite-900 border border-graphite-700 rounded px-2 py-1 text-xs text-white shadow-xl z-50"
                                          sideOffset={5}
                                        >
                                          {subcategory.subcategory} - {MONTHS[monthIdx]}: {formatCurrency(monthTotal)}
                                          <Tooltip.Arrow className="fill-graphite-900" />
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    )}
                                  </Tooltip.Root>
                                )
                              })}
                              <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                  <td className="p-2 text-right font-semibold text-gold-300 border-b border-graphite-700/50 cursor-help hover:bg-graphite-700/30 transition-colors">
                                    {formatCurrency(subcategory.total)}
                                  </td>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    className="bg-graphite-900 border border-graphite-700 rounded px-2 py-1 text-xs text-white shadow-xl z-50"
                                    sideOffset={5}
                                  >
                                    Total {subcategory.subcategory}: {formatCurrency(subcategory.total)}
                                    <Tooltip.Arrow className="fill-graphite-900" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            </tr>

                            {/* Contas individuais - Zebra rows */}
                            {isSubExpanded && subcategory.accounts.map((account, accIdx) => (
                              <tr
                                key={`${subKey}_${account.conta}`}
                                className={`${accIdx % 2 === 0 ? 'bg-graphite-900/10' : 'bg-transparent'} hover:bg-graphite-800/40 transition-colors`}
                              >
                                <td className="p-2 pl-10 text-graphite-400 border-b border-graphite-700/30">
                                  {account.conta}
                                </td>
                                {account.months.map((value, monthIdx) => (
                                  <Tooltip.Root key={monthIdx}>
                                    <Tooltip.Trigger asChild>
                                      <td
                                        className={`p-2 text-right border-b border-graphite-700/30 cursor-help hover:bg-graphite-700/20 transition-colors ${
                                          value < 0 ? 'text-red-400' : value > 0 ? 'text-emerald-400' : 'text-graphite-500'
                                        }`}
                                      >
                                        {value !== 0 ? formatCurrency(value) : '—'}
                                      </td>
                                    </Tooltip.Trigger>
                                    {value !== 0 && (
                                      <Tooltip.Portal>
                                        <Tooltip.Content
                                          className="bg-graphite-900 border border-graphite-700 rounded px-2 py-1 text-xs text-white shadow-xl z-50"
                                          sideOffset={5}
                                        >
                                          {account.conta} - {MONTHS[monthIdx]}: {formatCurrency(value)}
                                          <Tooltip.Arrow className="fill-graphite-900" />
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    )}
                                  </Tooltip.Root>
                                ))}
                                <Tooltip.Root>
                                  <Tooltip.Trigger asChild>
                                    <td
                                      className={`p-2 text-right font-medium border-b border-graphite-700/30 cursor-help hover:bg-graphite-700/20 transition-colors ${
                                        account.total < 0 ? 'text-red-400' : account.total > 0 ? 'text-emerald-400' : 'text-graphite-500'
                                      }`}
                                    >
                                      {formatCurrency(account.total)}
                                    </td>
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      className="bg-graphite-900 border border-graphite-700 rounded px-2 py-1 text-xs text-white shadow-xl z-50"
                                      sideOffset={5}
                                    >
                                      Total {account.conta}: {formatCurrency(account.total)}
                                      <Tooltip.Arrow className="fill-graphite-900" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              </tr>
                            ))}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          </Tooltip.Provider>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

