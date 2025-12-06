/**
 * Script Unificado de Importação F360
 * 
 * Importa dados de todas as empresas ativas do Supabase para Outubro/2025
 * 
 * Características:
 * - Detecta automaticamente se é GRUPO ou EMPRESA SIMPLES
 * - Usa Edge Function sync-f360 (produção)
 * - Logs detalhados por empresa
 * - Tratamento de erros individual (se uma falhar, continua)
 * - Suporta múltiplas empresas e grupos
 * 
 * Uso:
 *   node scripts/import_f360_unified.mjs
 *   node scripts/import_f360_unified.mjs --month=10 --year=2025
 *   node scripts/import_f360_unified.mjs --company-cnpj=26888098000159
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas')
  console.error('   Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local')
  process.exit(1)
}

// Parse argumentos
const args = process.argv.slice(2)
const monthArg = args.find(arg => arg.startsWith('--month='))
const yearArg = args.find(arg => arg.startsWith('--year='))
const companyCnpjArg = args.find(arg => arg.startsWith('--company-cnpj='))

const targetMonth = monthArg ? parseInt(monthArg.split('=')[1]) : 10 // Outubro
const targetYear = yearArg ? parseInt(yearArg.split('=')[1]) : 2025
const targetCompanyCnpj = companyCnpjArg ? companyCnpjArg.split('=')[1] : null

// Calcular datas do período
const dataInicio = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
const ultimoDia = new Date(targetYear, targetMonth, 0).getDate()
const dataFim = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

/**
 * Normalizar CNPJ
 */
function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

/**
 * Chamar Edge Function sync-f360 (SINGLE)
 */
async function syncSingleCompany(supabaseUrl, anonKey, cnpj, dataInicio, dataFim) {
  const response = await fetch(`${supabaseUrl}/functions/v1/sync-f360`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cnpj: normalizeCnpj(cnpj),
      dataInicio,
      dataFim,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Edge Function error: ${response.status} - ${text}`)
  }

  return response.json()
}

/**
 * Chamar Edge Function sync-f360/group (GROUP)
 */
async function syncGroup(supabaseUrl, anonKey, token, expectedCnpjs, dataInicio, dataFim) {
  const response = await fetch(`${supabaseUrl}/functions/v1/sync-f360/group`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      expectedCnpjs: expectedCnpjs.map(normalizeCnpj),
      dataInicio,
      dataFim,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Edge Function error: ${response.status} - ${text}`)
  }

  return response.json()
}

/**
 * Buscar empresas filhas de um grupo
 */
async function getGroupCompanies(supabase, groupId) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, cnpj, razao_social')
    .eq('parent_company_id', groupId)
    .eq('active', true)

  if (error) throw error
  return data || []
}

/**
 * Processar uma empresa (SINGLE ou GROUP)
 */
