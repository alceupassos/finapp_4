#!/usr/bin/env tsx
/**
 * Script de Importação em Massa F360
 * 
 * Importa todas as empresas do arquivo tokens_f360.json
 * Processa em batches de 10 empresas por vez
 * 
 * Uso:
 *   npm run import:all          # Importa todas as empresas
 *   npm run import:test --limit=5  # Importa apenas 5 empresas para teste
 */

import { createClient } from '@supabase/supabase-js'
import { parseF360Tokens, type F360Token } from '../src/lib/f360/token-parser'
import { F360ApiService } from '../src/lib/f360/client'
import { F360Client } from '../src/lib/f360/client-definitivo'
import { extractCnpjs } from './import-grupos'
import { identifyGroup } from '../src/lib/import/group-identifier'
import type { Database } from '../src/types/database.types'
import fs from 'fs/promises'
import path from 'path'
import { loadEnvFromSupa } from './load-env-from-supa'

// Configuração
const BATCH_SIZE = 10 // Processar 10 empresas por vez
const LOG_INTERVAL = 10 // Log a cada 10 empresas processadas

// Tipos
type Company = Database['public']['Tables']['companies']['Row']
type ImportResult = {
  success: number
  errors: number
  skipped: number
  companiesCreated: number
  companiesUpdated: number
  clientsCreated: number
  entriesImported: number
  accountsImported: number
  errorsList: Array<{ company: string; error: string }>
}

/**
 * Carregar mapeamento token -> CNPJ (opcional)
 */
async function loadTokenCnpjMapping(): Promise<Map<string, string>> {
  const mappingPath = path.join(process.cwd(), 'scripts', 'token-cnpj-mapping.json')
  
  try {
    const content = await fs.readFile(mappingPath, 'utf-8')
    const data = JSON.parse(content)
    const map = new Map<string, string>()
    
    if (data.mappings && Array.isArray(data.mappings)) {
      data.mappings.forEach((m: { token: string; cnpj: string }) => {
        map.set(m.token, m.cnpj)
      })
    }
    
    return map
  } catch {
    // Arquivo não existe ou inválido, retornar mapa vazio
    return new Map()
  }
}

/**
 * Criar cliente Supabase direto (sem cookies)
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}

/**
 * Listar contas bancárias para descobrir CNPJs
 * Baseado em scripts/populate-companies.ts
 */
