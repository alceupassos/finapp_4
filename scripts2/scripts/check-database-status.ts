#!/usr/bin/env tsx
/**
 * Script para verificar o status do banco de dados
 * Verifica se há empresas, lançamentos contábeis e plano de contas
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database.types'
import { loadEnvFromSupa } from './load-env-from-supa'

async function createSupabaseClient() {
  // Carregar variáveis de ambiente do supa.txt se não estiverem definidas
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await loadEnvFromSupa()
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}

async function checkDatabaseStatus() {
  console.log('🔍 Verificando status do banco de dados...\n')

  const supabase = await createSupabaseClient()

  // 1. Verificar empresas
  console.log('📊 Verificando empresas...')
  const { data: allCompanies, error: companiesError } = await supabase
    .from('companies')
    .select('id, razao_social, cnpj, active, erp_type')

  if (companiesError) {
    console.error('❌ Erro ao buscar empresas:', companiesError.message)
    return
  }

  const totalCompanies = allCompanies?.length || 0
  const activeCompanies = allCompanies?.filter((c) => c.active) || []
  const f360Companies = allCompanies?.filter((c) => c.erp_type === 'F360' || c.erp_type === 'BOTH') || []
  const omieCompanies = allCompanies?.filter((c) => c.erp_type === 'OMIE' || c.erp_type === 'BOTH') || []

  console.log(`   Total de empresas: ${totalCompanies}`)
  console.log(`   Empresas ativas: ${activeCompanies.length}`)
  console.log(`   Empresas F360: ${f360Companies.length}`)
  console.log(`   Empresas OMIE: ${omieCompanies.length}\n`)

  if (activeCompanies.length === 0) {
    console.warn('⚠️  NENHUMA EMPRESA ATIVA ENCONTRADA!')
    console.warn('   Execute: npm run import:test para importar dados\n')
  } else {
    console.log('✅ Empresas ativas encontradas:')
    activeCompanies.slice(0, 5).forEach((company) => {
      console.log(`   - ${company.razao_social} (${company.cnpj || 'sem CNPJ'})`)
    })
    if (activeCompanies.length > 5) {
      console.log(`   ... e mais ${activeCompanies.length - 5} empresas\n`)
    } else {
      console.log()
    }
  }

  // 2. Verificar plano de contas
  console.log('📋 Verificando plano de contas...')
  const { data: accounts, error: accountsError } = await supabase
    .from('chart_of_accounts')
    .select('id, company_id, code, name')
    .limit(100)

  if (accountsError) {
    console.error('❌ Erro ao buscar plano de contas:', accountsError.message)
  } else {
    const totalAccounts = accounts?.length || 0
    const accountsByCompany = new Map<string, number>()
    
    accounts?.forEach((acc) => {
      const count = accountsByCompany.get(acc.company_id) || 0
      accountsByCompany.set(acc.company_id, count + 1)
    })

    console.log(`   Total de contas: ${totalAccounts}`)
    console.log(`   Empresas com plano de contas: ${accountsByCompany.size}\n`)

    if (totalAccounts === 0) {
      console.warn('⚠️  NENHUM PLANO DE CONTAS ENCONTRADO!')
      console.warn('   Execute: npm run import:test para importar dados\n')
    }
  }

  // 3. Verificar lançamentos contábeis
  console.log('📝 Verificando lançamentos contábeis...')
  const { data: entries, error: entriesError } = await supabase
    .from('accounting_entries')
    .select('id, company_id, competence_date')
    .gte('competence_date', '2025-01-01')
    .lte('competence_date', '2025-12-31')
    .limit(1000)

  if (entriesError) {
    console.error('❌ Erro ao buscar lançamentos:', entriesError.message)
  } else {
    const totalEntries = entries?.length || 0
    const entriesByCompany = new Map<string, number>()
    
    entries?.forEach((entry) => {
      const count = entriesByCompany.get(entry.company_id) || 0
      entriesByCompany.set(entry.company_id, count + 1)
    })

    console.log(`   Total de lançamentos (2025): ${totalEntries}`)
    console.log(`   Empresas com lançamentos: ${entriesByCompany.size}\n`)

    if (totalEntries === 0) {
      console.warn('⚠️  NENHUM LANÇAMENTO CONTÁBIL ENCONTRADO PARA 2025!')
      console.warn('   Execute: npm run import:test para importar dados\n')
    } else {
      // Mostrar distribuição por mês
      const entriesByMonth = new Map<string, number>()
      entries?.forEach((entry) => {
        const month = entry.competence_date.substring(0, 7) // YYYY-MM
        const count = entriesByMonth.get(month) || 0
        entriesByMonth.set(month, count + 1)
      })

      console.log('   Distribuição por mês:')
      Array.from(entriesByMonth.entries())
        .sort()
        .forEach(([month, count]) => {
          console.log(`     ${month}: ${count} lançamentos`)
        })
      console.log()
    }
  }

  // 4. Verificar logs de importação
  console.log('📥 Verificando logs de importação...')
  const { data: logs, error: logsError } = await supabase
    .from('import_logs')
    .select('id, company_id, status, started_at, records_imported')
    .order('started_at', { ascending: false })
    .limit(10)

  if (logsError) {
    console.error('❌ Erro ao buscar logs:', logsError.message)
  } else {
    const totalLogs = logs?.length || 0
    const successLogs = logs?.filter((log) => log.status === 'SUCESSO') || []
    const errorLogs = logs?.filter((log) => log.status === 'ERRO') || []

    console.log(`   Total de logs: ${totalLogs}`)
    console.log(`   Importações bem-sucedidas: ${successLogs.length}`)
    console.log(`   Importações com erro: ${errorLogs.length}\n`)

    if (totalLogs > 0) {
      console.log('   Últimas importações:')
      logs?.slice(0, 5).forEach((log) => {
        const date = new Date(log.started_at).toLocaleString('pt-BR')
        const status = log.status === 'SUCESSO' ? '✅' : log.status === 'ERRO' ? '❌' : '⏳'
        console.log(`     ${status} ${date} - ${log.records_imported || 0} registros`)
      })
      console.log()
    }
  }

  // 5. Resumo e recomendações
  console.log('📊 RESUMO:')
  console.log('='.repeat(60))
  
  if (activeCompanies.length === 0) {
    console.log('❌ PROBLEMA CRÍTICO: Nenhuma empresa ativa encontrada')
    console.log('   AÇÃO: Execute "npm run import:test" para importar dados\n')
  } else if (entries?.length === 0) {
    console.log('⚠️  ATENÇÃO: Empresas encontradas, mas sem lançamentos contábeis')
    console.log('   AÇÃO: Execute "npm run import:test" para importar lançamentos\n')
  } else {
    console.log('✅ Banco de dados está populado e pronto para uso!')
    console.log(`   - ${activeCompanies.length} empresas ativas`)
    console.log(`   - ${entries?.length || 0} lançamentos contábeis em 2025`)
    console.log(`   - ${accounts?.length || 0} contas no plano de contas\n`)
  }

  console.log('='.repeat(60))
}

async function main() {
  try {
    await checkDatabaseStatus()
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  }
}

main()

