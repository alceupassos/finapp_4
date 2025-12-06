import { useState, useEffect } from 'react'
import { HorizontalFilters } from './HorizontalFilters'
import { motion, AnimatePresence } from 'framer-motion'
import { ReportsSidebar, type ReportSection } from './reports/ReportsSidebar'
import { DRESection } from './reports/DRESection'
import { DFCSection } from './reports/DFCSection'
import { BanksSection } from './reports/BanksSection'
import { ReconciliationSection } from './reports/ReconciliationSection'
import { ChartOfAccountsSection } from './reports/ChartOfAccountsSection'
import { ClientesSection } from './reports/ClientesSection'
import { IndicadoresSection } from './reports/IndicadoresSection'
import { DashboardsSection } from './reports/DashboardsSection'

type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }
type DRERow = { data?: string; conta?: string; natureza?: string; valor?: number }

interface ReportsPageProps {
  companies?: Company[];
  selectedCompanies?: string[];
  selectedMonth?: string;
}

export function ReportsPage({ 
  companies: propCompanies = [], 
  selectedCompanies: propSelectedCompanies = [],
  selectedMonth: propSelectedMonth = ''
}: ReportsPageProps = {}) {
  const companies = propCompanies.length > 0 ? propCompanies : []
  const selectedCompanies = propSelectedCompanies.length > 0 ? propSelectedCompanies : []
  const globalSelectedMonth = propSelectedMonth
  
  const [selectedPeriod, setSelectedPeriod] = useState<'Ano' | 'Mês'>('Ano')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>(globalSelectedMonth || '')
  const [selectedQuarter, setSelectedQuarter] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('')
  const [activeSection, setActiveSection] = useState<ReportSection>('dashboard')

  // Debug: Log selectedCompanies e companies
  useEffect(() => {
    console.log('🔍 ReportsPage - propSelectedCompanies:', propSelectedCompanies)
    console.log('🔍 ReportsPage - selectedCompanies (processado):', selectedCompanies)
    console.log('🔍 ReportsPage - companies:', companies)
    console.log('🔍 ReportsPage - activeSection:', activeSection)
  }, [propSelectedCompanies, selectedCompanies, companies, activeSection])

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-premium p-6"
            >
              <h2 className="text-2xl font-bold mb-4">Dashboard de Relatórios</h2>
              <p className="text-graphite-400">
                Selecione uma seção no menu lateral para visualizar os relatórios detalhados.
              </p>
            </motion.div>
          </div>
        )
      case 'dre':
        return (
          <DRESection
            selectedCompanies={selectedCompanies}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            period={selectedPeriod}
          />
        )
      case 'dfc':
        return (
          <DFCSection
            selectedCompanies={selectedCompanies}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            period={selectedPeriod}
          />
        )
      case 'banks':
        return (
          <BanksSection
            selectedCompanies={selectedCompanies}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        )
      case 'reconciliation':
        return (
          <ReconciliationSection
            selectedCompanies={selectedCompanies}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        )
      case 'chart-of-accounts':
        return (
          <ChartOfAccountsSection
            selectedCompanies={selectedCompanies}
          />
        )
      case 'clientes':
        return (
          <ClientesSection
            selectedCompanies={selectedCompanies}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        )
      case 'indicadores':
        return (
          <IndicadoresSection
            selectedCompanies={selectedCompanies}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        )
      case 'dashboards':
        return (
          <DashboardsSection
            selectedCompanies={selectedCompanies}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        )
      default:
        return null
    }
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex relative">
      {/* Sidebar */}
      <ReportsSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content - ajusta margem baseado no estado da sidebar */}
      <div className="flex-1 p-8 transition-all duration-300 ml-64 lg:ml-80">
        {/* Filtros horizontais no topo */}
        <HorizontalFilters
          selectedPeriod={selectedPeriod}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          selectedMonth={selectedMonth}
          selectedCategory={selectedCategory}
          selectedBankAccount={selectedBankAccount}
          onPeriodChange={setSelectedPeriod}
          onYearChange={setSelectedYear}
          onQuarterChange={setSelectedQuarter}
          onMonthChange={setSelectedMonth}
          onCategoryChange={setSelectedCategory}
          onBankAccountChange={setSelectedBankAccount}
        />

        {/* Conteúdo da seção */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
