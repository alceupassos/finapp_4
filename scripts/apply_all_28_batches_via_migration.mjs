/**
 * Script para aplicar todos os 28 batches SQL via mcp_supabase_apply_migration
 * Lê cada arquivo completo e prepara para aplicação via migration
 * 
 * NOTA: Este script prepara os batches. A aplicação real deve ser feita
 * via mcp_supabase_apply_migration com o conteúdo completo de cada arquivo.
 */
import fs from 'fs'

const batches = [
  ...Array.from({ length: 14 }, (_, i) => ({
    filename: `import_dre_batch_${i + 1}.sql`,
    type: 'DRE',
    number: i + 1,
    migrationName: `apply_dre_batch_${i + 1}`
  })),
  ...Array.from({ length: 14 }, (_, i) => ({
    filename: `import_dfc_batch_${i + 1}.sql`,
    type: 'DFC',
    number: i + 1,
    migrationName: `apply_dfc_batch_${i + 1}`
  }))
]

console.log('🚀 Preparando aplicação de 28 batches SQL via migration\n')
console.log('='.repeat(70))

const results = []

for (const batch of batches) {
  if (fs.existsSync(batch.filename)) {
    const content = fs.readFileSync(batch.filename, 'utf-8')
    const size = (content.length / 1024).toFixed(2)
    const lines = content.split('\n').length
    
    results.push({
      ...batch,
      content,
      size,
      lines
    })
    
    console.log(`✅ ${batch.type.padEnd(3)} Batch ${batch.number.toString().padStart(2)}: ${batch.filename.padEnd(25)} - ${size.padStart(7)} KB, ${lines.toString().padStart(5)} linhas`)
  } else {
    console.log(`❌ ${batch.type.padEnd(3)} Batch ${batch.number.toString().padStart(2)}: ${batch.filename.padEnd(25)} - ARQUIVO NÃO ENCONTRADO`)
  }
}

console.log('\n' + '='.repeat(70))
console.log(`\n✅ Total: ${results.length} batches prontos para aplicação`)
console.log('\n💡 Para aplicar cada batch, use:')
console.log('   mcp_supabase_apply_migration com:')
console.log('   - name: apply_dre_batch_X ou apply_dfc_batch_X')
console.log('   - query: conteúdo completo do arquivo correspondente')

