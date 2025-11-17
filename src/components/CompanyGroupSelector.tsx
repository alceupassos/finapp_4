import { useState } from 'react'
import { Check, ChevronDown, Building2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Company {
  cnpj: string
  cliente_nome: string
  grupo_empresarial: string
}

interface CompanyGroupSelectorProps {
  companies: Company[]
  selectedCompanies: string[]
  onChange: (companies: string[]) => void
}

export function CompanyGroupSelector({ companies, selectedCompanies, onChange }: CompanyGroupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleCompany = (cnpj: string) => {
    if (selectedCompanies.includes(cnpj)) {
      onChange(selectedCompanies.filter(c => c !== cnpj))
    } else {
      onChange([...selectedCompanies, cnpj])
    }
  }

  const selectAll = () => {
    onChange(companies.map(c => c.cnpj))
  }

  const clearAll = () => {
    onChange([])
  }

  const selectedNames = companies
    .filter(c => selectedCompanies.includes(c.cnpj))
    .map(c => c.cliente_nome)

  const displayText = selectedCompanies.length === 0
    ? 'Selecione empresas...'
    : selectedCompanies.length === 1
    ? selectedNames[0]
    : selectedCompanies.length === companies.length
    ? 'Todas as empresas (Grupo Consolidado)'
    : `${selectedCompanies.length} empresas selecionadas`

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-750 transition-colors text-sm min-w-[280px]"
      >
        <Building2 size={16} className="text-blue-400" />
        <span className="flex-1 text-left truncate">{displayText}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-full min-w-[320px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-[400px] overflow-hidden"
            >
              {/* Header com ações */}
              <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-750">
                <span className="text-xs font-medium text-slate-400 uppercase">
                  Agrupar Empresas
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors"
                  >
                    Todas
                  </button>
                  <button
                    onClick={clearAll}
                    className="text-xs px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Lista de empresas */}
              <div className="overflow-y-auto max-h-[320px]">
                {companies.map((company) => {
                  const isSelected = selectedCompanies.includes(company.cnpj)
                  return (
                    <button
                      key={company.cnpj}
                      onClick={() => toggleCompany(company.cnpj)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-750 transition-colors border-b border-slate-700/50 last:border-0 ${
                        isSelected ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-slate-600 hover:border-slate-500'
                      }`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>

                      {/* Info da empresa */}
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-slate-200">
                          {company.cliente_nome}
                        </div>
                        <div className="text-xs text-slate-500">
                          CNPJ: {company.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                        </div>
                      </div>

                      {/* Badge se matriz */}
                      {company.cnpj === '26888098000159' && (
                        <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                          Matriz
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Footer com contador */}
              <div className="px-4 py-2 border-t border-slate-700 bg-slate-750/50">
                <div className="text-xs text-slate-400">
                  {selectedCompanies.length === 0 ? (
                    'Nenhuma empresa selecionada'
                  ) : (
                    <>
                      <span className="text-blue-400 font-medium">{selectedCompanies.length}</span>
                      {' '}de{' '}
                      <span className="text-slate-300">{companies.length}</span>
                      {' '}empresas selecionadas
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tags das empresas selecionadas (opcional, se quiser mostrar abaixo) */}
      {selectedCompanies.length > 0 && selectedCompanies.length < companies.length && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {companies
            .filter(c => selectedCompanies.includes(c.cnpj))
            .slice(0, 3)
            .map((company) => (
              <div
                key={company.cnpj}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400"
              >
                <span className="truncate max-w-[120px]">{company.cliente_nome}</span>
                <button
                  onClick={() => toggleCompany(company.cnpj)}
                  className="hover:text-blue-300 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          {selectedCompanies.length > 3 && (
            <div className="inline-flex items-center px-2 py-1 bg-slate-700 rounded text-xs text-slate-400">
              +{selectedCompanies.length - 3} mais
            </div>
          )}
        </div>
      )}
    </div>
  )
}
