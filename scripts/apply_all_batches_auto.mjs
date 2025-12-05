/**
 * Script automatizado para aplicar todos os batches SQL ao Supabase
 * Usa o cliente Supabase para executar SQL diretamente
 */
import dotenv from 'dotenv'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Executa SQL usando a função RPC exec_sql ou método alternativo
 */
async function executeSQL(sql) {
  try {
    // Tentar via RPC primeiro
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (!error) {
      return { success: true, data }
    }
    
    // Se RPC não existir, tentar via fetch direto para o endpoint SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql_query: sql })
    })
    
    if (response.ok) {
      return { success: true }
    }
    
    // Se ambos falharem, retornar erro
    const errorText = await response.text()
    return { success: false, error: errorText || 'RPC não disponível' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function applyBatch(filename) {
  console.log(`\n📥 Aplicando ${filename}...`)
  
  try {
    if (!fs.existsSync(filename)) {
      console.log(`   ⚠️  Arquivo não encontrado: ${filename}`)
      return { success: false, error: 'Arquivo não encontrado' }
    }
    
    const sql = fs.readFileSync(filename, 'utf-8')
    const lineCount = sql.split('\n').length
    const sizeKB = (sql.length / 1024).toFixed(2)
    
    console.log(`   📊 Arquivo: ${sizeKB} KB, ${lineCount} linhas`)
    console.log(`   ⏳ Executando SQL...`)
    
    const startTime = Date.now()
    const result = await executeSQL(sql)
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    if (result.success) {
      console.log(`   ✅ ${filename} aplicado com sucesso! (${duration}s)`)
      return { success: true, duration }
    } else {
      console.error(`   ❌ Erro ao aplicar ${filename}:`, result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error(`   ❌ Erro ao processar ${filename}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Aplicando batches SQL ao Supabase (Modo Automatizado)\n')
  console.log('='.repeat(60))
  
  const batches = [
    // Batches DRE
    ...Array.from({ length: 14 }, (_, i) => ({
      filename: `import_dre_batch_${i + 1}.sql`,
      type: 'DRE',
      number: i + 1
    })),
    // Batches DFC
    ...Array.from({ length: 14 }, (_, i) => ({
      filename: `import_dfc_batch_${i + 1}.sql`,
      type: 'DFC',
      number: i + 1
    })),
  ]
  
  console.log(`📋 Total de batches: ${batches.length}`)
  console.log(`   📊 DRE: 14 batches`)
  console.log(`   💰 DFC: 14 batches\n`)
  
  const results = []
  let currentType = null
  
  for (const batch of batches) {
    // Mostrar separador quando mudar de tipo
    if (currentType !== batch.type) {
      if (currentType !== null) {
        console.log('\n' + '-'.repeat(60))
      }
      console.log(`\n📊 Processando batches ${batch.type}...`)
      currentType = batch.type
    }
    
    const result = await applyBatch(batch.filename)
    results.push({ ...batch, ...result })
    
    // Pequeno delay entre batches para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Resumo final
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalDuration = results
    .filter(r => r.success && r.duration)
    .reduce((sum, r) => sum + parseFloat(r.duration), 0)
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Processamento concluído!`)
  console.log(`   📊 Total: ${batches.length} batches`)
  console.log(`   ✅ Sucesso: ${successful}`)
  console.log(`   ❌ Falhas: ${failed}`)
  if (totalDuration > 0) {
    console.log(`   ⏱️  Tempo total: ${totalDuration.toFixed(2)}s`)
  }
  
  if (failed > 0) {
    console.log(`\n⚠️  Batches com falha:`)
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.filename}: ${r.error}`)
      })
    console.log(`\n💡 Se houver falhas, verifique:`)
    console.log(`   1. Se a função RPC 'exec_sql' existe no Supabase`)
    console.log(`   2. Se as permissões do Service Role Key estão corretas`)
    console.log(`   3. Se os arquivos SQL estão no diretório correto`)
  }
  
  console.log('\n')
}

main().catch(error => {
  console.error('\n❌ Erro fatal:', error)
  process.exit(1)
})

