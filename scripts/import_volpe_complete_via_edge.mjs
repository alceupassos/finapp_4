/**
 * Script de Importação Completa das 13 Empresas Volpe
 * 
 * Usa a Edge Function sync-f360 para importar dados de 2025
 * Processa em batches para não sobrecarregar a API F360
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias')
  process.exit(1)
}

// Período de importação: 2025 completo
const DATA_INICIO = '2025-01-01'
const DATA_FIM = '2025-12-31'

// Batch size: processar 3 empresas por vez
const BATCH_SIZE = 3
const DELAY_BETWEEN_BATCHES = 5000 // 5 segundos entre batches

async function importCompany(cnpj, razaoSocial) {
  console.log(`\n📊 Importando ${razaoSocial} (${cnpj})...`)
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-f360`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cnpj: cnpj,
        dataInicio: DATA_INICIO,
        dataFim: DATA_FIM,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`  ❌ Erro HTTP ${response.status}: ${errorText}`)
      return { success: false, error: errorText }
    }

    const result = await response.json()
    
    if (result.success) {
      console.log(`  ✅ Sucesso:`)
      console.log(`     DRE: ${result.dreEntries || 0} registros`)
      console.log(`     DFC: ${result.dfcEntries || 0} registros`)
      console.log(`     Accounting: ${result.accountingEntries || 0} registros`)
      return { success: true, ...result }
    } else {
      console.error(`  ❌ Falha:`, result.error || result.errors)
      return { success: false, error: result.error || result.errors }
    }
  } catch (error) {
    console.error(`  ❌ Erro na requisição:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Importação Completa das 13 Empresas Volpe')
  console.log('='.repeat(60))
  console.log(`📅 Período: ${DATA_INICIO} a ${DATA_FIM}`)
  console.log(`📦 Batch size: ${BATCH_SIZE} empresas`)
  console.log(`⏱️  Delay entre batches: ${DELAY_BETWEEN_BATCHES}ms`)
  console.log('='.repeat(60))

  // Lista das 13 empresas Volpe (hardcoded para evitar problemas de RLS)
  // Para teste inicial, usar apenas VOLPE MATRIZ que já tem dados
  const TEST_MODE = process.env.TEST_MODE === 'true'
  const companies = TEST_MODE 
    ? [
        { cnpj: '26888098000159', razao_social: 'VOLPE MATRIZ' },
      ]
    : [
        { cnpj: '26888098000159', razao_social: 'VOLPE MATRIZ' },
        { cnpj: '26888098000230', razao_social: 'VOLPE ZOIAO' },
        { cnpj: '26888098000310', razao_social: 'VOLPE MAUÁ' },
        { cnpj: '26888098000400', razao_social: 'VOLPE DIADEMA' },
        { cnpj: '26888098000582', razao_social: 'VOLPE GRAJAÚ' },
        { cnpj: '26888098000663', razao_social: 'VOLPE SANTO ANDRÉ' },
        { cnpj: '26888098000744', razao_social: 'VOLPE CAMPO LIMPO' },
        { cnpj: '26888098000825', razao_social: 'VOLPE BRASILÂNDIA' },
        { cnpj: '26888098000906', razao_social: 'VOLPE POÁ' },
        { cnpj: '26888098001040', razao_social: 'VOLPE ITAIM' },
        { cnpj: '26888098001120', razao_social: 'VOLPE PRAIA GRANDE' },
        { cnpj: '26888098001201', razao_social: 'VOLPE ITANHAÉM' },
        { cnpj: '26888098001392', razao_social: 'VOLPE SÃO MATHEUS' },
      ]
  
  console.log(`✅ ${companies.length} empresas configuradas para importação\n`)

  console.log(`\n✅ ${companies.length} empresas encontradas\n`)

  const results = []
  const batches = []

  // Dividir em batches
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    batches.push(companies.slice(i, i + BATCH_SIZE))
  }

  // Processar batches
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    console.log(`\n📦 Processando batch ${batchIndex + 1}/${batches.length} (${batch.length} empresas)...`)

    // Processar empresas do batch em paralelo
    const batchResults = await Promise.all(
      batch.map(company => importCompany(company.cnpj, company.razao_social))
    )

    results.push(...batchResults.map((result, idx) => ({
      company: batch[idx],
      ...result,
    })))

    // Delay entre batches (exceto no último)
    if (batchIndex < batches.length - 1) {
      console.log(`\n⏳ Aguardando ${DELAY_BETWEEN_BATCHES}ms antes do próximo batch...`)
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
    }
  }

  // Resumo final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA IMPORTAÇÃO')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`\n✅ Sucessos: ${successful.length}`)
  console.log(`❌ Falhas: ${failed.length}`)

  let totalDre = 0
  let totalDfc = 0
  let totalAccounting = 0

  successful.forEach(r => {
    totalDre += r.dreEntries || 0
    totalDfc += r.dfcEntries || 0
    totalAccounting += r.accountingEntries || 0
  })

  console.log(`\n📈 Totais importados:`)
  console.log(`   DRE: ${totalDre} registros`)
  console.log(`   DFC: ${totalDfc} registros`)
  console.log(`   Accounting: ${totalAccounting} registros`)

  if (failed.length > 0) {
    console.log(`\n❌ Empresas com falha:`)
    failed.forEach(r => {
      console.log(`   ${r.company.razao_social} (${r.company.cnpj}): ${r.error}`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Importação concluída!')
  console.log('='.repeat(60))
}

main().catch(console.error)

