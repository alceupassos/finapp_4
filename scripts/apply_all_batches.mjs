/**
 * Script para aplicar todos os batches SQL ao Supabase
 * Lê os arquivos SQL e os aplica via Supabase REST API
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
    if (!fs.existsSync(filename)) {
      console.log(`   ⚠️  Arquivo não encontrado: ${filename}`)
      return { success: false, error: 'Arquivo não encontrado' }
    }
    
    const sql = fs.readFileSync(filename, 'utf-8')
    const lineCount = sql.split('\n').length
    const sizeKB = (sql.length / 1024).toFixed(2)
    
    console.log(`   📊 Arquivo: ${sizeKB} KB, ${lineCount} linhas`)
    console.log(`   ⏳ Executando SQL...`)
    
    // Executar SQL via REST API usando rpc
    // Como não temos função exec_sql, vamos usar uma abordagem diferente
    // Vamos executar o SQL diretamente via fetch para o endpoint SQL do Supabase
    
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
    
    if (!response.ok) {
      // Se RPC não existir, vamos tentar executar via query direta
      // Mas isso não é possível via REST API, então vamos apenas logar
      console.log(`   ⚠️  RPC não disponível. SQL precisa ser aplicado manualmente via MCP.`)
      console.log(`   💡 Use: mcp_supabase_execute_sql com o conteúdo de ${filename}`)
      return { success: false, error: 'RPC não disponível - usar MCP' }
    }
    
    const result = await response.text()
    console.log(`   ✅ ${filename} aplicado com sucesso!`)
    return { success: true, result }
  } catch (error) {
    console.error(`   ❌ Erro ao aplicar ${filename}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Aplicando batches SQL ao Supabase\n')
  console.log('⚠️  NOTA: Este script prepara os batches para aplicação.')
  console.log('   Use mcp_supabase_execute_sql para aplicar cada batch.\n')
  
  const batches = [
    // Batches DRE
    ...Array.from({ length: 14 }, (_, i) => `import_dre_batch_${i + 1}.sql`),
    // Batches DFC
    ...Array.from({ length: 14 }, (_, i) => `import_dfc_batch_${i + 1}.sql`),
  ]
  
  console.log(`📋 Total de batches: ${batches.length}\n`)
  
  const results = []
  
  for (const batch of batches) {
    const result = await applyBatch(batch)
    results.push({ batch, ...result })
    
    // Pequeno delay
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Processamento concluído!`)
  console.log(`   📊 Total: ${batches.length} batches`)
  console.log(`   ✅ Preparados: ${successful}`)
  console.log(`   ⚠️  Requerem MCP: ${failed}`)
  console.log(`\n💡 Para aplicar os batches, use:`)
  console.log(`   mcp_supabase_execute_sql com o conteúdo de cada arquivo SQL\n`)
}

main().catch(console.error)

