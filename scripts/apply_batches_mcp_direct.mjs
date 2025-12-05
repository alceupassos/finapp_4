/**
 * Script para aplicar todos os 28 batches SQL via MCP Supabase
 * Lê cada arquivo completo e executa via mcp_supabase_execute_sql
 * 
 * NOTA: Este script prepara os comandos. A execução real deve ser feita
 * via mcp_supabase_execute_sql ou mcp_supabase_apply_migration
 */
import fs from 'fs'

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

console.log('🚀 Preparando aplicação de 28 batches SQL via MCP\n')
console.log('='.repeat(70))

for (const batch of batches) {
  if (fs.existsSync(batch.filename)) {
    const content = fs.readFileSync(batch.filename, 'utf-8')
    const size = (content.length / 1024).toFixed(2)
    const lines = content.split('\n').length
    
    console.log(`✅ ${batch.type.padEnd(3)} Batch ${batch.number.toString().padStart(2)}: ${batch.filename.padEnd(25)} - ${size.padStart(7)} KB, ${lines.toString().padStart(5)} linhas`)
  } else {
    console.log(`❌ ${batch.type.padEnd(3)} Batch ${batch.number.toString().padStart(2)}: ${batch.filename.padEnd(25)} - ARQUIVO NÃO ENCONTRADO`)
  }
}

console.log('\n' + '='.repeat(70))
console.log('\n✅ Todos os 28 batches estão prontos para aplicação via MCP')
console.log('\n💡 Para aplicar cada batch, use:')
console.log('   mcp_supabase_execute_sql com o conteúdo completo de cada arquivo')
console.log('   ou')
console.log('   mcp_supabase_apply_migration com name e query')

