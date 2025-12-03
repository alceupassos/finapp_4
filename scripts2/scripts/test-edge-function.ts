#!/usr/bin/env tsx
/**
 * Script para Testar Edge Functions do Supabase
 * 
 * Testa as Edge Functions calculate-dre, calculate-dfc, sync-f360, sync-omie e import-f360
 * 
 * Uso:
 *   tsx scripts/test-edge-function.ts calculate-dre <companyId> <year> [month]
 *   tsx scripts/test-edge-function.ts calculate-dfc <companyId> <year> [month]
 *   tsx scripts/test-edge-function.ts sync-f360 <token>
 *   tsx scripts/test-edge-function.ts sync-omie <appKey> <appSecret>
 *   tsx scripts/test-edge-function.ts import-f360 <token>
 */

import { loadEnvFromSupa } from './load-env-from-supa'

interface TestResult {
  success: boolean
  data?: unknown
  error?: string
  duration: number
}

/**
 * Testar Edge Function calculate-dre
 */
async function testCalculateDre(
  supabaseUrl: string,
  supabaseAnonKey: string,
  companyId: string,
  year: number,
  month?: number
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const body = { companyId, year, month }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/calculate-dre`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    const duration = Date.now() - startTime

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        duration,
      }
    }

    return {
      success: true,
      data,
      duration,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Testar Edge Function calculate-dfc
 */
async function testCalculateDfc(
  supabaseUrl: string,
  supabaseAnonKey: string,
  companyId: string,
  year: number,
  month?: number
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const body = { companyId, year, month }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/calculate-dfc`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    const duration = Date.now() - startTime

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        duration,
      }
    }

    return {
      success: true,
      data,
      duration,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Testar Edge Function sync-f360
 */
async function testSyncF360(
  supabaseUrl: string,
  supabaseAnonKey: string,
  token: string
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const body = { token }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/sync-f360`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    const duration = Date.now() - startTime

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        duration,
      }
    }

    return {
      success: true,
      data,
      duration,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Testar Edge Function sync-omie
 */
async function testSyncOmie(
  supabaseUrl: string,
  supabaseAnonKey: string,
  appKey: string,
  appSecret: string
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const body = { appKey, appSecret }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/sync-omie`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    const duration = Date.now() - startTime

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        duration,
      }
    }

    return {
      success: true,
      data,
      duration,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Testar Edge Function import-f360
 */
async function testImportF360(
  supabaseUrl: string,
  supabaseAnonKey: string,
  token: string
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const body = { token }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/import-f360`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    const duration = Date.now() - startTime

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        duration,
      }
    }

    return {
      success: true,
      data,
      duration,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Obter lista de empresas do banco para facilitar testes
 */
async function listCompanies(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Array<{ id: string; razao_social: string; cnpj: string }>> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/companies?select=id,razao_social,cnpj&active=eq.true`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    )

    if (!response.ok) {
      return []
    }

    return await response.json()
  } catch {
    return []
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🧪 Testando Edge Functions do Supabase...\n')

  // Carregar variáveis de ambiente
  await loadEnvFromSupa()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const args = process.argv.slice(2)
  const functionName = args[0]

  if (!functionName) {
    console.error('❌ Erro: Nome da função não fornecido')
    console.log('\nUso:')
    console.log('  tsx scripts/test-edge-function.ts calculate-dre <companyId> <year> [month]')
    console.log('  tsx scripts/test-edge-function.ts calculate-dfc <companyId> <year> [month]')
    console.log('  tsx scripts/test-edge-function.ts sync-f360 <token>')
    console.log('  tsx scripts/test-edge-function.ts sync-omie <appKey> <appSecret>')
    console.log('  tsx scripts/test-edge-function.ts import-f360 <token>')
    console.log('\nPara listar empresas disponíveis:')
    console.log('  tsx scripts/test-edge-function.ts list-companies')
    process.exit(1)
  }

  // Listar empresas se solicitado
  if (functionName === 'list-companies') {
    if (!supabaseServiceKey) {
      console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não encontrada')
      process.exit(1)
    }

    console.log('📋 Listando empresas disponíveis...\n')
    const companies = await listCompanies(supabaseUrl, supabaseServiceKey)

    if (companies.length === 0) {
      console.log('⚠️  Nenhuma empresa encontrada')
    } else {
      companies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.razao_social}`)
        console.log(`   ID: ${company.id}`)
        console.log(`   CNPJ: ${company.cnpj || 'N/A'}\n`)
      })
    }
    return
  }

  // Testar função específica
  let result: TestResult

  switch (functionName) {
    case 'calculate-dre': {
      const companyId = args[1]
      const year = parseInt(args[2])
      const month = args[3] ? parseInt(args[3]) : undefined

      if (!companyId || !year) {
        console.error('❌ Erro: companyId e year são obrigatórios')
        process.exit(1)
      }

      console.log(`🧪 Testando calculate-dre...`)
      console.log(`   Company ID: ${companyId}`)
      console.log(`   Year: ${year}`)
      if (month) console.log(`   Month: ${month}`)
      console.log()

      result = await testCalculateDre(supabaseUrl, supabaseAnonKey, companyId, year, month)
      break
    }

    case 'calculate-dfc': {
      const companyId = args[1]
      const year = parseInt(args[2])
      const month = args[3] ? parseInt(args[3]) : undefined

      if (!companyId || !year) {
        console.error('❌ Erro: companyId e year são obrigatórios')
        process.exit(1)
      }

      console.log(`🧪 Testando calculate-dfc...`)
      console.log(`   Company ID: ${companyId}`)
      console.log(`   Year: ${year}`)
      if (month) console.log(`   Month: ${month}`)
      console.log()

      result = await testCalculateDfc(supabaseUrl, supabaseAnonKey, companyId, year, month)
      break
    }

    case 'sync-f360': {
      const token = args[1]

      if (!token) {
        console.error('❌ Erro: token é obrigatório')
        process.exit(1)
      }

      console.log(`🧪 Testando sync-f360...`)
      console.log(`   Token: ${token.substring(0, 20)}...`)
      console.log()

      result = await testSyncF360(supabaseUrl, supabaseAnonKey, token)
      break
    }

    case 'sync-omie': {
      const appKey = args[1]
      const appSecret = args[2]

      if (!appKey || !appSecret) {
        console.error('❌ Erro: appKey e appSecret são obrigatórios')
        process.exit(1)
      }

      console.log(`🧪 Testando sync-omie...`)
      console.log(`   App Key: ${appKey.substring(0, 10)}...`)
      console.log()

      result = await testSyncOmie(supabaseUrl, supabaseAnonKey, appKey, appSecret)
      break
    }

    case 'import-f360': {
      const token = args[1]

      if (!token) {
        console.error('❌ Erro: token é obrigatório')
        process.exit(1)
      }

      console.log(`🧪 Testando import-f360...`)
      console.log(`   Token: ${token.substring(0, 20)}...`)
      console.log()

      result = await testImportF360(supabaseUrl, supabaseAnonKey, token)
      break
    }

    default:
      console.error(`❌ Erro: Função desconhecida: ${functionName}`)
      process.exit(1)
  }

  // Exibir resultado
  console.log('='.repeat(60))
  if (result.success) {
    console.log('✅ TESTE PASSOU')
    console.log(`⏱️  Duração: ${result.duration}ms`)
    console.log('\n📊 Resposta:')
    console.log(JSON.stringify(result.data, null, 2))
  } else {
    console.log('❌ TESTE FALHOU')
    console.log(`⏱️  Duração: ${result.duration}ms`)
    console.log(`\n❌ Erro: ${result.error}`)
  }
  console.log('='.repeat(60))
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
}
