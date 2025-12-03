import { useState, useEffect } from 'react'
import { Filter, Calendar, Building2 } from 'lucide-react'
import { SupabaseRest, MATRIZ_CNPJ } from '../services/supabaseRest'

type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }

interface ReportFiltersProps {
  selectedPeriod: 'Ano' | 'Mês'
  selectedCompany: string
  selectedGroup: string
  selectedYear?: string
  selectedQuarter?: string
  selectedMonth?: string
  selectedCategory?: string
  selectedDepartment?: string
  companies?: Company[]
  onPeriodChange: (period: 'Ano' | 'Mês') => void
  onCompanyChange?: (cnpj: string) => void
  onGroupChange: (group: string) => void
  onYearChange?: (year: string) => void
  onQuarterChange?: (quarter: string) => void
  onMonthChange?: (month: string) => void
  onCategoryChange?: (category: string) => void
  onDepartmentChange?: (department: string) => void
}

export function ReportFilters({
  selectedPeriod,
  selectedCompany,
  selectedGroup,
  selectedYear,
  selectedQuarter,
  selectedMonth,
  selectedCategory,
  selectedDepartment,
  companies: propCompanies = [],
  onPeriodChange,
  onCompanyChange,
  onGroupChange,
  onYearChange,
  onQuarterChange,
  onMonthChange,
  onCategoryChange,
  onDepartmentChange,
}: ReportFiltersProps) {
  // Usar empresas passadas como prop ou carregar localmente se não fornecidas
  const [localCompanies, setLocalCompanies] = useState<Company[]>([])
  const companies = propCompanies.length > 0 ? propCompanies : localCompanies
  const [loading, setLoading] = useState(propCompanies.length === 0)

  useEffect(() => {
    if (propCompanies.length > 0) {
      // Se empresas foram passadas, usar diretamente
      setLoading(false)
    } else {
      // Se não, carregar localmente (fallback)
      (async () => {
        try {
          const cs = await SupabaseRest.getCompanies() as Company[]
          setLocalCompanies(cs || [])
          if (cs.length > 0 && !selectedCompany && onCompanyChange) {
            onCompanyChange(cs[0].cnpj || MATRIZ_CNPJ)
          }
        } catch (err) {
          console.error('Erro ao carregar empresas:', err)
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [propCompanies])

  return (
    <div className="card-premium p-5 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-gold-500" />
        <h3 className="text-sm font-semibold">Filtros</h3>
      </div>

      {/* Período */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <Calendar className="w-3 h-3" />
          Período
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onPeriodChange('Ano')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              selectedPeriod === 'Ano'
                ? 'bg-gold-500 text-white'
                : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
            }`}
          >
            Ano
          </button>
          <button
            onClick={() => onPeriodChange('Mês')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              selectedPeriod === 'Mês'
                ? 'bg-gold-500 text-white'
                : 'bg-graphite-800 text-graphite-300 hover:bg-graphite-700'
            }`}
          >
            Mês
          </button>
        </div>
      </div>


      {/* Empresa - Desabilitado, controlado pelos filtros globais */}
      {companies.length > 0 && (
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Building2 className="w-3 h-3" />
            Empresa
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => onCompanyChange?.(e.target.value)}
            disabled={propCompanies.length > 0}
            className="w-full px-3 py-2 rounded-lg bg-graphite-800 border border-graphite-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {companies
              .map((company) => (
                <option key={company.cnpj} value={company.cnpj || ''}>
                  {company.cliente_nome || company.cnpj}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Ano */}
      {onYearChange && (
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Calendar className="w-3 h-3" />
            Ano
          </label>
          <select
            value={selectedYear || new Date().getFullYear().toString()}
            onChange={(e) => onYearChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-graphite-800 border border-graphite-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i
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
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Calendar className="w-3 h-3" />
            Trimestre
          </label>
          <select
            value={selectedQuarter || ''}
            onChange={(e) => onQuarterChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-graphite-800 border border-graphite-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Calendar className="w-3 h-3" />
            Mês
          </label>
          <select
            value={selectedMonth || ''}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-graphite-800 border border-graphite-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Filter className="w-3 h-3" />
            Categoria
          </label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-graphite-800 border border-graphite-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="">Todas</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
            <option value="imposto">Impostos</option>
          </select>
        </div>
      )}

      {/* Departamento */}
      {onDepartmentChange && (
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Building2 className="w-3 h-3" />
            Departamento
          </label>
          <select
            value={selectedDepartment || ''}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-graphite-800 border border-graphite-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="">Todos</option>
            <option value="comercial">Comercial</option>
            <option value="administrativo">Administrativo</option>
            <option value="pessoal">Pessoal</option>
            <option value="financeiro">Financeiro</option>
          </select>
        </div>
      )}

      {loading && (
        <div className="text-xs text-muted-foreground text-center py-4">
          Carregando...
        </div>
      )}
    </div>
  )
}

