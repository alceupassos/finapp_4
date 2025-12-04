import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ChevronRight, ChevronDown, Search, Filter } from 'lucide-react'
import { formatCurrency } from '../../lib/formatters'
import * as XLSX from 'xlsx'

interface DFCFullModalProps {
  open: boolean
  onClose: () => void
  dfcData: Array<{ data?: string; descricao?: string; entrada?: number; saida?: number; saldo?: number; kind?: string; category?: string }>
  selectedCompanies: string[]
  selectedYear: string
  selectedMonth?: string
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Categorizar DFC em grupos
function categorizeDFC(descricao: string, kind: string, category?: string): { category: string; subcategory?: string } {
  const text = `${descricao} ${category || ''} ${kind}`.toLowerCase()
  
  if (kind === 'in' || text.includes('entrada') || text.includes('recebimento')) {
    if (text.includes('cliente') || text.includes('venda') || text.includes('receita')) {
      return { category: 'ENTRADAS', subcategory: 'Recebimentos de Clientes' }
    }
    if (text.includes('emprestimo') || text.includes('financiamento')) {
      return { category: 'ENTRADAS', subcategory: 'Financiamentos' }
    }
    if (text.includes('investimento') || text.includes('capital')) {
      return { category: 'ENTRADAS', subcategory: 'Investimentos' }
    }
    return { category: 'ENTRADAS', subcategory: 'Outras Entradas' }
  }
  
  if (kind === 'out' || text.includes('saida') || text.includes('pagamento')) {
    if (text.includes('fornecedor') || text.includes('compra') || text.includes('mercadoria')) {
      return { category: 'SAÍDAS', subcategory: 'Pagamentos a Fornecedores' }
    }
    if (text.includes('salario') || text.includes('pessoal') || text.includes('folha')) {
      return { category: 'SAÍDAS', subcategory: 'Pagamentos de Pessoal' }
    }
    if (text.includes('imposto') || text.includes('taxa') || text.includes('tributo')) {
      return { category: 'SAÍDAS', subcategory: 'Impostos e Taxas' }
    }
    if (text.includes('aluguel') || text.includes('condominio') || text.includes('servico')) {
      return { category: 'SAÍDAS', subcategory: 'Despesas Operacionais' }
    }
    if (text.includes('emprestimo') || text.includes('financiamento') || text.includes('amortizacao')) {
      return { category: 'SAÍDAS', subcategory: 'Amortizações de Dívidas' }
    }
    return { category: 'SAÍDAS', subcategory: 'Outras Saídas' }
  }
  
  return { category: 'OUTROS' }
}

export function DFCFullModal({
  open,
  onClose,
  dfcData,
  selectedCompanies,
  selectedYear,
  selectedMonth,
}: DFCFullModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterKind, setFilterKind] = useState<string>('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set())

  // Processar dados em estrutura hierárquica
  const processedData = useMemo(() => {
    const categoryMap = new Map<string, Map<string, Map<string, { months: { entrada: number; saida: number }[]; totalEntrada: number; totalSaida: number }>>>()
    
    dfcData.forEach(item => {
      if (!item.data) return
      
      const date = new Date(item.data)
      const month = date.getMonth()
      const year = date.getFullYear()
      
      // Filtrar por ano/mês se necessário
      if (year.toString() !== selectedYear) return
      if (selectedMonth) {
        const monthStr = selectedMonth.split('-')[1]
        if (String(month + 1).padStart(2, '0') !== monthStr) return
      }
      
      const descricao = item.descricao || item.category || 'Lançamento'
      const kind = item.kind || (item.entrada && item.entrada > 0 ? 'in' : 'out')
      const { category, subcategory } = categorizeDFC(descricao, kind, item.category)
      
      const entrada = Number(item.entrada || 0)
      const saida = Number(item.saida || 0)
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map())
      }
      const subcategoryMap = categoryMap.get(category)!
      
      const subcatKey = subcategory || 'Geral'
      if (!subcategoryMap.has(subcatKey)) {
        subcategoryMap.set(subcatKey, new Map())
      }
      const itemMap = subcategoryMap.get(subcatKey)!
      
      const itemKey = descricao
      if (!itemMap.has(itemKey)) {
        itemMap.set(itemKey, { 
          months: Array(12).fill(0).map(() => ({ entrada: 0, saida: 0 })), 
          totalEntrada: 0, 
          totalSaida: 0 
        })
      }
      const itemData = itemMap.get(itemKey)!
      
      itemData.months[month].entrada += entrada
      itemData.months[month].saida += saida
      itemData.totalEntrada += entrada
      itemData.totalSaida += saida
    })
    
    // Converter para estrutura hierárquica
    const result: Array<{
      category: string
      subcategories: Array<{
        subcategory: string
        items: Array<{
          descricao: string
          months: { entrada: number; saida: number }[]
          totalEntrada: number
          totalSaida: number
          saldo: number
        }>
        totalEntrada: number
        totalSaida: number
        saldo: number
      }>
      totalEntrada: number
      totalSaida: number
      saldo: number
    }> = []
    
    categoryMap.forEach((subcategoryMap, category) => {
      const subcategories: Array<{
        subcategory: string
        items: Array<{
          descricao: string
          months: { entrada: number; saida: number }[]
          totalEntrada: number
          totalSaida: number
          saldo: number
        }>
        totalEntrada: number
        totalSaida: number
        saldo: number
      }> = []
      
      subcategoryMap.forEach((itemMap, subcategory) => {
        const items: Array<{
          descricao: string
          months: { entrada: number; saida: number }[]
          totalEntrada: number
          totalSaida: number
          saldo: number
        }> = []
        let subtotalEntrada = 0
        let subtotalSaida = 0
        
        itemMap.forEach((itemData, descricao) => {
          // Filtrar por busca
          if (searchTerm && !descricao.toLowerCase().includes(searchTerm.toLowerCase())) return
          // Filtrar por tipo
          if (filterKind) {
            if (filterKind === 'in' && itemData.totalEntrada === 0) return
            if (filterKind === 'out' && itemData.totalSaida === 0) return
          }
          
          const saldo = itemData.totalEntrada - itemData.totalSaida
          items.push({ descricao, ...itemData, saldo })
          subtotalEntrada += itemData.totalEntrada
          subtotalSaida += itemData.totalSaida
        })
        
        if (items.length > 0) {
          subcategories.push({ 
            subcategory, 
            items, 
            totalEntrada: subtotalEntrada, 
            totalSaida: subtotalSaida,
            saldo: subtotalEntrada - subtotalSaida
          })
        }
      })
      
      const categoryEntrada = subcategories.reduce((sum, sub) => sum + sub.totalEntrada, 0)
      const categorySaida = subcategories.reduce((sum, sub) => sum + sub.totalSaida, 0)
      if (subcategories.length > 0) {
        result.push({ 
          category, 
          subcategories, 
          totalEntrada: categoryEntrada, 
          totalSaida: categorySaida,
          saldo: categoryEntrada - categorySaida
        })
      }
    })
    
    return result.sort((a, b) => {
      // Ordem: Entradas primeiro, depois Saídas
      const order: Record<string, number> = {
        'ENTRADAS': 1,
        'SAÍDAS': 2,
        'OUTROS': 3,
      }
      return (order[a.category] || 99) - (order[b.category] || 99)
    })
  }, [dfcData, selectedYear, selectedMonth, searchTerm, filterKind])

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
    const header = ['Categoria', 'Subcategoria', 'Descrição', ...MONTHS.flatMap(m => [`${m} Entrada`, `${m} Saída`]), 'Total Entrada', 'Total Saída', 'Saldo']
    const rows: any[] = []
    
    processedData.forEach(cat => {
      cat.subcategories.forEach(sub => {
        sub.items.forEach(item => {
          const monthValues = item.months.flatMap(m => [m.entrada, m.saida])
          rows.push([
            cat.category,
            sub.subcategory,
            item.descricao,
            ...monthValues,
            item.totalEntrada,
            item.totalSaida,
            item.saldo,
          ])
        })
      })
    })
    
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'DFC')
    XLSX.writeFile(wb, `DFC_${selectedYear}${selectedMonth ? '_' + selectedMonth : ''}.xlsx`)
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
          {/* Header */}
          <div className="p-4 border-b border-graphite-800 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white">DFC Completo</h2>
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
                className="px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Excel
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-graphite-800 hover:bg-graphite-700 text-white transition-colors"
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
                placeholder="Buscar descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-graphite-800 border border-graphite-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-graphite-400" />
              <select
                value={filterKind}
                onChange={(e) => setFilterKind(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-graphite-800 border border-graphite-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">Todos os tipos</option>
                <option value="in">Apenas Entradas</option>
                <option value="out">Apenas Saídas</option>
              </select>
            </div>
          </div>

          {/* Tabela */}
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-[10px] border-collapse">
              <thead className="sticky top-0 bg-graphite-900 z-10">
                <tr>
                  <th className="p-2 text-left font-semibold text-graphite-300 border-b border-graphite-700">Categoria / Descrição</th>
                  {MONTHS.map(month => (
                    <React.Fragment key={month}>
                      <th className="p-2 text-right font-semibold text-graphite-300 border-b border-graphite-700 min-w-[70px] text-green-400">
                        {month} E
                      </th>
                      <th className="p-2 text-right font-semibold text-graphite-300 border-b border-graphite-700 min-w-[70px] text-red-400">
                        {month} S
                      </th>
                    </React.Fragment>
                  ))}
                  <th className="p-2 text-right font-semibold text-graphite-300 border-b border-graphite-700 min-w-[70px] text-green-400">Total E</th>
                  <th className="p-2 text-right font-semibold text-graphite-300 border-b border-graphite-700 min-w-[70px] text-red-400">Total S</th>
                  <th className="p-2 text-right font-semibold text-graphite-300 border-b border-graphite-700 min-w-[80px]">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((category, catIdx) => {
                  const isCategoryExpanded = expandedGroups.has(category.category)
                  
                  return (
                    <React.Fragment key={category.category}>
                      {/* Linha de Categoria */}
                      <tr className="bg-graphite-900/50 hover:bg-graphite-900/70">
                        <td className="p-2 font-bold text-white border-b border-graphite-700">
                          <button
                            onClick={() => toggleGroup(category.category)}
                            className="flex items-center gap-1 hover:text-gold-400 transition-colors"
                          >
                            {isCategoryExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                            {category.category}
                          </button>
                        </td>
                        {MONTHS.map((_, monthIdx) => {
                          const monthEntrada = category.subcategories.reduce(
                            (sum, sub) => sum + sub.items.reduce((accSum, item) => accSum + item.months[monthIdx].entrada, 0),
                            0
                          )
                          const monthSaida = category.subcategories.reduce(
                            (sum, sub) => sum + sub.items.reduce((accSum, item) => accSum + item.months[monthIdx].saida, 0),
                            0
                          )
                          return (
                            <React.Fragment key={monthIdx}>
                              <td className="p-2 text-right font-semibold text-green-400 border-b border-graphite-700">
                                {isCategoryExpanded ? formatCurrency(monthEntrada) : '—'}
                              </td>
                              <td className="p-2 text-right font-semibold text-red-400 border-b border-graphite-700">
                                {isCategoryExpanded ? formatCurrency(monthSaida) : '—'}
                              </td>
                            </React.Fragment>
                          )
                        })}
                        <td className="p-2 text-right font-bold text-green-400 border-b border-graphite-700">
                          {formatCurrency(category.totalEntrada)}
                        </td>
                        <td className="p-2 text-right font-bold text-red-400 border-b border-graphite-700">
                          {formatCurrency(category.totalSaida)}
                        </td>
                        <td className={`p-2 text-right font-bold border-b border-graphite-700 ${
                          category.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(category.saldo)}
                        </td>
                      </tr>

                      {/* Subcategorias e Itens */}
                      {isCategoryExpanded && category.subcategories.map((subcategory, subIdx) => {
                        const subKey = `${category.category}_${subcategory.subcategory}`
                        const isSubExpanded = expandedSubgroups.has(subKey)
                        
                        return (
                          <React.Fragment key={subKey}>
                            {/* Linha de Subcategoria */}
                            <tr className="bg-graphite-800/30 hover:bg-graphite-800/50">
                              <td className="p-2 pl-6 font-semibold text-graphite-200 border-b border-graphite-700/50">
                                <button
                                  onClick={() => toggleSubgroup(subKey)}
                                  className="flex items-center gap-1 hover:text-gold-400 transition-colors"
                                >
                                  {isSubExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                  {subcategory.subcategory}
                                </button>
                              </td>
                              {MONTHS.map((_, monthIdx) => {
                                const monthEntrada = subcategory.items.reduce(
                                  (sum, item) => sum + item.months[monthIdx].entrada,
                                  0
                                )
                                const monthSaida = subcategory.items.reduce(
                                  (sum, item) => sum + item.months[monthIdx].saida,
                                  0
                                )
                                return (
                                  <React.Fragment key={monthIdx}>
                                    <td className="p-2 text-right text-green-300 border-b border-graphite-700/50">
                                      {isSubExpanded ? formatCurrency(monthEntrada) : '—'}
                                    </td>
                                    <td className="p-2 text-right text-red-300 border-b border-graphite-700/50">
                                      {isSubExpanded ? formatCurrency(monthSaida) : '—'}
                                    </td>
                                  </React.Fragment>
                                )
                              })}
                              <td className="p-2 text-right font-semibold text-green-300 border-b border-graphite-700/50">
                                {formatCurrency(subcategory.totalEntrada)}
                              </td>
                              <td className="p-2 text-right font-semibold text-red-300 border-b border-graphite-700/50">
                                {formatCurrency(subcategory.totalSaida)}
                              </td>
                              <td className={`p-2 text-right font-semibold border-b border-graphite-700/50 ${
                                subcategory.saldo >= 0 ? 'text-emerald-300' : 'text-red-300'
                              }`}>
                                {formatCurrency(subcategory.saldo)}
                              </td>
                            </tr>

                            {/* Itens individuais */}
                            {isSubExpanded && subcategory.items.map((item, itemIdx) => (
                              <tr
                                key={`${subKey}_${item.descricao}_${itemIdx}`}
                                className="hover:bg-graphite-800/20"
                              >
                                <td className="p-2 pl-10 text-graphite-400 border-b border-graphite-700/30">
                                  {item.descricao}
                                </td>
                                {item.months.map((month, monthIdx) => (
                                  <React.Fragment key={monthIdx}>
                                    <td className="p-2 text-right text-green-400/70 border-b border-graphite-700/30">
                                      {month.entrada !== 0 ? formatCurrency(month.entrada) : '—'}
                                    </td>
                                    <td className="p-2 text-right text-red-400/70 border-b border-graphite-700/30">
                                      {month.saida !== 0 ? formatCurrency(month.saida) : '—'}
                                    </td>
                                  </React.Fragment>
                                ))}
                                <td className="p-2 text-right font-medium text-green-400/70 border-b border-graphite-700/30">
                                  {item.totalEntrada !== 0 ? formatCurrency(item.totalEntrada) : '—'}
                                </td>
                                <td className="p-2 text-right font-medium text-red-400/70 border-b border-graphite-700/30">
                                  {item.totalSaida !== 0 ? formatCurrency(item.totalSaida) : '—'}
                                </td>
                                <td className={`p-2 text-right font-medium border-b border-graphite-700/30 ${
                                  item.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {formatCurrency(item.saldo)}
                                </td>
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

