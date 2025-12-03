import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { SupabaseRest } from '../services/supabaseRest'
import * as XLSX from 'xlsx'

interface DREExportButtonProps {
  selectedCompanies?: string[]
  selectedMonth?: string
  period?: 'Dia' | 'Semana' | 'Mês' | 'Ano'
}

export function DREExportButton({ 
  selectedCompanies = [], 
  selectedMonth,
  period = 'Ano'
}: DREExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (selectedCompanies.length === 0) {
      alert('Selecione pelo menos uma empresa para exportar')
      return
    }

    setLoading(true)

    try {
      // Buscar dados DRE para todas as empresas selecionadas
      const allDreData: any[] = []

      for (const cnpj of selectedCompanies) {
        const dreData = await SupabaseRest.getDRE(cnpj)
        if (Array.isArray(dreData)) {
          allDreData.push(...dreData.map(item => ({
            ...item,
            empresa_cnpj: cnpj
          })))
        }
      }

      if (allDreData.length === 0) {
        alert('Nenhum dado DRE encontrado para exportar')
        setLoading(false)
        return
      }

      // Preparar dados para Excel
      const worksheetData = allDreData.map(item => ({
        'Empresa CNPJ': item.empresa_cnpj || '',
        'Data': item.data || item.date || '',
        'Conta': item.conta || item.account || '',
        'Natureza': item.natureza || item.nature || '',
        'Valor': item.valor || item.amount || 0
      }))

      // Criar workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(worksheetData)
      XLSX.utils.book_append_sheet(wb, ws, 'DRE')

      // Gerar nome do arquivo
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `DRE_${selectedCompanies.length > 1 ? 'CONSOLIDADO' : selectedCompanies[0]}_${dateStr}.xlsx`

      // Download
      XLSX.writeFile(wb, fileName)

      setLoading(false)
    } catch (error: any) {
      console.error('Erro ao exportar DRE:', error)
      alert(`Erro ao exportar DRE: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading || selectedCompanies.length === 0}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Exportar DRE
        </>
      )}
    </button>
  )
}

