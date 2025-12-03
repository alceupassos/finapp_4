#!/usr/bin/env tsx
/**
 * Script de Teste de Conexão F360
 * 
 * Este script testa a conexão com a API F360 e tenta descobrir:
 * 1. Se o login funciona
 * 2. Se conseguimos listar contas bancárias (sem precisar de CNPJ)
 * 3. Se conseguimos extrair CNPJs das contas bancárias
 * 4. Estrutura completa dos dados retornados
 * 
 * Uso:
 *   npm run test:f360
 *   tsx scripts/test-f360-connection.ts [token_index]
 */

import { parseF360Tokens, getF360TokenById } from '../src/lib/f360/token-parser'
import { createF360Service } from '../src/lib/f360/client'

interface BankAccount {
  Id?: string
  Nome?: string
  TipoDeConta?: string
  Agencia?: string
  Conta?: string
  DigitoConta?: string
  NumeroBanco?: number
  CNPJ?: string
  RazaoSocial?: string
  [key: string]: unknown
}

interface TestResult {
  success: boolean
  token: string
  companyName: string
  jwtToken?: string
  bankAccounts?: BankAccount[]
  extractedCnpjs?: string[]
  errors: string[]
  warnings: string[]
}

/**
 * Extract CNPJ from various fields in bank account data
 */
function extractCnpjsFromBankAccounts(accounts: BankAccount[]): string[] {
  const cnpjs = new Set<string>()
  
  for (const account of accounts) {
    // Try different possible field names
    const possibleCnpjFields = [
      'CNPJ',
      'cnpj',
      'Cnpj',
      'CnpjEmpresa',
      'CNPJEmpresa',
      'EmpresaCNPJ',
      'Documento',
      'documento',
    ]
    
    for (const field of possibleCnpjFields) {
      if (account[field]) {
        const value = String(account[field])
        // Clean CNPJ format (remove dots, slashes, dashes)
        const cleaned = value.replace(/[.\-\/]/g, '')
        // Validate CNPJ length (14 digits)
        if (/^\d{14}$/.test(cleaned)) {
          // Format as CNPJ: XX.XXX.XXX/XXXX-XX
          const formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`
          cnpjs.add(formatted)
        }
      }
    }
    
    // Also try to extract from account name or other text fields
    const textFields = ['Nome', 'RazaoSocial', 'NomeEmpresa', 'Descricao']
    for (const field of textFields) {
      if (account[field]) {
        const text = String(account[field])
        // Look for CNPJ pattern in text
        const cnpjMatch = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/)
        if (cnpjMatch) {
          cnpjs.add(cnpjMatch[0])
        }
      }
    }
  }
  
  return Array.from(cnpjs)
}

/**
 * Test F360 connection with a specific token
 */
async function testF360Connection(
  tokenIndex?: number
): Promise<TestResult> {
  const result: TestResult = {
    success: false,
    token: '',
    companyName: '',
    errors: [],
    warnings: [],
  }

  try {
    // 1. Get token from tokens_f360.json
    console.log('📋 Carregando tokens F360...')
    const tokens = await parseF360Tokens()
    
    if (tokens.length === 0) {
      result.errors.push('Nenhum token encontrado em tokens_f360.json')
      return result
    }

    // Select token
    let selectedToken
    if (tokenIndex !== undefined) {
      selectedToken = tokens[tokenIndex]
      if (!selectedToken) {
        result.errors.push(`Token no índice ${tokenIndex} não encontrado`)
        return result
      }
    } else {
      // Use first token by default
      selectedToken = tokens[0]
    }

    result.token = selectedToken.token
    result.companyName = selectedToken.companyName

    console.log(`\n🔑 Testando com token:`)
    console.log(`   ID: ${selectedToken.id}`)
    console.log(`   Empresa: ${selectedToken.companyName}`)
    console.log(`   Token: ${selectedToken.token.substring(0, 20)}...`)

    // 2. Create F360 service
    // O token da empresa é usado diretamente - não precisa de F360_LOGIN_TOKEN
    const f360Service = createF360Service(selectedToken)

    // 3. Test authentication (this will be called internally)
    console.log('\n🔐 Testando autenticação...')
    try {
      // Try to make a request that requires authentication
      // We'll use ListarContasBancarias which doesn't need CNPJ
      const bankAccountsResponse = await f360Service.listBankAccounts()

      // If we got here, authentication worked
      result.success = true
      console.log('✅ Autenticação bem-sucedida!')

      // 4. Parse bank accounts response
      console.log('\n🏦 Analisando contas bancárias...')
      
      const bankAccounts: BankAccount[] = bankAccountsResponse as BankAccount[]

      if (bankAccounts.length > 0) {
        result.bankAccounts = bankAccounts
        console.log(`✅ ${bankAccounts.length} conta(s) bancária(s) encontrada(s)`)

        // 5. Extract CNPJs from bank accounts
        console.log('\n🔍 Extraindo CNPJs das contas bancárias...')
        const extractedCnpjs = extractCnpjsFromBankAccounts(bankAccounts)
        
        if (extractedCnpjs.length > 0) {
          result.extractedCnpjs = extractedCnpjs
          console.log(`✅ ${extractedCnpjs.length} CNPJ(s) extraído(s):`)
          extractedCnpjs.forEach((cnpj, index) => {
            console.log(`   ${index + 1}. ${cnpj}`)
          })
        } else {
          result.warnings.push('Nenhum CNPJ encontrado nas contas bancárias')
          console.log('⚠️  Nenhum CNPJ encontrado. Estrutura das contas:')
          console.log(JSON.stringify(bankAccounts[0], null, 2))
        }
      } else {
        result.warnings.push('Nenhuma conta bancária retornada pela API')
        console.log('⚠️  Nenhuma conta bancária encontrada')
      }

    } catch (authError) {
      result.errors.push(
        `Erro na autenticação: ${authError instanceof Error ? authError.message : 'Erro desconhecido'}`
      )
      console.error('❌ Erro na autenticação:', authError)
      return result
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
  console.log('🚀 Iniciando teste de conexão F360\n')
  console.log('=' .repeat(60))

  // Get token index from command line args
  const tokenIndex = process.argv[2] 
    ? parseInt(process.argv[2], 10) 
    : undefined

  if (tokenIndex !== undefined && isNaN(tokenIndex)) {
    console.error('❌ Índice de token inválido. Use um número.')
    process.exit(1)
  }

  const result = await testF360Connection(tokenIndex)

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DO TESTE')
  console.log('='.repeat(60))
  console.log(`Status: ${result.success ? '✅ SUCESSO' : '❌ FALHA'}`)
  console.log(`Empresa: ${result.companyName}`)
  console.log(`Token: ${result.token.substring(0, 20)}...`)
  
  if (result.bankAccounts) {
    console.log(`Contas Bancárias: ${result.bankAccounts.length}`)
  }
  
  if (result.extractedCnpjs && result.extractedCnpjs.length > 0) {
    console.log(`CNPJs Extraídos: ${result.extractedCnpjs.length}`)
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
  const resultPath = 'test-f360-result.json'
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

export { testF360Connection, extractCnpjsFromBankAccounts }

