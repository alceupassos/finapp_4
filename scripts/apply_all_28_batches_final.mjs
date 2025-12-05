/**
 * Script para aplicar todos os 28 batches SQL ao Supabase
 * Lê cada arquivo completo e executa via Supabase client
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
  }))
]

async function applyBatch(batch) {
  if (!fs.existsSync(batch.filename)) {
    console.log(`❌ ${batch.type.padEnd(3)} Batch ${batch.number.toString().padStart(2)}: ${batch.filename} - ARQUIVO NÃO ENCONTRADO`)
    return { success: false }
  }

  const content = fs.readFileSync(batch.filename, 'utf-8')
  const size = (content.length / 1024).toFixed(2)
  const lines = content.split('\n').length

  console.log(`📥 ${batch.type.padEnd(3)} Batch ${batch.number.toString().padStart(2)}: ${batch.filename.padEnd(25)} - ${size.padStart(7)} KB, ${lines.toString().padStart(5)} linhas`)

  try {
    // Executar SQL diretamente via Supabase
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: content })

    if (error) {
      // Tentar executar via query direta
      console.log(`   ⚠️  RPC falhou, tentando método alternativo...`)
      const { error: execError } = await supabase.from('_exec_sql').select('*').limit(0)
      
      if (execError) {
        // Usar execute_sql via MCP (não disponível aqui)
        console.log(`   ⚠️  Método alternativo não disponível`)
        console.log(`   💡 Aplicar manualmente via mcp_supabase_execute_sql ou mcp_supabase_apply_migration`)
        return { success: false, error: 'RPC não disponível' }
      }
    }

    console.log(`   ✅ ${batch.type.padEnd(3)} Batch ${batch.number.toString().padStart(2)} aplicado com sucesso!`)
    return { success: true, data }
  } catch (error) {
    console.error(`   ❌ Erro ao aplicar ${batch.filename}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Aplicando 28 batches SQL ao Supabase\n')
  console.log('='.repeat(70))

  const results = { success: 0, failed: 0 }

  for (const batch of batches) {
    const result = await applyBatch(batch)
    if (result.success) {
      results.success++
    } else {
      results.failed++
    }
    await new Promise(resolve => setTimeout(resolve, 500)) // Delay entre batches
  }

  console.log('\n' + '='.repeat(70))
  console.log(`\n✅ Concluído: ${results.success} batches aplicados, ${results.failed} falharam`)
  console.log('\n💡 Se alguns batches falharam, aplicar manualmente via:')
  console.log('   mcp_supabase_execute_sql ou mcp_supabase_apply_migration')
}

main().catch(console.error)

