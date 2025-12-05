/**
 * Script para aplicar batches SQL ao Supabase via MCP
 * Este script lê os arquivos SQL e os aplica usando mcp_supabase_execute_sql
 */
import fs from 'fs'
import { readFile } from 'fs/promises'

// Lista de batches para aplicar
const batches = [
  // Batches DRE
  ...Array.from({ length: 14 }, (_, i) => `import_dre_batch_${i + 1}.sql`),
  // Batches DFC
  ...Array.from({ length: 14 }, (_, i) => `import_dfc_batch_${i + 1}.sql`),
]

async function applyBatch(filename) {
  console.log(`\n📥 Aplicando ${filename}...`)
  
  try {
    if (!fs.existsSync(filename)) {
      console.log(`   ⚠️  Arquivo não encontrado: ${filename}`)
      return { success: false, error: 'Arquivo não encontrado' }
    }
    
    const sql = await readFile(filename, 'utf-8')
    const lineCount = sql.split('\n').length
    
    console.log(`   📊 Arquivo: ${(sql.length / 1024).toFixed(2)} KB, ${lineCount} linhas`)
    console.log(`   ⏳ Aplicando ao Supabase...`)
    
    // Retornar SQL para ser aplicado via MCP
    return {
      success: true,
      filename,
      sql,
      size: sql.length,
      lines: lineCount
    }
  } catch (error) {
    console.error(`   ❌ Erro ao ler ${filename}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Preparando batches SQL para aplicação\n')
  console.log(`📋 Total de batches: ${batches.length}\n`)
  
  const results = []
  
  for (const batch of batches) {
    const result = await applyBatch(batch)
    results.push(result)
    
    // Pequeno delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Preparação concluída!`)
  console.log(`   ✅ Sucesso: ${successful}`)
  console.log(`   ❌ Falhas: ${failed}`)
  console.log(`\n💡 Use mcp_supabase_execute_sql para aplicar cada batch`)
  console.log(`   Os arquivos SQL estão prontos para aplicação.\n`)
  
  // Retornar resultados para uso externo
  return results
}

main().catch(console.error)

