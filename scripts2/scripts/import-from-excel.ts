#!/usr/bin/env tsx
/**
 * Script de Importação de Empresas F360 a partir de Arquivos Excel
 * 
 * Lê tokens dos arquivos unico.xlsx e grupo.xlsx e importa empresas
 * com a flag is_group correta (false para unico, true para grupo).
 * 
 * Uso:
 *   tsx scripts/import-from-excel.ts
 *   tsx scripts/import-from-excel.ts --limit=10  # Limitar número de empresas
 */

import { createClient } from '@supabase/supabase-js'
import { F360Client } from '../src/lib/f360/client-definitivo'
import { extractCnpjs, importGroupCompanies } from './import-grupos'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { loadEnvFromSupa } from './load-env-from-supa'
import type { Database } from '../src/types/database.types'

interface TokenRow {
  token: string
  companyName?: string
  cnpj?: string
}

interface ImportResult {
  total: number
  success: number
  errors: number
  skipped: number
  companiesCreated: number
  companiesUpdated: number
  cnpjsFound: number
  cnpjsNotFound: number
}

/**
 * Criar cliente Supabase
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
 * Extrair tokens de um arquivo Excel
 * Lê apenas a coluna de tokens (assumindo que está na coluna B ou Token)
 */
function extractTokensFromExcel(filePath: string): TokenRow[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Arquivo não encontrado: ${filePath}`)
    return []
  }

  console.log(`📖 Lendo tokens de: ${filePath}`)

  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
    cellNF: false,
    cellStyles: false,
  })

  const tokens: TokenRow[] = []
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  if (!worksheet['!ref']) {
    console.warn(`⚠️  Planilha vazia: ${filePath}`)
    return []
  }

  // Converter para JSON para facilitar leitura
  const rows = XLSX.utils.sheet_to_json<any>(worksheet)

  for (const row of rows) {
    // Tentar diferentes nomes de coluna para token
    const token = 
      row.Token || 
      row.token || 
      row.TOKEN ||
      row['Token F360'] ||
      row['TokenF360'] ||
      row['TOKEN_F360']

    if (token && typeof token === 'string' && token.length > 10) {
      tokens.push({
        token: String(token).trim(),
        companyName: row.CompanyName || row['Company Name'] || row['Nome'] || row.nome || undefined,
        cnpj: row.CNPJ || row.cnpj || row.CpfCnpj || undefined,
      })
    }
  }

  console.log(`  ✓ Encontrados ${tokens.length} tokens`)
  return tokens
}

/**
 * Extrair CNPJ da API F360 usando múltiplos endpoints
 */
async function extractCnpjFromApi(f360Client: F360Client): Promise<string | null> {
  const allCnpjs = new Set<string>()

  // Tentar endpoint ListarPessoas
  try {
    const pessoas = await f360Client.listarPessoas(1, 'ambos')
    const companies = extractCnpjs(pessoas)
    companies.forEach(c => {
      const cnpj = c.cnpj.replace(/[.\/-]/g, '')
      if (cnpj.length === 14) {
        allCnpjs.add(cnpj)
      }
    })
  } catch (error) {
    // Ignorar erro silenciosamente
  }

  // Tentar endpoint GerarRelatorioContabil
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
    companies.forEach(c => {
      const cnpj = c.cnpj.replace(/[.\/-]/g, '')
      if (cnpj.length === 14) {
        allCnpjs.add(cnpj)
      }
    })
  } catch (error) {
    // Ignorar erro silenciosamente
  }

  // Retornar o primeiro CNPJ encontrado (ou null se nenhum)
  return allCnpjs.size > 0 ? Array.from(allCnpjs)[0] : null
}

/**
 * Processar uma empresa individual (is_group = false)
 */
async function processIndividualCompany(
  supabase: ReturnType<typeof createSupabaseClient>,
  tokenRow: TokenRow,
  isGroup: boolean,
  result: ImportResult
): Promise<void> {
  try {
    const f360Client = new F360Client(tokenRow.token)

    // 1. Tentar obter CNPJ
    let cnpj: string | null = null

    if (tokenRow.cnpj) {
      cnpj = tokenRow.cnpj.replace(/[.\/-]/g, '')
      if (cnpj.length !== 14) {
        cnpj = null
      }
    }

    // Se não tiver CNPJ, tentar extrair da API
    if (!cnpj) {
      console.log(`  🔍 Buscando CNPJ via API para token: ${tokenRow.token.substring(0, 20)}...`)
      cnpj = await extractCnpjFromApi(f360Client)
      if (cnpj) {
        result.cnpjsFound++
        console.log(`  ✓ CNPJ encontrado: ${cnpj}`)
      } else {
        result.cnpjsNotFound++
        console.warn(`  ⚠️  CNPJ não encontrado via API`)
      }
    } else {
      result.cnpjsFound++
    }

    // Se ainda não tiver CNPJ, criar empresa com CNPJ temporário
    if (!cnpj) {
      cnpj = `TEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`
      console.warn(`  ⚠️  Usando CNPJ temporário: ${cnpj}`)
    }

    // 2. Verificar se empresa já existe
    const { data: existing } = await supabase
      .from('companies')
      .select('id, cnpj, razao_social')
      .eq('token_f360', tokenRow.token)
      .single()

    const companyName = tokenRow.companyName || 'Empresa sem nome'

    if (existing) {
      // Atualizar empresa existente
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          cnpj: cnpj.startsWith('TEMP-') ? existing.cnpj : cnpj, // Manter CNPJ original se novo for temporário
          razao_social: companyName,
          token_f360: tokenRow.token,
          is_group: isGroup,
          active: true,
          last_sync: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error(`     Erro de update: ${updateError.message}`)
        console.error(`     Detalhes: ${JSON.stringify(updateError, null, 2)}`)
        throw updateError
      }

      result.companiesUpdated++
      console.log(`  ✓ Empresa atualizada: ${companyName}`)
    } else {
      // Criar nova empresa
      const { error: insertError } = await supabase
        .from('companies')
        .insert({
          cnpj,
          razao_social: companyName,
          token_f360: tokenRow.token,
          is_group: isGroup,
          erp_type: 'F360',
          active: true,
          last_sync: new Date().toISOString(),
        })

      if (insertError) {
        console.error(`     Erro de insert: ${insertError.message}`)
        console.error(`     Detalhes: ${JSON.stringify(insertError, null, 2)}`)
        throw insertError
      }

      result.companiesCreated++
      console.log(`  ✓ Empresa criada: ${companyName}`)
    }

    result.success++
  } catch (error) {
    result.errors++
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error(`  ✗ Erro ao processar ${tokenRow.companyName || tokenRow.token.substring(0, 20)}:`)
    console.error(`     Mensagem: ${errorMessage}`)
    if (errorStack) {
      console.error(`     Stack: ${errorStack.split('\n').slice(0, 3).join('\n')}`)
    }
  }
}

/**
 * Processar um grupo empresarial (is_group = true)
 */
async function processGroupCompany(
  supabase: ReturnType<typeof createSupabaseClient>,
  tokenRow: TokenRow,
  result: ImportResult
): Promise<void> {
  try {
    // Para grupos, usar a lógica do import-grupos.ts
    console.log(`\n🏢 Processando grupo: ${tokenRow.companyName || 'Grupo sem nome'}`)
    
    const groupResult = await importGroupCompanies(
      tokenRow.token,
      tokenRow.companyName
    )

    if (groupResult.childCount > 0) {
      result.success++
      result.companiesCreated += groupResult.childCount
      console.log(`  ✓ Grupo processado: ${groupResult.childCount} empresas filhas`)
    } else {
      result.skipped++
      console.warn(`  ⚠️  Grupo sem empresas filhas encontradas`)
    }
  } catch (error) {
    result.errors++
    console.error(`  ✗ Erro ao processar grupo ${tokenRow.companyName || tokenRow.token.substring(0, 20)}:`, 
      error instanceof Error ? error.message : 'Unknown error')
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando importação a partir de arquivos Excel...\n')

  // Carregar variáveis de ambiente
  await loadEnvFromSupa()

  const supabase = createSupabaseClient()

  // Ler argumentos da linha de comando
  const args = process.argv.slice(2)
  const limitArg = args.find(arg => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  const result: ImportResult = {
    total: 0,
    success: 0,
    errors: 0,
    skipped: 0,
    companiesCreated: 0,
    companiesUpdated: 0,
    cnpjsFound: 0,
    cnpjsNotFound: 0,
  }

  // 1. Processar arquivo unico.xlsx (empresas individuais)
  const unicoPath = path.join(process.cwd(), 'f360', 'clientes', 'unico.xlsx')
  const unicoTokens = extractTokensFromExcel(unicoPath)
  
  console.log(`\n📋 Processando ${unicoTokens.length} empresas individuais...`)
  const unicoToProcess = limit ? unicoTokens.slice(0, limit) : unicoTokens
  
  for (const tokenRow of unicoToProcess) {
    result.total++
    await processIndividualCompany(supabase, tokenRow, false, result)
  }

  // 2. Processar arquivo grupo.xlsx (grupos empresariais)
  const grupoPath = path.join(process.cwd(), 'f360', 'clientes', 'grupo.xlsx')
  const grupoTokens = extractTokensFromExcel(grupoPath)
  
  console.log(`\n🏢 Processando ${grupoTokens.length} grupos empresariais...`)
  const grupoToProcess = limit ? grupoTokens.slice(0, Math.max(0, limit - unicoToProcess.length)) : grupoTokens
  
  for (const tokenRow of grupoToProcess) {
    result.total++
    await processGroupCompany(supabase, tokenRow, result)
  }

  // 3. Resumo final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA IMPORTAÇÃO:')
  console.log('='.repeat(60))
  console.log(`Total processado: ${result.total}`)
  console.log(`✅ Sucesso: ${result.success}`)
  console.log(`❌ Erros: ${result.errors}`)
  console.log(`⏭️  Pulados: ${result.skipped}`)
  console.log(`🆕 Empresas criadas: ${result.companiesCreated}`)
  console.log(`🔄 Empresas atualizadas: ${result.companiesUpdated}`)
  console.log(`🔍 CNPJs encontrados: ${result.cnpjsFound}`)
  console.log(`⚠️  CNPJs não encontrados: ${result.cnpjsNotFound}`)
  console.log('='.repeat(60))
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
}

export { extractTokensFromExcel, extractCnpjFromApi }

