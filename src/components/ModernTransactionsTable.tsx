import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, MoreVertical, Search } from 'lucide-react';
import { SupabaseRest } from '../services/supabaseRest'
import { useEffect, useMemo, useState } from 'react'

type Tx = { id?: string|number; descricao?: string; data?: string; entrada?: number; saida?: number; saldo?: number; cnpj?: string; status?: string }
type Company = { grupo_empresarial?: string; cliente_nome?: string; cnpj?: string }

const statusConfig = {
  success: { label: 'Concluído', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  pending: { label: 'Pendente', color: 'gold', bg: 'bg-gold-500/10', text: 'text-gold-400', border: 'border-gold-500/20' },
  failed: { label: 'Falhou', color: 'red', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export function ModernTransactionsTable({ selectedCompanies = [] }: { selectedCompanies?: string[] }) {
  const [rows, setRows] = useState<Tx[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [filterType, setFilterType] = useState<'all' | 'month' | 'range'>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Usar empresas selecionadas - se não houver, não carregar dados
  const companiesToLoad = selectedCompanies.length > 0 ? selectedCompanies : []

  useEffect(() => {
    if (companiesToLoad.length === 0) return
    setLoading(true)
    setError('')
    ;(async () => {
      try {
        // Carregar dados de todas as empresas selecionadas
        const allDfcPromises = companiesToLoad.map(cnpj => SupabaseRest.getDFC(cnpj))
        const allDfcResults = await Promise.all(allDfcPromises)
        
        // Consolidar transações de todas as empresas
        const consolidatedRows: Tx[] = []
        allDfcResults.forEach((data: Tx[], index) => {
          if (Array.isArray(data)) {
            const cleaned = data.filter(tx => {
              const s = String(tx.status || '').toLowerCase()
              if (s.includes('baixado') || s.includes('baixados') || s.includes('renegociado') || s.includes('renegociados')) return false
              if (!s.includes('conciliado')) return false
              return true
            })
            // Adicionar CNPJ para rastreamento
            cleaned.forEach(tx => {
              consolidatedRows.push({ ...tx, cnpj: companiesToLoad[index] })
            })
          }
        })
        
        // Ordenar por data (mais recente primeiro)
        consolidatedRows.sort((a, b) => {
          const dateA = new Date(a.data || '1900-01-01').getTime()
          const dateB = new Date(b.data || '1900-01-01').getTime()
          return dateB - dateA
        })
        
        setRows(consolidatedRows)
      } catch (e: any) {
        setError('Falha ao carregar extrato')
        console.error('Erro ao carregar transações:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [companiesToLoad.join(',')])

  // Ordenar por data decrescente (mais recente primeiro) e filtrar
  const filteredRows = useMemo(() => {
    let filtered = [...rows]

    // Ordenar por data decrescente
    filtered.sort((a, b) => {
      const dateA = new Date(a.data || '1900-01-01').getTime()
      const dateB = new Date(b.data || '1900-01-01').getTime()
      return dateB - dateA // Decrescente
    })

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        (tx.descricao || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por período
    if (filterType === 'month' && selectedMonth) {
      filtered = filtered.filter(tx => tx.data?.startsWith(selectedMonth))
    } else if (filterType === 'range' && startDate && endDate) {
      filtered = filtered.filter(tx => {
        const txDate = tx.data || ''
        return txDate >= startDate && txDate <= endDate
      })
    }

    return filtered
  }, [rows, searchTerm, filterType, selectedMonth, startDate, endDate])

  // Gerar lista de meses disponíveis
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    rows.forEach(tx => {
      if (tx.data) {
        months.add(tx.data.slice(0, 7))
      }
    })
    return Array.from(months).sort().reverse()
  }, [rows])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="neomorphic neomorphic-hover border border-graphite-800/30 rounded-3xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-8 border-b border-graphite-800/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white font-display">Transações Recentes</h3>
            <p className="text-sm text-graphite-400 mt-1">Últimas movimentações financeiras</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 neomorphic-inset border border-graphite-800/20 rounded-xl text-sm text-white placeholder-graphite-500 focus:outline-none focus:border-gold-500 transition-all w-48"
              />
            </div>

            {/* Filter Type */}
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 neomorphic-inset border border-graphite-800/20 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
            >
              <option value="all">Todos os períodos</option>
              <option value="month">Por mês</option>
              <option value="range">Faixa de datas</option>
            </select>

            {/* Month Filter */}
            {filterType === 'month' && (
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 neomorphic-inset border border-graphite-800/20 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
              >
                <option value="">Selecione o mês</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </option>
                ))}
              </select>
            )}

            {/* Date Range Filters */}
            {filterType === 'range' && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 neomorphic-inset border border-graphite-800/20 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                />
                <span className="text-graphite-400 text-sm">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 neomorphic-inset border border-graphite-800/20 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-graphite-800">
              <th className="px-6 py-4 text-left text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Saldo
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {(loading ? [] : filteredRows).map((tx, index) => {
              const gross = Math.abs(Number((tx.entrada ?? 0) || (tx.saida ?? 0)))
              const type = (Number(tx.entrada || 0) > 0) ? 'income' : 'expense'
              const status = statusConfig[type === 'income' ? 'success' : 'pending']
              return (
                <motion.tr
                  key={tx.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  whileHover={{ backgroundColor: 'rgba(255, 122, 0, 0.03)' }}
                  className="border-b border-graphite-800/50 last:border-0 transition-colors group"
                >
                  {/* Company */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-graphite-800 to-graphite-900 flex items-center justify-center text-xl group-hover:shadow-lg transition-shadow"
                      >
                        💸
                      </motion.div>
                      <div>
                        <p className="text-sm font-semibold text-white">{tx.descricao || 'Lançamento'}</p>
                        <p className="text-xs text-graphite-400">{type === 'income' ? 'Entrada' : 'Saída'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4">
                    <p className="text-sm text-graphite-300">{tx.data || '-'}</p>
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-lg ${type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        {type === 'income' ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <span className={`text-sm font-bold ${type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {Number(gross).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${status.bg} ${status.text} ${status.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${status.text.replace('text-', 'bg-')} mr-2`} />
                      {Math.abs(Number(tx.saldo || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </motion.span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg hover:bg-graphite-800 text-graphite-400 hover:text-white transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </motion.button>
                  </td>
                </motion.tr>
              );
            })}
            {(!loading && rows.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-graphite-400">
                  Nenhum lançamento encontrado {companiesToLoad.length === 1 ? `para ${companiesToLoad[0]}` : `para ${companiesToLoad.length} empresas`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-graphite-800 flex items-center justify-between">
        <p className="text-sm text-graphite-400">
          {loading 
            ? 'Carregando...' 
            : `Mostrando ${filteredRows.length} de ${rows.length} lançamentos`
          }
          {companiesToLoad.length === 1 && (
            <span className="text-white font-semibold"> • {companiesToLoad[0]}</span>
          )}
          {companiesToLoad.length > 1 && (
            <span className="text-white font-semibold"> • {companiesToLoad.length} empresas (Consolidado)</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {companiesToLoad.length === 1 && (
            <span className="text-xs text-graphite-400">CNPJ {companiesToLoad[0]}</span>
          )}
        </div>
      </div>
  </motion.div>
  );
}
