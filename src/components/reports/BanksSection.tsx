import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Building2, TrendingUp, TrendingDown } from 'lucide-react'
import { SupabaseRest } from '../../services/supabaseRest'
import { SaldoBancarioChart } from '../charts/SaldoBancarioChart'
import { AnimatedReportCard } from './AnimatedReportCard'
import { formatCurrency, formatDate } from '../../lib/formatters'

interface BanksSectionProps {
  selectedCompanies: string[]
  selectedYear: string
  selectedMonth?: string
}

export function BanksSection({
  selectedCompanies,
  selectedYear,
  selectedMonth,
}: BanksSectionProps) {
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedCompanies.length === 0) {
      setBankAccounts([])
      setTransactions([])
      setLoading(false)
      return
    }

    setLoading(true)
    ;(async () => {
      try {
        // Buscar contas bancárias
        const accounts = await SupabaseRest.getBankAccounts(selectedCompanies)
        setBankAccounts(accounts || [])

        // Buscar transações do mês selecionado
        const year = parseInt(selectedYear) || new Date().getFullYear()
        const month = selectedMonth ? parseInt(selectedMonth.split('-')[1]) : new Date().getMonth() + 1
        const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        const trans = await SupabaseRest.getBankTransactions(selectedCompanies, dateFrom, dateTo)
        setTransactions(trans || [])
      } catch (error) {
        console.error('Erro ao carregar dados bancários:', error)
        setBankAccounts([])
        setTransactions([])
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCompanies, selectedYear, selectedMonth])

  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalSaldo = bankAccounts.reduce(
      (sum, acc) => sum + Number(acc.saldo_atual || 0),
      0
    )

    const totalContas = bankAccounts.length

    const movimentacoesMes = transactions.filter((t) => {
      const date = new Date(t.transaction_date)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      return (
        year.toString() === selectedYear &&
        (!selectedMonth || month.toString() === selectedMonth.split('-')[1])
      )
    })

    const entradasMes = movimentacoesMes
      .filter((t) => t.transaction_type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const saidasMes = movimentacoesMes
      .filter((t) => t.transaction_type === 'debit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    return {
      totalSaldo,
      totalContas,
      entradasMes,
      saidasMes,
      saldoMes: entradasMes - saidasMes,
    }
  }, [bankAccounts, transactions, selectedYear, selectedMonth])

  const cnpjForCharts =
    selectedCompanies.length > 1 ? selectedCompanies : selectedCompanies[0] || ''

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <AnimatedReportCard
          title="Saldo Total"
          value={kpis.totalSaldo}
          format="currency"
          trend="neutral"
          delay={0}
          subtitle={`${kpis.totalContas} conta(s)`}
        />
        <AnimatedReportCard
          title="Entradas (Mês)"
          value={kpis.entradasMes}
          format="currency"
          trend="up"
          delay={0.1}
        />
        <AnimatedReportCard
          title="Saídas (Mês)"
          value={kpis.saidasMes}
          format="currency"
          trend="down"
          delay={0.2}
        />
        <AnimatedReportCard
          title="Saldo Líquido (Mês)"
          value={kpis.saldoMes}
          format="currency"
          trend={kpis.saldoMes >= 0 ? 'up' : 'down'}
          delay={0.3}
        />
      </div>

      {/* Saldo Bancário Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gold-500" />
          Saldo por Conta Bancária
        </h3>
        <SaldoBancarioChart cnpj={cnpjForCharts} />
      </motion.div>

      {/* Lista de Contas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card-premium p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Contas Bancárias</h3>
        {bankAccounts.length > 0 ? (
          <div className="space-y-3">
            {bankAccounts.map((account, index) => (
              <motion.div
                key={account.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-graphite-900 rounded-lg border border-graphite-800"
              >
                <div>
                  <h4 className="font-medium text-white">{account.nome}</h4>
                  <p className="text-sm text-graphite-400">
                    {account.banco_numero && `Banco ${account.banco_numero}`}
                    {account.agencia && ` • Ag. ${account.agencia}`}
                    {account.conta && ` • C/C ${account.conta}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(Number(account.saldo_atual || 0))}
                  </p>
                  <p className="text-xs text-graphite-500">
                    {account.saldo_data ? formatDate(account.saldo_data) : 'Sem data'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-graphite-500 text-center py-8">
            Nenhuma conta bancária encontrada
          </p>
        )}
      </motion.div>

      {loading && (
        <div className="card-premium p-4 text-center">
          <p className="text-sm text-muted-foreground">Carregando dados bancários...</p>
        </div>
      )}
    </div>
  )
}

