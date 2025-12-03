import { Calendar, Filter, Building2 } from 'lucide-react'

interface HorizontalFiltersProps {
  selectedPeriod: 'Ano' | 'Mês'
  selectedYear?: string
  selectedQuarter?: string
  selectedMonth?: string
  selectedCategory?: string
  selectedBankAccount?: string
  onPeriodChange: (period: 'Ano' | 'Mês') => void
  onYearChange?: (year: string) => void
  onQuarterChange?: (quarter: string) => void
  onMonthChange?: (month: string) => void
  onCategoryChange?: (category: string) => void
  onBankAccountChange?: (account: string) => void
}

export function HorizontalFilters({
  selectedPeriod,
  selectedYear,
  selectedQuarter,
  selectedMonth,
  selectedCategory,
  selectedBankAccount,
  onPeriodChange,
  onYearChange,
  onQuarterChange,
  onMonthChange,
  onCategoryChange,
  onBankAccountChange,
}: HorizontalFiltersProps) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="card-premium p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Período */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gold-500" />
          <div className="flex gap-2">
            <button
              onClick={() => onPeriodChange('Ano')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedPeriod === 'Ano'
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              Ano
            </button>
            <button
              onClick={() => onPeriodChange('Mês')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedPeriod === 'Mês'
                  ? 'bg-gold-500 text-white'
                  : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
              }`}
            >
              Mês
            </button>
          </div>
        </div>

        {/* Ano */}
        {onYearChange && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Ano:</label>
            <select
              value={selectedYear || currentYear.toString()}
              onChange={(e) => onYearChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-graphite-800 border border-graphite-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500 min-w-[80px]"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = currentYear - i
                return (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                )
              })}
            </select>
          </div>
        )}

        {/* Trimestre */}
        {onQuarterChange && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Trimestre:</label>
            <select
              value={selectedQuarter || ''}
              onChange={(e) => onQuarterChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-graphite-800 border border-graphite-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500 min-w-[100px]"
            >
              <option value="">Todos</option>
              <option value="T1">T1 (Jan-Mar)</option>
              <option value="T2">T2 (Abr-Jun)</option>
              <option value="T3">T3 (Jul-Set)</option>
              <option value="T4">T4 (Out-Dez)</option>
            </select>
          </div>
        )}

        {/* Mês */}
        {onMonthChange && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Mês:</label>
            <select
              value={selectedMonth || ''}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-graphite-800 border border-graphite-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500 min-w-[120px]"
            >
              <option value="">Todos</option>
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>
        )}

        {/* Categoria */}
        {onCategoryChange && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gold-500" />
            <label className="text-xs text-muted-foreground whitespace-nowrap">Categoria:</label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-graphite-800 border border-graphite-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500 min-w-[120px]"
            >
              <option value="">Todas</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
              <option value="imposto">Impostos</option>
            </select>
          </div>
        )}

        {/* Conta Bancária */}
        {onBankAccountChange && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gold-500" />
            <label className="text-xs text-muted-foreground whitespace-nowrap">Conta Bancária:</label>
            <select
              value={selectedBankAccount || ''}
              onChange={(e) => onBankAccountChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-graphite-800 border border-graphite-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500 min-w-[150px]"
            >
              <option value="">Todas</option>
              <option value="itau-royalties">Itaú - Royalties</option>
              <option value="itau-taxa">Itaú - Taxa</option>
              <option value="santander">Santander</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

