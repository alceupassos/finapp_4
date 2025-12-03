#!/usr/bin/env tsx
/**
 * Script de Teste de Conexão OMIE
 * 
 * Este script testa a conexão com a API OMIE e tenta descobrir:
 * 1. Se a autenticação funciona (App Key + App Secret)
 * 2. Se conseguimos listar contas correntes
 * 3. Se conseguimos listar categorias (plano de contas)
 * 4. Estrutura completa dos dados retornados
 * 
 * Uso:
 *   npm run test:omie
 *   tsx scripts/test-omie-connection.ts
 */

import { createOMIEClient } from '../src/lib/omie/client'

interface TestResult {
  success: boolean
  appKey: string
  bankAccounts?: unknown[]
  chartOfAccounts?: unknown[]
  errors: string[]
  warnings: string[]
}

/**
 * Test OMIE connection
 */
async function testOMIEConnection(): Promise<TestResult> {
  const result: TestResult = {
    success: false,
    appKey: '',
    errors: [],
    warnings: [],
  }

  try {
    // 1. Check environment variables
    console.log('📋 Verificando variáveis de ambiente...')
    const appKey = process.env.OMIE_APP_KEY
    const appSecret = process.env.OMIE_APP_SECRET

    if (!appKey || !appSecret) {
      result.errors.push('OMIE_APP_KEY e OMIE_APP_SECRET devem estar configurados nas variáveis de ambiente')
      result.warnings.push('Configure OMIE_APP_KEY e OMIE_APP_SECRET no arquivo .env')
      return result
    }

    result.appKey = appKey.substring(0, 10) + '...' // Show only first 10 chars for security

    console.log(`\n🔑 Credenciais encontradas:`)
    console.log(`   App Key: ${appKey.substring(0, 10)}...`)

    // 2. Create OMIE client
    console.log('\n🔐 Criando cliente OMIE...')
    const omieClient = createOMIEClient()

    // 3. Test authentication by listing bank accounts
    console.log('\n🏦 Testando listagem de contas correntes...')
    try {
      const bankAccountsResponse = await omieClient.listBankAccounts()

      // Handle different response formats
      let bankAccounts: unknown[] = []
      
      if (Array.isArray(bankAccountsResponse)) {
        bankAccounts = bankAccountsResponse
      } else if (bankAccountsResponse.conta_corrente_cadastro && Array.isArray(bankAccountsResponse.conta_corrente_cadastro)) {
        bankAccounts = bankAccountsResponse.conta_corrente_cadastro
      } else if (bankAccountsResponse.data && Array.isArray(bankAccountsResponse.data)) {
        bankAccounts = bankAccountsResponse.data
      }

      if (bankAccounts.length > 0) {
        result.bankAccounts = bankAccounts
        result.success = true
        console.log(`✅ ${bankAccounts.length} conta(s) corrente(s) encontrada(s)`)
        
        // Show sample account
        console.log('\n📄 Exemplo de conta corrente:')
        console.log(JSON.stringify(bankAccounts[0], null, 2))
      } else {
        result.warnings.push('Nenhuma conta corrente retornada pela API')
        console.log('⚠️  Nenhuma conta corrente encontrada')
        console.log('📄 Resposta completa:', JSON.stringify(bankAccountsResponse, null, 2))
      }

    } catch (bankError) {
      result.errors.push(
        `Erro ao listar contas correntes: ${bankError instanceof Error ? bankError.message : 'Erro desconhecido'}`
      )
      console.error('❌ Erro ao listar contas correntes:', bankError)
    }

    // 4. Test listing chart of accounts (categories)
    console.log('\n📊 Testando listagem de categorias (plano de contas)...')
    try {
      const chartOfAccountsResponse = await omieClient.getChartOfAccounts()

      // Handle different response formats
      let chartOfAccounts: unknown[] = []
      
      if (Array.isArray(chartOfAccountsResponse)) {
        chartOfAccounts = chartOfAccountsResponse
      } else if (chartOfAccountsResponse.plano_conta_cadastro && Array.isArray(chartOfAccountsResponse.plano_conta_cadastro)) {
        chartOfAccounts = chartOfAccountsResponse.plano_conta_cadastro
      } else if (chartOfAccountsResponse.categoria_cadastro && Array.isArray(chartOfAccountsResponse.categoria_cadastro)) {
        chartOfAccounts = chartOfAccountsResponse.categoria_cadastro
      } else if (chartOfAccountsResponse.data && Array.isArray(chartOfAccountsResponse.data)) {
        chartOfAccounts = chartOfAccountsResponse.data
      }

      if (chartOfAccounts.length > 0) {
        result.chartOfAccounts = chartOfAccounts
        if (!result.success) {
          result.success = true // At least one call worked
        }
        console.log(`✅ ${chartOfAccounts.length} categoria(s) encontrada(s)`)

        // Show sample category
        console.log('\n📄 Exemplo de categoria:')
        console.log(JSON.stringify(chartOfAccounts[0], null, 2))
      } else {
        result.warnings.push('Nenhuma categoria retornada pela API')
        console.log('⚠️  Nenhuma categoria encontrada')
        console.log('📄 Resposta completa:', JSON.stringify(chartOfAccountsResponse, null, 2))
      }

    } catch (chartError) {
      result.errors.push(
        `Erro ao listar categorias: ${chartError instanceof Error ? chartError.message : 'Erro desconhecido'}`
      )
      console.error('❌ Erro ao listar categorias:', chartError)
    }

    // 5. Test listing companies (if available)
    console.log('\n🏢 Testando listagem de empresas...')
    try {
      const companiesResponse = await omieClient.request<{
        empresa_cadastro?: unknown[]
        total_de_registros?: number
        [key: string]: unknown
      }>('geral/empresas/', 'ListarEmpresas', {
        pagina: 1,
        registros_por_pagina: 10,
        apenas_importado_api: 'N',
      })

      // Handle different response formats
      let companies: unknown[] = []
      
      if (Array.isArray(companiesResponse)) {
        companies = companiesResponse
      } else if (companiesResponse.empresa_cadastro && Array.isArray(companiesResponse.empresa_cadastro)) {
        companies = companiesResponse.empresa_cadastro
      } else if (companiesResponse.data && Array.isArray(companiesResponse.data)) {
        companies = companiesResponse.data
      }

      if (companies.length > 0) {
        if (!result.success) {
          result.success = true // At least one call worked
        }
        console.log(`✅ ${companies.length} empresa(s) encontrada(s)`)

        // Show sample company
        console.log('\n📄 Exemplo de empresa:')
        console.log(JSON.stringify(companies[0], null, 2))
      } else {
        result.warnings.push('Nenhuma empresa retornada pela API')
        console.log('⚠️  Nenhuma empresa encontrada')
      }

    } catch (companyError) {
      // This might fail if the endpoint doesn't exist or requires different params
      result.warnings.push(
        `Não foi possível listar empresas: ${companyError instanceof Error ? companyError.message : 'Erro desconhecido'}`
      )
      console.log('⚠️  Aviso ao listar empresas:', companyError instanceof Error ? companyError.message : 'Erro desconhecido')
    }

  } catch (error) {
    result.errors.push(
      `Erro geral: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
    console.error('❌ Erro:', error)
  }

  return result
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Iniciando teste de conexão OMIE\n')
  console.log('='.repeat(60))

  const result = await testOMIEConnection()

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DO TESTE')
  console.log('='.repeat(60))
  console.log(`Status: ${result.success ? '✅ SUCESSO' : '❌ FALHA'}`)
  console.log(`App Key: ${result.appKey}`)
  
  if (result.bankAccounts) {
    console.log(`Contas Correntes: ${result.bankAccounts.length}`)
  }
  
  if (result.chartOfAccounts) {
    console.log(`Categorias (Plano de Contas): ${result.chartOfAccounts.length}`)
  }

  if (result.errors.length > 0) {
    console.log(`\n❌ Erros (${result.errors.length}):`)
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`)
    })
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  Avisos (${result.warnings.length}):`)
    result.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`)
    })
  }

  // Save detailed result to file
  const fs = await import('fs/promises')
  const resultPath = 'test-omie-result.json'
  await fs.writeFile(
    resultPath,
    JSON.stringify(result, null, 2),
    'utf-8'
  )
  console.log(`\n💾 Resultado detalhado salvo em: ${resultPath}`)

  process.exit(result.success ? 0 : 1)
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
}

export { testOMIEConnection }