async function processCompany(supabase, company, supabaseUrl, anonKey, dataInicio, dataFim) {
  const { id, cnpj, razao_social, token_f360, is_group, group_token } = company

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🏢 ${razao_social}`)
  console.log(`   CNPJ: ${cnpj}`)
  console.log(`   Tipo: ${is_group ? 'GRUPO' : 'EMPRESA SIMPLES'}`)
  console.log(`${'='.repeat(60)}`)

  if (!token_f360) {
    console.log(`   ⚠️  Sem token F360, pulando...`)
    return { success: false, reason: 'Sem token F360' }
  }

  try {
    if (is_group) {
      // GRUPO: Buscar empresas filhas e chamar sync-f360/group
      console.log(`   📦 Processando como GRUPO...`)
      
      const groupCompanies = await getGroupCompanies(supabase, id)
      if (groupCompanies.length === 0) {
        console.log(`   ⚠️  Nenhuma empresa filha encontrada, pulando...`)
        return { success: false, reason: 'Sem empresas filhas' }
      }

      const expectedCnpjs = groupCompanies.map(c => c.cnpj)
      console.log(`   📋 Empresas filhas: ${expectedCnpjs.length}`)
      expectedCnpjs.slice(0, 5).forEach(cnpj => console.log(`      - ${cnpj}`))
      if (expectedCnpjs.length > 5) {
        console.log(`      ... e mais ${expectedCnpjs.length - 5}`)
      }

      const result = await syncGroup(
        supabaseUrl,
        anonKey,
        group_token || token_f360,
        expectedCnpjs,
        dataInicio,
        dataFim
      )

      console.log(`   ✅ GRUPO processado:`)
      console.log(`      DRE: ${result.dreEntries || 0}`)
      console.log(`      DFC: ${result.dfcEntries || 0}`)
      console.log(`      Accounting: ${result.accountingEntries || 0}`)

      return {
        success: result.success !== false,
        mode: 'GROUP',
        companiesFound: result.companiesFound || expectedCnpjs.length,
        dreEntries: result.dreEntries || 0,
        dfcEntries: result.dfcEntries || 0,
        accountingEntries: result.accountingEntries || 0,
        errors: result.errors || null,
      }
    } else {
      // EMPRESA SIMPLES: Chamar sync-f360 diretamente
      console.log(`   📊 Processando como EMPRESA SIMPLES...`)
      
      const result = await syncSingleCompany(
        supabaseUrl,
        anonKey,
        cnpj,
        dataInicio,
        dataFim
      )

      console.log(`   ✅ EMPRESA SIMPLES processada:`)
      console.log(`      DRE: ${result.dreEntries || 0}`)
      console.log(`      DFC: ${result.dfcEntries || 0}`)
      console.log(`      Accounting: ${result.accountingEntries || 0}`)

      return {
        success: result.success !== false,
        mode: 'SINGLE',
        companiesFound: 1,
        dreEntries: result.dreEntries || 0,
        dfcEntries: result.dfcEntries || 0,
        accountingEntries: result.accountingEntries || 0,
        errors: result.errors || null,
      }
    }
  } catch (error) {
    console.error(`   ❌ Erro ao processar: ${error.message}`)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Importação Unificada F360\n')
  console.log('='.repeat(60))
  console.log(`📅 Período: ${dataInicio} a ${dataFim}`)
  console.log(`📊 Mês: ${targetMonth}/${targetYear}`)
  if (targetCompanyCnpj) {
    console.log(`🎯 Empresa específica: ${targetCompanyCnpj}`)
  }
  console.log('='.repeat(60))

  // Criar cliente Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Buscar empresas
  console.log('\n📋 Buscando empresas no banco...')
  let query = supabase
    .from('companies')
    .select('id, cnpj, razao_social, token_f360, is_group, group_token, parent_company_id')
    .eq('active', true)

  if (targetCompanyCnpj) {
    query = query.eq('cnpj', normalizeCnpj(targetCompanyCnpj))
  } else {
    // Filtrar apenas empresas que não são filhas (ou grupos)
    // Empresas filhas serão processadas via grupo
    query = query.or('parent_company_id.is.null,is_group.eq.true')
  }

  const { data: companies, error: companiesError } = await query

  if (companiesError) {
    console.error('❌ Erro ao buscar empresas:', companiesError.message)
    process.exit(1)
  }

  if (!companies || companies.length === 0) {
    console.log('⚠️  Nenhuma empresa encontrada')
    process.exit(0)
  }

  console.log(`✅ ${companies.length} empresa(s) encontrada(s)\n`)

  // Estatísticas
  const stats = {
    total: companies.length,
    processed: 0,
    success: 0,
    errors: 0,
    dreTotal: 0,
    dfcTotal: 0,
    accountingTotal: 0,
    errorsList: [],
  }

  // Processar cada empresa
  for (const company of companies) {
    stats.processed++
    const result = await processCompany(
      supabase,
      company,
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      dataInicio,
      dataFim
    )

    if (result.success) {
      stats.success++
      stats.dreTotal += result.dreEntries || 0
      stats.dfcTotal += result.dfcEntries || 0
      stats.accountingTotal += result.accountingEntries || 0
    } else {
      stats.errors++
      stats.errorsList.push({
        company: company.razao_social,
        cnpj: company.cnpj,
        error: result.error || result.reason || 'Erro desconhecido',
      })
    }

    // Delay entre empresas para evitar rate limiting
    if (stats.processed < stats.total) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  // Resumo final
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 RESUMO DA IMPORTAÇÃO')
  console.log('='.repeat(60))
  console.log(`✅ Empresas processadas: ${stats.processed}/${stats.total}`)
  console.log(`✅ Sucesso: ${stats.success}`)
  console.log(`❌ Erros: ${stats.errors}`)
  console.log(`📊 DRE entries: ${stats.dreTotal.toLocaleString()}`)
  console.log(`📊 DFC entries: ${stats.dfcTotal.toLocaleString()}`)
  console.log(`📊 Accounting entries: ${stats.accountingTotal.toLocaleString()}`)
  console.log(`📊 Total: ${(stats.dreTotal + stats.dfcTotal + stats.accountingTotal).toLocaleString()}`)

  if (stats.errorsList.length > 0) {
    console.log(`\n⚠️  ERROS ENCONTRADOS:`)
    stats.errorsList.forEach(({ company, cnpj, error }) => {
      console.log(`   - ${company} (${cnpj}): ${error}`)
    })
  }

  console.log('='.repeat(60))
  console.log('\n✅ Importação concluída!\n')
}

main().catch(error => {
  console.error('\n❌ Erro fatal:', error)
  process.exit(1)
})