async function listBankAccounts(token: string): Promise<unknown[]> {
  try {
    // 1. Autenticar
    const authResponse = await fetch('https://financas.f360.com.br/PublicLoginAPI/DoLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    
    if (!authResponse.ok) {
      return []
    }
    
    const authData = await authResponse.json()
    if (!authData.Token) {
      return []
    }
    
    // 2. Buscar contas bancárias
    const response = await fetch(
      'https://financas.f360.com.br/ContaBancariaPublicAPI/ListarContasBancarias',
      {
        headers: {
          Authorization: `Bearer ${authData.Token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    
    // Retornar array de contas bancárias (pode estar em diferentes formatos)
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
  } catch (error) {
    // Ignorar erros silenciosamente
    return []
  }
}

/**
 * Extrair CNPJs das contas bancárias
 * Baseado em scripts/populate-companies.ts
 */
function extractCnpjsFromBankAccounts(bankAccounts: unknown[]): string[] {
  const cnpjs = new Set<string>()
  
  for (const account of bankAccounts) {
    const acc = account as Record<string, unknown>
    
    // Tentar extrair CNPJ de diferentes campos possíveis
    if (acc.CNPJ) {
      const cnpj = String(acc.CNPJ).replace(/\D/g, '')
      if (cnpj.length === 14) {
        cnpjs.add(cnpj)
      }
    }
    if (acc.cnpj) {
      const cnpj = String(acc.cnpj).replace(/\D/g, '')
      if (cnpj.length === 14) {
        cnpjs.add(cnpj)
      }
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
 * Obter ou criar cliente (grupo)
 */
async function getOrCreateClient(
  supabase: ReturnType<typeof createSupabaseClient>,
  groupName: string | null
): Promise<string> {
  if (!groupName) {
    // Para empresas sem grupo, criar cliente individual
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .is('group_name', null)
      .limit(1)
      .single()

    if (existing && typeof existing === 'object' && 'id' in existing) {
      return existing.id as string
    }

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({ group_name: null })
      .select('id')
      .single()

    if (error || !newClient) {
      throw new Error(`Failed to create client: ${error?.message}`)
    }

    return newClient.id
  }

  // Verificar se cliente com este grupo já existe
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('group_name', groupName)
    .limit(1)
    .single()

  if (existing) {
    return existing.id
  }

  // Criar novo cliente
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({ group_name: groupName })
    .select('id')
    .single()

  if (error || !newClient) {
    throw new Error(`Failed to create client: ${error?.message}`)
  }

  return newClient.id
}

/**
 * Obter ou criar empresa
 */
async function getOrCreateCompany(
  supabase: ReturnType<typeof createSupabaseClient>,
  clientId: string,
  companyData: {
    cnpj: string
    razaoSocial: string
    nomeFantasia?: string
    inscricaoEstadual?: string
    inscricaoMunicipal?: string
    endereco?: string
    cidade?: string
    estado?: string
    cep?: string
    telefone?: string
    email?: string
    tokenF360: string
  }
): Promise<{ company: Company; created: boolean }> {
  // Verificar se empresa já existe
  const { data: existing } = await supabase
    .from('companies')
    .select('*')
    .eq('cnpj', companyData.cnpj)
    .single()

  const companyPayload = {
    client_id: clientId,
    cnpj: companyData.cnpj,
    razao_social: companyData.razaoSocial,
    nome_fantasia: companyData.nomeFantasia || null,
    inscricao_estadual: companyData.inscricaoEstadual || null,
    inscricao_municipal: companyData.inscricaoMunicipal || null,
    endereco: companyData.endereco || null,
    cidade: companyData.cidade || null,
    estado: companyData.estado || null,
    cep: companyData.cep || null,
    telefone: companyData.telefone || null,
    email: companyData.email || null,
    token_f360: companyData.tokenF360,
    erp_type: 'F360' as const,
    active: true,
    last_sync: new Date().toISOString(),
  }

  if (existing) {
    // Atualizar empresa existente
    const { data: updated, error } = await supabase
      .from('companies')
      .update(companyPayload)
      .eq('id', existing.id)
      .select()
      .single()

    if (error || !updated) {
      throw new Error(`Failed to update company: ${error?.message}`)
    }

    return { company: updated, created: false }
  } else {
    // Criar nova empresa
    const { data: created, error } = await supabase
      .from('companies')
      .insert(companyPayload)
      .select()
      .single()

    if (error || !created) {
      throw new Error(`Failed to create company: ${error?.message}`)
    }

    return { company: created, created: true }
  }
}

/**
 * Mapear tipo de conta da API F360 para valores válidos do banco
 */
function mapAccountType(f360Type: string | null | undefined): 'ATIVO' | 'PASSIVO' | 'RECEITA' | 'DESPESA' | 'RESULTADO' | null {
  if (!f360Type) return null
  
  const normalized = f360Type.trim()
  const upperNormalized = normalized.toUpperCase()
  
  // Mapeamento direto (valores exatos)
  if (['ATIVO', 'PASSIVO', 'RECEITA', 'DESPESA', 'RESULTADO'].includes(upperNormalized)) {
    return upperNormalized as 'ATIVO' | 'PASSIVO' | 'RECEITA' | 'DESPESA' | 'RESULTADO'
  }
  
  // Mapeamento específico da API F360
  if (normalized === 'A receber' || normalized === 'A Receber' || upperNormalized === 'A RECEBER') {
    return 'RECEITA'
  }
  if (normalized === 'A pagar' || normalized === 'A Pagar' || upperNormalized === 'A PAGAR') {
    return 'DESPESA'
  }
  
  // Mapeamentos comuns (busca parcial)
  if (upperNormalized.includes('RECEITA') || upperNormalized.includes('REVENUE') || upperNormalized.includes('RENDIMENTO')) {
    return 'RECEITA'
  }
  if (upperNormalized.includes('DESPESA') || upperNormalized.includes('EXPENSE') || upperNormalized.includes('CUSTO')) {
    return 'DESPESA'
  }
  if (upperNormalized.includes('ATIVO') || upperNormalized.includes('ASSET')) {
    return 'ATIVO'
  }
  if (upperNormalized.includes('PASSIVO') || upperNormalized.includes('LIABILITY')) {
    return 'PASSIVO'
  }
  if (upperNormalized.includes('RESULTADO') || upperNormalized.includes('RESULT')) {
    return 'RESULTADO'
  }
  
  // Se não conseguir mapear, retornar null (será ignorado pelo constraint)
  return null
}

/**
 * Importar plano de contas
 */
async function importChartOfAccounts(
  supabase: ReturnType<typeof createSupabaseClient>,
  companyId: string,
  accounts: Array<{
    codigo: string
    nome: string
    tipo: string
    nivel: number
    codigoPai?: string
    aceitaLancamento: boolean
  }>
): Promise<number> {
  if (accounts.length === 0) return 0

  // Log tipos únicos para debug
  const uniqueTypes = new Set(accounts.map(a => a.tipo))
  console.log(`    📊 Tipos encontrados: ${Array.from(uniqueTypes).join(', ')}`)

  const accountsToInsert = accounts
    .map((account) => {
      const mappedType = mapAccountType(account.tipo)
      return {
        company_id: companyId,
        code: account.codigo,
        name: account.nome,
        type: mappedType,
        level: account.nivel,
        parent_code: account.codigoPai || null,
        accepts_entries: account.aceitaLancamento,
      }
    })
    .filter((acc) => acc.type !== null) // Filtrar contas sem tipo válido

  const filteredCount = accounts.length - accountsToInsert.length
  if (filteredCount > 0) {
    console.log(`    ⚠️  ${filteredCount} contas filtradas (tipo inválido)`)
  }

  if (accountsToInsert.length === 0) {
    console.warn(`    ⚠️  Nenhuma conta válida para importar após filtragem`)
    return 0
  }

  // Remover duplicatas baseado em company_id + code
  const uniqueAccounts = new Map<string, typeof accountsToInsert[0]>()
  for (const acc of accountsToInsert) {
    const key = `${acc.company_id}:${acc.code}`
    if (!uniqueAccounts.has(key)) {
      uniqueAccounts.set(key, acc)
    }
  }

  const uniqueAccountsArray = Array.from(uniqueAccounts.values())
  const duplicatesRemoved = accountsToInsert.length - uniqueAccountsArray.length
  if (duplicatesRemoved > 0) {
    console.log(`    ⚠️  ${duplicatesRemoved} duplicatas removidas`)
  }

  // Processar em batches para evitar problemas de tamanho
  const BATCH_SIZE = 500
  let totalImported = 0

  for (let i = 0; i < uniqueAccountsArray.length; i += BATCH_SIZE) {
    const batch = uniqueAccountsArray.slice(i, i + BATCH_SIZE)
    
    const { error } = await supabase
      .from('chart_of_accounts')
      .upsert(batch, {
        onConflict: 'company_id,code',
      })

    if (error) {
      console.error(`    ❌ Erro ao importar batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      throw new Error(`Failed to import chart of accounts: ${error.message}`)
    }

    totalImported += batch.length
  }

  return totalImported
}

/**
 * Importar lançamentos contábeis
 */
async function importAccountingEntries(
  supabase: ReturnType<typeof createSupabaseClient>,
  companyId: string,
  entries: Array<{
    dataLancamento: string
    dataCompetencia: string
    numeroDocumento?: string
    historico?: string
    codigoConta: string
    valorDebito: number
    valorCredito: number
    centroCusto?: string
    projeto?: string
    idOrigem?: string
  }>
): Promise<number> {
  if (entries.length === 0) return 0

  const BATCH_SIZE = 1000
  let totalImported = 0

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)
    const entriesToInsert = batch.map((entry) => ({
      company_id: companyId,
      entry_date: entry.dataLancamento,
      competence_date: entry.dataCompetencia,
      document_number: entry.numeroDocumento || null,
      description: entry.historico || null,
      account_code: entry.codigoConta,
      debit_amount: entry.valorDebito || 0,
      credit_amount: entry.valorCredito || 0,
      cost_center: entry.centroCusto || null,
      project_code: entry.projeto || null,
      source_erp: 'F360' as const,
      source_id: entry.idOrigem || null,
    }))

    const { error } = await supabase
      .from('accounting_entries')
      .upsert(entriesToInsert, {
        onConflict: 'company_id,source_erp,source_id,entry_date',
      })

    if (error) {
      console.error(`Error importing batch ${i / BATCH_SIZE + 1}:`, error.message)
      // Continue mesmo com erro, mas não conte como importado
    } else {
      totalImported += entriesToInsert.length
    }
  }

  return totalImported
}

/**
 * Processar uma empresa
 */
async function processCompany(
  supabase: ReturnType<typeof createSupabaseClient>,
  token: F360Token,
  loginToken: string,
  tokenCnpjMap: Map<string, string>,
  result: ImportResult
): Promise<void> {
  try {
    // Criar serviço F360
    const f360Service = new F360ApiService(token, loginToken)

    // 1. Obter CNPJ (tentar múltiplas fontes)
    let cnpj: string | undefined

    // Tentativa 1: Verificar se empresa já existe no banco
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id, cnpj, last_sync')
      .eq('token_f360', token.token)
      .single()

    if (existingCompany && existingCompany.cnpj) {
      cnpj = existingCompany.cnpj
      console.log(`  ↻ Empresa existente: ${token.companyName} (CNPJ: ${cnpj})`)
    } else if (tokenCnpjMap.has(token.token)) {
      // Tentativa 2: Usar mapeamento fornecido
      cnpj = tokenCnpjMap.get(token.token)!
      console.log(`  📋 CNPJ do mapeamento: ${token.companyName} (CNPJ: ${cnpj})`)
    } else {
      // Tentativa 3: Tentar extrair CNPJ via API F360 usando múltiplos endpoints
      console.log(`  🔍 Tentando extrair CNPJ via API para ${token.companyName}...`)
      try {
        const f360Client = new F360Client(token.token)
        let foundCnpjs: string[] = []
        let isGroup = false
        
        // Tentativa 1: ListarContasBancarias (NOVO - mais confiável para grupos)
        try {
          const bankAccounts = await listBankAccounts(token.token)
          if (bankAccounts.length > 0) {
            const extractedCnpjs = extractCnpjsFromBankAccounts(bankAccounts)
            if (extractedCnpjs.length > 0) {
              foundCnpjs = extractedCnpjs
              if (extractedCnpjs.length > 1) {
                isGroup = true
                console.log(`  ✓ ${extractedCnpjs.length} CNPJs encontrados via ListarContasBancarias (GRUPO)`)
              } else {
                cnpj = extractedCnpjs[0]
                console.log(`  ✓ CNPJ encontrado via ListarContasBancarias: ${cnpj}`)
              }
            }
          }
        } catch (error) {
          // Ignorar erro silenciosamente
        }
        
        // Tentativa 2: ListarPessoas (se ainda não encontrou)
        if (!cnpj && foundCnpjs.length === 0) {
          try {
            const pessoas = await f360Client.listarPessoas(1, 'ambos')
            const companies = extractCnpjs(pessoas)
            if (companies.length > 0) {
              const extractedCnpjs = companies.map(c => c.cnpj.replace(/[.\/-]/g, '')).filter(c => c.length === 14)
              if (extractedCnpjs.length > 0) {
                if (extractedCnpjs.length > 1) {
                  isGroup = true
                  foundCnpjs = extractedCnpjs
                  console.log(`  ✓ ${extractedCnpjs.length} CNPJs encontrados via ListarPessoas (GRUPO)`)
                } else {
                  cnpj = extractedCnpjs[0]
                  console.log(`  ✓ CNPJ encontrado via ListarPessoas: ${cnpj}`)
                }
              }
            }
          } catch (error) {
            // Ignorar erro silenciosamente
          }
        }

        // Tentativa 3: GerarRelatorioContabil (se ainda não encontrou)
        if (!cnpj && foundCnpjs.length === 0) {
          try {
            const hoje = new Date()
            const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
              .toISOString()
              .split('T')[0]
            const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
              .toISOString()
              .split('T')[0]

            const relatorio = await f360Client.gerarRelatorioContabil({
              Data: inicioMes,
              DataFim: fimMes,
              ModeloContabil: 'provisao',
              ModeloRelatorio: 'gerencial',
              ExtensaoDeArquivo: 'json',
              CNPJEmpresas: [],
              Pagina: 1,
              RegistrosPorPagina: 100,
            })

            const companies = extractCnpjs(relatorio)
            if (companies.length > 0) {
              const extractedCnpjs = companies.map(c => c.cnpj.replace(/[.\/-]/g, '')).filter(c => c.length === 14)
              if (extractedCnpjs.length > 0) {
                if (extractedCnpjs.length > 1) {
                  isGroup = true
                  foundCnpjs = extractedCnpjs
                  console.log(`  ✓ ${extractedCnpjs.length} CNPJs encontrados via GerarRelatorioContabil (GRUPO)`)
                } else {
                  cnpj = extractedCnpjs[0]
                  console.log(`  ✓ CNPJ encontrado via GerarRelatorioContabil: ${cnpj}`)
                }
              }
            }
          } catch (error) {
            // Ignorar erro silenciosamente
          }
        }
        
        // Se encontrou múltiplos CNPJs, é um GRUPO - criar empresa grupo + filhas
        if (isGroup && foundCnpjs.length > 1) {
          console.log(`  📦 Detectado GRUPO com ${foundCnpjs.length} empresas`)
          
          // Criar empresa grupo
          const groupCnpj = `GRUPO-${Date.now()}`
          const groupCompanyName = token.companyName || 'Grupo Empresarial'
          
          const { data: groupCompany, error: groupError } = await supabase
            .from('companies')
            .insert({
              cnpj: groupCnpj,
              razao_social: groupCompanyName,
              token_f360: token.token,
              is_group: true,
              group_token: token.token,
              erp_type: 'F360',
              active: true,
              last_sync: new Date().toISOString(),
            })
            .select()
            .single()
          
          if (groupError || !groupCompany) {
            console.error(`  ❌ Erro ao criar empresa grupo: ${groupError?.message}`)
            result.errors++
            result.errorsList.push({
              company: token.companyName,
              error: `Failed to create group: ${groupError?.message || 'Unknown error'}`,
            })
            return
          }
          
          console.log(`  ✅ Empresa grupo criada: ${groupCompany.id}`)
          result.companiesCreated++
          
          // Criar empresas filhas e importar dados financeiros
          // Criar serviço F360 para importar dados financeiros
          const f360Service = new F360ApiService(token, loginToken)
          
          for (const childCnpj of foundCnpjs) {
            try {
              let childCompany: Company | null = null
              
              // Verificar se empresa filha já existe
              const { data: existingChild } = await supabase
                .from('companies')
                .select('*')
                .eq('cnpj', childCnpj)
                .single()
              
              if (existingChild) {
                childCompany = existingChild as Company
                console.log(`    ↻ Empresa filha existente: ${childCnpj}`)
              } else {
                // Criar nova empresa filha
                const { data: newChild, error: childError } = await supabase
                  .from('companies')
                  .insert({
                    cnpj: childCnpj,
                    razao_social: `Empresa ${childCnpj}`,
                    token_f360: token.token,
                    is_group: false,
                    group_token: token.token,
                    parent_company_id: groupCompany.id,
                    erp_type: 'F360',
                    active: true,
                    last_sync: new Date().toISOString(),
                  })
                  .select()
                  .single()
                
                if (childError || !newChild) {
                  console.error(`    ❌ Erro ao criar empresa filha ${childCnpj}: ${childError?.message}`)
                  continue
                }
                
                childCompany = newChild as Company
                result.companiesCreated++
                console.log(`    ✓ Empresa filha criada: ${childCnpj}`)
              }
              
              // Importar dados financeiros para empresa filha
              if (childCompany) {
                console.log(`    📊 Importando dados financeiros para ${childCnpj}...`)
                
                // Importar plano de contas
                try {
                  const chartOfAccounts = await f360Service.getChartOfAccounts(childCnpj)
                  if (chartOfAccounts.length > 0) {
                    const accountsImported = await importChartOfAccounts(
                      supabase,
                      childCompany.id,
                      chartOfAccounts
                    )
                    result.accountsImported += accountsImported
                    console.log(`      ✓ ${accountsImported} contas importadas`)
                  }
                } catch (error) {
                  console.warn(`      ⚠️  Erro ao importar plano de contas: ${error instanceof Error ? error.message : 'Unknown'}`)
                }
                
                // Importar lançamentos contábeis
                try {
                  const years = [2024, 2025]
                  const allEntries: Array<{
                    dataLancamento: string
                    dataCompetencia: string
                    numeroDocumento?: string
                    historico?: string
                    codigoConta: string
                    valorDebito: number
                    valorCredito: number
                    centroCusto?: string
                    projeto?: string
                    idOrigem?: string
                  }> = []
                  
                  for (const year of years) {
                    for (let month = 1; month <= 12; month++) {
                      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
                      const endDate = `${year}-${String(month).padStart(2, '0')}-31`
                      
                      let page = 1
                      let hasMore = true
                      
                      while (hasMore && page <= 10) {
                        try {
                          const entries = await f360Service.getAccountingEntries(
                            childCnpj,
                            startDate,
                            endDate,
                            { page, pageSize: 1000 }
                          )
                          allEntries.push(...entries)
                          hasMore = entries.length === 1000
                          page++
                        } catch (error) {
                          hasMore = false
                        }
                      }
                    }
                  }
                  
                  if (allEntries.length > 0) {
                    const entriesImported = await importAccountingEntries(
                      supabase,
                      childCompany.id,
                      allEntries
                    )
                    result.entriesImported += entriesImported
                    console.log(`      ✓ ${entriesImported} lançamentos importados`)
                  }
                } catch (error) {
                  console.warn(`      ⚠️  Erro ao importar lançamentos: ${error instanceof Error ? error.message : 'Unknown'}`)
                }
              }
            } catch (error) {
              console.error(`    ❌ Erro ao processar empresa filha ${childCnpj}: ${error instanceof Error ? error.message : 'Unknown'}`)
              // Continuar com próxima empresa
            }
          }
          
          // Grupo processado completamente
          return
        }

        // Se ainda não encontrou CNPJ, criar empresa com CNPJ temporário
        if (!cnpj) {
          cnpj = `TEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`
          console.warn(`  ⚠️  CNPJ não encontrado via API. Usando CNPJ temporário: ${cnpj}`)
          console.warn(`     Dica: Adicione ao arquivo scripts/token-cnpj-mapping.json`)
        }
      } catch (error) {
        // Se falhar completamente, criar empresa com CNPJ temporário
        cnpj = `TEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`
        console.warn(`  ⚠️  Erro ao buscar CNPJ via API. Usando CNPJ temporário: ${cnpj}`)
        console.warn(`     Erro: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }

    if (!cnpj) {
      result.skipped++
      return
    }

    // 2. Obter detalhes da empresa via API
    // Nota: O endpoint /api/empresa?cnpj= não existe na API F360
    // Vamos usar dados básicos e tentar buscar plano de contas para validar
    let companyDetails: {
      cnpj: string
      razaoSocial: string
      nomeFantasia?: string
      inscricaoEstadual?: string
      inscricaoMunicipal?: string
      endereco?: string
      cidade?: string
      estado?: string
      cep?: string
      telefone?: string
      email?: string
    }

    // Tentar buscar plano de contas para validar que o token funciona
    try {
      await f360Service.getChartOfAccounts()
      // Se chegou aqui, o token funciona - usar dados básicos
      companyDetails = {
        cnpj,
        razaoSocial: token.companyName,
        nomeFantasia: token.companyName,
      }
    } catch (error) {
      // Se falhar, ainda assim tentar criar empresa com dados básicos
      console.warn(`  ⚠️  Não foi possível validar token para ${token.companyName}, usando dados básicos`)
      companyDetails = {
        cnpj,
        razaoSocial: token.companyName,
        nomeFantasia: token.companyName,
      }
    }

    // 3. Identificar grupo
    const groupName = identifyGroup({
      cnpj: companyDetails.cnpj,
      razaoSocial: companyDetails.razaoSocial,
      nomeFantasia: companyDetails.nomeFantasia,
    })

    // 4. Obter ou criar cliente
    const clientId = await getOrCreateClient(supabase, groupName)
    if (groupName) {
      // Só contar como criado se for um grupo novo (não individual)
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('group_name', groupName)
        .single()
      
      if (!existingClient) {
        result.clientsCreated++
      }
    }

    // 5. Obter ou criar empresa
    const { company, created } = await getOrCreateCompany(supabase, clientId, {
      cnpj: companyDetails.cnpj,
      razaoSocial: companyDetails.razaoSocial,
      nomeFantasia: companyDetails.nomeFantasia,
      inscricaoEstadual: companyDetails.inscricaoEstadual,
      inscricaoMunicipal: companyDetails.inscricaoMunicipal,
      endereco: companyDetails.endereco,
      cidade: companyDetails.cidade,
      estado: companyDetails.estado,
      cep: companyDetails.cep,
      telefone: companyDetails.telefone,
      email: companyDetails.email,
      tokenF360: token.token,
    })

    if (created) {
      result.companiesCreated++
    } else {
      result.companiesUpdated++
    }

    // 6. Importar plano de contas
    console.log(`  📋 Buscando plano de contas...`)
    let chartOfAccounts: Array<{
      codigo: string
      nome: string
      tipo: string
      nivel: number
      codigoPai?: string
      aceitaLancamento: boolean
    }> = []
    
    try {
      chartOfAccounts = await f360Service.getChartOfAccounts(companyDetails.cnpj)
      console.log(`  ✓ Plano de contas obtido: ${chartOfAccounts.length} contas`)
    } catch (error) {
      console.warn(`  ⚠️  Erro ao buscar plano de contas: ${error instanceof Error ? error.message : 'Unknown'}`)
      console.warn(`     Continuando sem plano de contas...`)
    }

    if (chartOfAccounts.length > 0) {
      const accountsImported = await importChartOfAccounts(
        supabase,
        company.id,
        chartOfAccounts
      )
      result.accountsImported += accountsImported
      console.log(`  ✓ ${accountsImported} contas importadas`)
    } else {
      console.warn(`  ⚠️  Nenhuma conta encontrada no plano de contas`)
    }

    // 7. Importar lançamentos de 2024 e 2025
    console.log(`  📝 Buscando lançamentos contábeis de 2024 e 2025...`)
    const allEntries: Array<{
      dataLancamento: string
      dataCompetencia: string
      numeroDocumento?: string
      historico?: string
      codigoConta: string
      valorDebito: number
      valorCredito: number
      centroCusto?: string
      projeto?: string
      idOrigem?: string
    }> = []

    // Buscar por ano e mês para evitar problemas de paginação
    try {
      const years = [2024, 2025] // Buscar 2024 e 2025
      
      for (const year of years) {
        for (let month = 1; month <= 12; month++) {
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`
          const endDate = `${year}-${String(month).padStart(2, '0')}-31`

        let page = 1
        let hasMore = true
        let monthEntries = 0

        while (hasMore) {
          try {
            const entries = await f360Service.getAccountingEntries(
              companyDetails.cnpj,
              startDate,
              endDate,
              { page, pageSize: 1000 }
            )

            allEntries.push(...entries)
            monthEntries += entries.length
            hasMore = entries.length === 1000
            page++

            // Safety limit
            if (page > 100) {
              console.warn(`    ⚠️  Limite de páginas atingido para mês ${month}`)
              break
            }
          } catch (error) {
            console.warn(`    ⚠️  Erro ao buscar lançamentos do mês ${month}, página ${page}: ${error instanceof Error ? error.message : 'Unknown'}`)
            hasMore = false
          }
        }

          if (monthEntries > 0) {
            console.log(`    ✓ ${year}-${String(month).padStart(2, '0')}: ${monthEntries} lançamentos`)
          }
        }
      }

      // Importar lançamentos
      if (allEntries.length > 0) {
        const entriesImported = await importAccountingEntries(
          supabase,
          company.id,
          allEntries
        )
        result.entriesImported += entriesImported
        console.log(`  ✓ ${entriesImported} lançamentos importados`)
      } else {
        if (allEntries.length === 0) {
          console.warn(`  ⚠️  Nenhum lançamento encontrado para 2024-2025`)
        } else {
          console.log(`  ✓ Total de lançamentos encontrados: ${allEntries.length}`)
        }
      }
    } catch (error) {
      console.warn(`  ⚠️  Erro ao buscar lançamentos contábeis: ${error instanceof Error ? error.message : 'Unknown'}`)
      console.warn(`     Continuando sem lançamentos...`)
    }

    result.success++
  } catch (error) {
    result.errors++
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errorsList.push({
      company: token.companyName,
      error: errorMessage,
    })
    console.error(`Error processing ${token.companyName}:`, errorMessage)
  }
}

/**
 * Função principal
 */
async function main() {
  // Carregar variáveis de ambiente do supa.txt se não estiverem definidas
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await loadEnvFromSupa()
  }

  // Parse argumentos
  const args = process.argv.slice(2)
  const limitArg = args.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  console.log('🚀 Iniciando importação em massa F360...\n')

  // Verificar variáveis de ambiente
  // Nota: F360_LOGIN_TOKEN não é mais necessário - cada empresa usa seu próprio token
  // Mas mantemos para compatibilidade com código antigo
  const loginToken = process.env.F360_LOGIN_TOKEN || ''

  // Criar cliente Supabase
  const supabase = createSupabaseClient()

  // Carregar tokens
  console.log('📂 Carregando tokens...')
  const tokens = await parseF360Tokens()
  const totalTokens = limit ? Math.min(limit, tokens.length) : tokens.length
  console.log(`✅ ${totalTokens} empresas encontradas`)

  // Carregar mapeamento token -> CNPJ (opcional)
  console.log('📂 Carregando mapeamento token -> CNPJ...')
  const tokenCnpjMap = await loadTokenCnpjMapping()
  if (tokenCnpjMap.size > 0) {
    console.log(`✅ ${tokenCnpjMap.size} mapeamentos encontrados`)
  } else {
    console.log(`⚠️  Nenhum mapeamento encontrado. Criando scripts/token-cnpj-mapping.json se necessário.`)
  }
  console.log()

  // Inicializar resultado
  const result: ImportResult = {
    success: 0,
    errors: 0,
    skipped: 0,
    companiesCreated: 0,
    companiesUpdated: 0,
    clientsCreated: 0,
    entriesImported: 0,
    accountsImported: 0,
    errorsList: [],
  }

  // Processar em batches
  const tokensToProcess = tokens.slice(0, totalTokens)
  const batches: F360Token[][] = []

  for (let i = 0; i < tokensToProcess.length; i += BATCH_SIZE) {
    batches.push(tokensToProcess.slice(i, i + BATCH_SIZE))
  }

  console.log(`📦 Processando em ${batches.length} batches de até ${BATCH_SIZE} empresas\n`)

  const startTime = Date.now()

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} empresas)`)

    // Processar batch em paralelo (mas com cuidado para não sobrecarregar)
    await Promise.all(
      batch.map((token) => processCompany(supabase, token, loginToken, tokenCnpjMap, result))
    )

    // Log de progresso
    if ((batchIndex + 1) % Math.ceil(LOG_INTERVAL / BATCH_SIZE) === 0 || batchIndex === batches.length - 1) {
      const processed = (batchIndex + 1) * BATCH_SIZE
      const progress = ((processed / totalTokens) * 100).toFixed(1)
      console.log(
        `\n📊 Progresso: ${processed}/${totalTokens} (${progress}%) | ✅ ${result.success} | ❌ ${result.errors}`
      )
    }

    // Pequeno delay entre batches para não sobrecarregar
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  // Relatório final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RELATÓRIO FINAL')
  console.log('='.repeat(60))
  console.log(`⏱️  Tempo total: ${duration}s`)
  console.log(`✅ Empresas processadas com sucesso: ${result.success}`)
  console.log(`❌ Empresas com erro: ${result.errors}`)
  console.log(`⏭️  Empresas puladas (sem CNPJ): ${result.skipped}`)
  console.log(`🆕 Empresas criadas: ${result.companiesCreated}`)
  console.log(`🔄 Empresas atualizadas: ${result.companiesUpdated}`)
  console.log(`👥 Clientes criados: ${result.clientsCreated}`)
  console.log(`📋 Contas importadas: ${result.accountsImported}`)
  console.log(`📝 Lançamentos importados: ${result.entriesImported}`)

  if (result.errorsList.length > 0) {
    console.log('\n❌ ERROS:')
    result.errorsList.forEach(({ company, error }) => {
      console.log(`  - ${company}: ${error}`)
    })
  }

  console.log('='.repeat(60) + '\n')
}

// Executar
main().catch((error) => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})

