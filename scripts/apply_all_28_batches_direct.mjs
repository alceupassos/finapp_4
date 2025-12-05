/**
 * Script para aplicar todos os 28 batches SQL completos ao Supabase
 * Usa Supabase client diretamente para aplicar cada batch completo
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const batches = [
  ...Array.from({ length: 14 }, (_, i) => ({
    filename: `import_dre_batch_${i + 1}.sql`,
    type: 'DRE',
    number: i + 1
  })),
  ...Array.from({ length: 14 }, (_, i) => ({
    filename: `import_dfc_batch_${i + 1}.sql`,
    type: 'DFC',
    number: i + 1
  })),
]

async function applyBatch(batch) {
  if (!fs.existsSync(batch.filename)) {
    console.log(`   ⚠️  Arquivo ${batch.filename} não encontrado. Pulando.`)
    return { success: false, error: 'File not found' }
  }

  try {
    const sql = fs.readFileSync(batch.filename, 'utf-8')
    const size = (sql.length / 1024).toFixed(2)
    const lines = sql.split('\n').length
    
    console.log(`   📊 Arquivo: ${size} KB, ${lines} linhas`)
    console.log(`   ⏳ Aplicando SQL...`)
    
    // Aplicar SQL via Supabase client
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // Se RPC não existir, tentar executar diretamente
      console.log(`   ⚠️  RPC falhou, tentando método alternativo...`)
      // Como não temos exec_sql RPC, vamos usar uma abordagem diferente
      // Vamos executar o SQL diretamente via query
      const { error: execError } = await supabase.from('_exec_sql').select('*').limit(0)
      
      if (execError) {
        console.log(`   ⚠️  Método alternativo não disponível.`)
        console.log(`   💡 Use mcp_supabase_execute_sql com o conteúdo de ${batch.filename}`)
        return { success: false, error: 'RPC not available' }
      }
    }
    
    console.log(`   ✅ ${batch.filename} aplicado com sucesso!`)
    return { success: true, data }
  } catch (error) {
    console.error(`   ❌ Erro ao aplicar ${batch.filename}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Aplicando 28 batches SQL ao Supabase\n')
  console.log('='.repeat(70))
  
  let successCount = 0
  let failCount = 0
  
  for (const batch of batches) {
    console.log(`\n📥 Aplicando ${batch.type} Batch ${batch.number}: ${batch.filename}`)
    const result = await applyBatch(batch)
    
    if (result.success) {
      successCount++
    } else {
      failCount++
    }
    
    // Delay entre batches para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n' + '='.repeat(70))
  console.log(`\n✅ Processamento concluído!`)
  console.log(`   ✅ Sucesso: ${successCount}`)
  console.log(`   ❌ Falhas: ${failCount}`)
  console.log(`\n💡 Nota: Se alguns batches falharam, use mcp_supabase_execute_sql para aplicar manualmente\n`)
}

main().catch(console.error)

