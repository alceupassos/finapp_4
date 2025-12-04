import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Search, ChevronRight, ChevronDown } from 'lucide-react'
import { SupabaseRest } from '../../services/supabaseRest'
import { AnimatedReportCard } from './AnimatedReportCard'

interface ChartOfAccountsSectionProps {
  selectedCompanies: string[]
}

interface ChartAccount {
  id: number
  code: string
  name: string
  account_type: string
  parent_code?: string
  level: number
  is_analytical: boolean
}

export function ChartOfAccountsSection({
  selectedCompanies,
}: ChartOfAccountsSectionProps) {
  const [accounts, setAccounts] = useState<ChartAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      try {
        const data = await SupabaseRest.getChartOfAccounts()
        setAccounts(data || [])
      } catch (error) {
        console.error('Erro ao carregar plano de contas:', error)
        setAccounts([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Construir hierarquia de contas
  const accountTree = useMemo(() => {
    const accountMap = new Map<string, ChartAccount & { children: ChartAccount[] }>()
    const rootAccounts: (ChartAccount & { children: ChartAccount[] })[] = []

    // Primeiro, criar todos os nós
    accounts.forEach(account => {
      accountMap.set(account.code, { ...account, children: [] })
    })

    // Depois, construir a árvore
    accounts.forEach(account => {
      const node = accountMap.get(account.code)!
      if (account.parent_code && accountMap.has(account.parent_code)) {
        const parent = accountMap.get(account.parent_code)!
        parent.children.push(node)
      } else {
        rootAccounts.push(node)
      }
    })

    return rootAccounts.sort((a, b) => a.code.localeCompare(b.code))
  }, [accounts])

  // Filtrar contas
  const filteredTree = useMemo(() => {
    if (!searchTerm && !filterType) return accountTree

    const filterNode = (node: ChartAccount & { children: ChartAccount[] }): (ChartAccount & { children: ChartAccount[] }) | null => {
      const matchesSearch = !searchTerm || 
        node.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = !filterType || node.account_type === filterType

      const filteredChildren = node.children
        .map((child: ChartAccount & { children: ChartAccount[] }) => filterNode(child))
        .filter((child): child is ChartAccount & { children: ChartAccount[] } => child !== null)

      if (matchesSearch && matchesType) {
        return { ...node, children: filteredChildren }
      }

      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren }
      }

      return null
    }

    return accountTree
      .map(node => filterNode(node))
      .filter((node): node is ChartAccount & { children: ChartAccount[] } => node !== null)
  }, [accountTree, searchTerm, filterType])

  // Calcular KPIs
  const kpis = useMemo(() => {
    const total = accounts.length
    const byType = accounts.reduce((acc, account) => {
      const type = account.account_type || 'outro'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      byType,
    }
  }, [accounts])

  const toggleExpand = (code: string) => {
    const newExpanded = new Set(expandedCodes)
    if (newExpanded.has(code)) {
      newExpanded.delete(code)
    } else {
      newExpanded.add(code)
    }
    setExpandedCodes(newExpanded)
  }

  const renderAccount = (account: ChartAccount & { children: ChartAccount[] }, depth: number = 0) => {
    const hasChildren = account.children.length > 0
    const isExpanded = expandedCodes.has(account.code)
    const indent = depth * 24

    return (
      <div key={account.code}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-center gap-2 py-2 px-3 hover:bg-graphite-900/50 rounded-lg transition-colors ${
            depth === 0 ? 'font-semibold' : ''
          }`}
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(account.code)}
              className="p-1 hover:bg-graphite-800 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-graphite-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-graphite-400" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          <span className="text-sm text-graphite-300 font-mono">{account.code}</span>
          <span className="text-sm text-white flex-1">{account.name}</span>
          <span className="text-xs text-graphite-500 px-2 py-1 rounded bg-graphite-900">
            {account.account_type}
          </span>
        </motion.div>

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {account.children.map((child: ChartAccount & { children: ChartAccount[] }) => renderAccount(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const accountTypes = useMemo(() => {
    const types = new Set(accounts.map(a => a.account_type).filter(Boolean))
    return Array.from(types).sort()
  }, [accounts])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <AnimatedReportCard
          title="Total de Contas"
          value={kpis.total}
          format="number"
          trend="neutral"
          delay={0}
        />
        {Object.entries(kpis.byType).slice(0, 3).map(([type, count], idx) => (
          <AnimatedReportCard
            key={type}
            title={type}
            value={count}
            format="number"
            trend="neutral"
            delay={(idx + 1) * 0.1}
          />
        ))}
      </div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-400" />
              <input
                type="text"
                placeholder="Buscar por código ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-graphite-900 border border-graphite-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Tipo:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-graphite-900 border border-graphite-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 min-w-[150px]"
            >
              <option value="">Todos</option>
              {accountTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Árvore de Contas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card-premium p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-gold-500" />
          <h3 className="text-lg font-semibold">Plano de Contas</h3>
          <span className="text-sm text-graphite-500">
            ({filteredTree.reduce((sum, node) => {
              const countNode = (n: ChartAccount & { children: ChartAccount[] }): number => {
                return 1 + n.children.reduce((acc, child: ChartAccount & { children: ChartAccount[] }) => acc + countNode(child), 0)
              }
              return sum + countNode(node)
            }, 0)} contas)
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Carregando plano de contas...</p>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-graphite-500">
              {searchTerm || filterType
                ? 'Nenhuma conta encontrada com os filtros selecionados'
                : 'Nenhuma conta cadastrada'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filteredTree.map(account => renderAccount(account))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

