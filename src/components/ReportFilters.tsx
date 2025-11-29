import { useState, useEffect } from 'react'
import { Filter, Calendar, Building2, Users } from 'lucide-react'
import { SupabaseRest, MATRIZ_CNPJ } from '../services/supabaseRest'

type Company = { cliente_nome?: string; cnpj?: string; grupo_empresarial?: string }

interface ReportFiltersProps {
  selectedPeriod: 'Ano' | 'Mês'
  selectedCompany: string
  selectedGroup: string
  onPeriodChange: (period: 'Ano' | 'Mês') => void
  onCompanyChange: (cnpj: string) => void
  onGroupChange: (group: string) => void
}

export function ReportFilters({
  selectedPeriod,
  selectedCompany,
  selectedGroup,
  onPeriodChange,
  onCompanyChange,
  onGroupChange,
}: ReportFiltersProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const cs = await SupabaseRest.getCompanies() as Company[]
        setCompanies(cs || [])
        const uniqueGroups = Array.from(new Set((cs || []).map(c => c.grupo_empresarial).filter(Boolean))) as string[]
        setGroups(uniqueGroups)
        if (cs.length > 0 && !selectedCompany) {
          onCompanyChange(cs[0].cnpj || MATRIZ_CNPJ)
        }
        if (uniqueGroups.length > 0 && !selectedGroup) {
          onGroupChange(uniqueGroups[0])
        }
      } catch (err) {
        console.error('Erro ao carregar empresas:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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

      {/* Grupo Empresarial */}
      {groups.length > 0 && (
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Users className="w-3 h-3" />
            Grupo Empresarial
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => onGroupChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-graphite-800 border border-graphite-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empresa */}
      {companies.length > 0 && (
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Building2 className="w-3 h-3" />
            Empresa
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-graphite-800 border border-graphite-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {companies
              .filter((c) => !selectedGroup || c.grupo_empresarial === selectedGroup)
              .map((company) => (
                <option key={company.cnpj} value={company.cnpj || ''}>
                  {company.cliente_nome || company.cnpj}
                </option>
              ))}
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

