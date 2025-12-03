import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { SupabaseRest } from '../services/supabaseRest'
import * as XLSX from 'xlsx'

interface DFCExportButtonProps {
  selectedCompanies?: string[]
  selectedMonth?: string
  period?: 'Dia' | 'Semana' | 'Mês' | 'Ano'
}

export function DFCExportButton({ 
  selectedCompanies = [], 
  selectedMonth,
  period = 'Ano'
}: DFCExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (selectedCompanies.length === 0) {
      alert('Selecione pelo menos uma empresa para exportar')
      return
    }

    setLoading(true)

    try {
      // Buscar dados DFC para todas as empresas selecionadas
      const allDfcData: any[] = []

      for (const cnpj of selectedCompanies) {
        const dfcData = await SupabaseRest.getDFC(cnpj)
        if (Array.isArray(dfcData)) {
          allDfcData.push(...dfcData.map(item => ({
            ...item,
            empresa_cnpj: cnpj
          })))
        }
      }

      if (allDfcData.length === 0) {
        alert('Nenhum dado DFC encontrado para exportar')
        setLoading(false)
        return
      }

      // Preparar dados para Excel
      const worksheetData = allDfcData.map(item => ({
        'Empresa CNPJ': item.empresa_cnpj || '',
        'Data': item.data || item.date || '',
        'Descrição': item.descricao || item.category || '',
        'Entrada': item.entrada || 0,
        'Saída': item.saida || 0,
        'Saldo': item.saldo || 0,
        'Conta Bancária': item.bank_account || ''
      }))

      // Criar workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(worksheetData)
      XLSX.utils.book_append_sheet(wb, ws, 'DFC')

      // Gerar nome do arquivo
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `DFC_${selectedCompanies.length > 1 ? 'CONSOLIDADO' : selectedCompanies[0]}_${dateStr}.xlsx`

      // Download
      XLSX.writeFile(wb, fileName)

      setLoading(false)
    } catch (error: any) {
      console.error('Erro ao exportar DFC:', error)
      alert(`Erro ao exportar DFC: ${error.message}`)
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
          Exportar DFC
        </>
      )}
    </button>
  )
}

