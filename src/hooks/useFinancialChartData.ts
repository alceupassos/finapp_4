// src/hooks/useFinancialChartData.ts

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface UseFinancialChartDataOptions {
  companyCnpj?: string
  companyId?: string
  dataInicio: string
  dataFim: string
  tipo: 'dre' | 'dfc' | 'summary'
  autoSync?: boolean
}

interface SyncStatus {
  syncing: boolean
  progress: number
  message: string
}

export function useFinancialChartData({
  companyCnpj,
  companyId,
  dataInicio,
  dataFim,
  tipo,
  autoSync = true
}: UseFinancialChartDataOptions) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    progress: 0,
    message: ''
  })

  useEffect(() => {
    fetchData()
  }, [companyCnpj, companyId, dataInicio, dataFim, tipo])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      // 1. Determinar tabela baseado no tipo
      const tableName = tipo === 'dre' ? 'dre_entries' : 
                        tipo === 'dfc' ? 'dfc_entries' : 
                        'dre_dfc_summaries'

      // 2. Construir query
      let query = supabase
        .from(tableName)
        .select('*')
        .gte('date', dataInicio)
        .lte('date', dataFim)
        .order('date', { ascending: true })

      // Filtrar por CNPJ ou company_id
      if (companyCnpj) {
        query = query.eq('company_cnpj', companyCnpj.replace(/\D/g, ''))
      } else if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data: supabaseData, error: supabaseError } = await query

      if (supabaseError) throw supabaseError

      console.log(`📊 useFinancialChartData: ${supabaseData?.length || 0} registros carregados (${tipo})`)

      // 3. Se não tiver dados E autoSync = true → sincronizar do F360
      if ((!supabaseData || supabaseData.length === 0) && autoSync) {
        console.log('📥 Dados não encontrados. Sincronizando do F360...')
        await syncFromF360()
        // Tentar buscar novamente após sincronização
        return fetchData()
      }

      setData(supabaseData || [])
      
    } catch (err: any) {
      console.error('❌ Erro ao buscar dados:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function syncFromF360() {
    try {
      setSyncStatus({ syncing: true, progress: 10, message: 'Conectando ao F360...' })

      // 1. Buscar empresa e token
      let cnpj = companyCnpj
      let token = null

      if (!cnpj && companyId) {
        const { data: company } = await supabase
          .from('companies')
          .select('cnpj, token_f360')
          .eq('id', companyId)
          .single()

        if (company) {
          cnpj = company.cnpj
          token = company.token_f360
        }
      } else if (cnpj) {
        const { data: company } = await supabase
          .from('companies')
          .select('token_f360')
          .eq('cnpj', cnpj.replace(/\D/g, ''))
          .single()

        if (company) {
          token = company.token_f360
        }
      }

      if (!cnpj || !token) {
        throw new Error('Empresa não encontrada ou sem token F360 configurado')
      }

      setSyncStatus({ syncing: true, progress: 30, message: 'Gerando relatório F360...' })

      // 2. Chamar Edge Function sync-f360
      const { data, error } = await supabase.functions.invoke('sync-f360', {
        body: {
          cnpj: cnpj.replace(/\D/g, ''),
          dataInicio,
          dataFim
        }
      })

      if (error) throw error

      setSyncStatus({ syncing: true, progress: 80, message: 'Processando dados...' })

      console.log('✅ Sincronização concluída:', data)

      setSyncStatus({ syncing: true, progress: 100, message: 'Concluído!' })
      
      // Aguardar 1 segundo antes de limpar status
      setTimeout(() => {
        setSyncStatus({ syncing: false, progress: 0, message: '' })
      }, 1000)

    } catch (err: any) {
      console.error('❌ Erro na sincronização F360:', err)
      setError(`Erro ao sincronizar: ${err.message}`)
      setSyncStatus({ syncing: false, progress: 0, message: '' })
    }
  }

  return {
    data,
    loading,
    error,
    syncing: syncStatus.syncing,
    syncProgress: syncStatus.progress,
    syncMessage: syncStatus.message,
    refetch: fetchData,
    syncFromF360
  }
}