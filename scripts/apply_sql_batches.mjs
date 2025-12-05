/**
 * Script para aplicar batches SQL ao Supabase
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

async function applyBatch(filename) {
  console.log(`\n📥 Aplicando ${filename}...`)
  
  try {
    const sql = fs.readFileSync(filename, 'utf-8')
    
    // Aplicar SQL via RPC ou execute direto
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // Tentar executar diretamente via query
      console.log(`   ⚠️  RPC falhou, tentando método alternativo...`)
      // Como não temos exec_sql, vamos tentar executar o SQL de outra forma
      // Por enquanto, vamos apenas verificar se o arquivo é válido
      console.log(`   ✅ Arquivo lido: ${sql.length} bytes, ${sql.split('\\n').length} linhas`)
      return { success: false, error: 'RPC não disponível - usar mcp_supabase_apply_migration' }
    }
    
    console.log(`   ✅ ${filename} aplicado com sucesso!`)
    return { success: true, data }
  } catch (error) {
    console.error(`   ❌ Erro ao aplicar ${filename}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Aplicando batches SQL ao Supabase\n')
  
  // Aplicar batches DRE
  console.log('📊 Aplicando batches DRE...')
  for (let i = 1; i <= 14; i++) {
    const filename = `import_dre_batch_${i}.sql`
    if (fs.existsSync(filename)) {
      await applyBatch(filename)
      await new Promise(resolve => setTimeout(resolve, 500)) // Delay entre batches
    }
  }
  
  // Aplicar batches DFC
  console.log('\n💰 Aplicando batches DFC...')
  for (let i = 1; i <= 14; i++) {
    const filename = `import_dfc_batch_${i}.sql`
    if (fs.existsSync(filename)) {
      await applyBatch(filename)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  console.log('\n✅ Todos os batches processados!')
  console.log('💡 Nota: Use mcp_supabase_apply_migration para aplicar cada batch')
}

main().catch(console.error)

