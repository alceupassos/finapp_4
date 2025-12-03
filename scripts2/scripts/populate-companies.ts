/**
 * Script para popular Supabase com empresas F360
 * Lê tokens_f360.json, identifica grupos e importa empresas
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { readFile } from 'fs/promises'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface F360Token {
  'ID da Empresa': number
  CompanyName: string
  Token: string
}

interface TokensFile {
  total_clientes: number
  colunas: string[]
  clientes: F360Token[]
}

/**
 * Autenticar com F360 e obter JWT
 */
async function authenticateF360(token: string): Promise<string> {
  const response = await fetch('https://financas.f360.com.br/PublicLoginAPI/DoLogin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    throw new Error(`F360 authentication failed: ${response.status}`)
  }

  const data = await response.json()
  if (!data.Token) {
    throw new Error('No token received from F360 authentication')
  }

  return data.Token
}

/**
 * Listar contas bancárias para descobrir CNPJs
 */
async function listBankAccounts(jwt: string): Promise<unknown[]> {
  const response = await fetch(
    'https://financas.f360.com.br/ContaBancariaPublicAPI/ListarContasBancarias',
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to list bank accounts: ${response.status}`)
  }

  const data = await response.json()
  
  if (Array.isArray(data)) {
    return data
  }
  
  if (data.Result && Array.isArray(data.Result)) {
    return data.Result
  }
  
  if (data.data && Array.isArray(data.data)) {
    return data.data
  }

  return []
}

/**
 * Extrair CNPJs das contas bancárias
 */
function extractCnpjsFromBankAccounts(bankAccounts: unknown[]): string[] {
  const cnpjs = new Set<string>()
  
  for (const account of bankAccounts) {
    const acc = account as Record<string, unknown>
    
    // Tentar extrair CNPJ de diferentes campos possíveis
    if (acc.CNPJ) {
      cnpjs.add(String(acc.CNPJ).replace(/\D/g, ''))
    }
    if (acc.cnpj) {
      cnpjs.add(String(acc.cnpj).replace(/\D/g, ''))
    }
    if (acc.Nome) {
      // Tentar extrair CNPJ do nome se contiver
      const nome = String(acc.Nome)
      const cnpjMatch = nome.match(/\d{14}/)
      if (cnpjMatch) {
        cnpjs.add(cnpjMatch[0])
      }
    }
  }
  
  return Array.from(cnpjs)
}

/**
 * Identificar grupos por token
 */
function identifyGroups(tokens: F360Token[]): Map<string, F360Token[]> {
  const groups = new Map<string, F360Token[]>()
  
  for (const token of tokens) {
    const existing = groups.get(token.Token) || []
    existing.push(token)
    groups.set(token.Token, existing)
  }
  
  return groups
}

/**
 * Criar ou obter client (grupo)
 */
async function getOrCreateClient(groupName: string | null): Promise<string> {
  if (!groupName) {
    // Empresa única, criar client sem grupo
    const { data, error } = await supabase
      .from('clients')
      .insert({ group_name: null })
      .select('id')
      .single()
    
    if (error && !error.message.includes('duplicate')) {
      throw error
    }
    
    if (data) {
      return data.id
    }
    
    // Se já existe, buscar
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('group_name', null)
      .limit(1)
      .single()
    
    return existing?.id || data?.id || ''
  }
  
  // Verificar se grupo já existe
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('group_name', groupName)
    .limit(1)
    .single()
  
  if (existing) {
    return existing.id
  }
  
  // Criar novo grupo
  const { data, error } = await supabase
    .from('clients')
    .insert({ group_name: groupName })
    .select('id')
    .single()
  
  if (error) {
    throw error
  }
  
  return data.id
}

/**
 * Processar um grupo de empresas com mesmo token
 */
async function processGroup(
  token: string,
  companies: F360Token[],
  delayMs = 200
): Promise<void> {
  console.log(`\n📦 Processando grupo com token ${token.substring(0, 20)}... (${companies.length} empresas)`)
  
  try {
    // Autenticar
    const jwt = await authenticateF360(token)
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    
    // Listar contas bancárias para descobrir CNPJs
    const bankAccounts = await listBankAccounts(jwt)
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    
    const cnpjs = extractCnpjsFromBankAccounts(bankAccounts)
    
    // Determinar nome do grupo
    const groupName = companies.length > 1 
      ? companies[0].CompanyName.replace(/ - .*$/, '').replace(/GRUPO /, '')
      : null
    
    // Criar ou obter client
    const clientId = await getOrCreateClient(groupName)
    
    // Criar empresas
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i]
      
      // Se temos CNPJs descobertos, usar o i-ésimo, senão usar um placeholder
      const cnpj = cnpjs[i] || `0000000000000${i + 1}`
      
      // Verificar se empresa já existe
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('cnpj', cnpj)
        .limit(1)
        .single()
      
      if (existing) {
        console.log(`  ✓ Empresa ${company.CompanyName} já existe (CNPJ: ${cnpj})`)
        continue
      }
      
      // Criar empresa
      const { data, error } = await supabase
        .from('companies')
        .insert({
          client_id: clientId,
          cnpj,
          razao_social: company.CompanyName,
          token_f360: token,
          erp_type: 'F360',
          active: true,
        })
        .select('id')
        .single()
      
      if (error) {
        console.error(`  ✗ Erro ao criar empresa ${company.CompanyName}:`, error.message)
      } else {
        console.log(`  ✓ Criada empresa ${company.CompanyName} (CNPJ: ${cnpj})`)
      }
      
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  } catch (error) {
    console.error(`  ✗ Erro ao processar grupo:`, error instanceof Error ? error.message : error)
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Iniciando população de empresas F360...\n')
  
  // Ler tokens
  const tokensFile = await readFile(
    path.resolve(process.cwd(), 'tokens_f360.json'),
    'utf-8'
  )
  const tokensData: TokensFile = JSON.parse(tokensFile)
  
  console.log(`📋 Total de tokens: ${tokensData.total_clientes}`)
  
  // Identificar grupos
  const groups = identifyGroups(tokensData.clientes)
  console.log(`📦 Grupos identificados: ${groups.size}`)
  
  // Processar grupos
  let processed = 0
  for (const [token, companies] of groups) {
    await processGroup(token, companies)
    processed++
    console.log(`\n📊 Progresso: ${processed}/${groups.size} grupos processados`)
  }
  
  console.log('\n✅ População concluída!')
}

main().catch(console.error)

