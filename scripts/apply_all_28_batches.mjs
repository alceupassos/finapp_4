/**
 * Script para aplicar todos os 28 batches SQL completos ao Supabase
 * Lê cada arquivo completo e aplica via mcp_supabase_execute_sql
 * 
 * NOTA: Este script prepara os batches. A aplicação real deve ser feita
 * via mcp_supabase_execute_sql com o conteúdo completo de cada arquivo.
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
  })),
]

console.log('🚀 Preparando aplicação de 28 batches SQL\n')
console.log('='.repeat(60))

let totalSize = 0
let totalLines = 0

for (const batch of batches) {
  if (fs.existsSync(batch.filename)) {
    const content = fs.readFileSync(batch.filename, 'utf-8')
    const size = (content.length / 1024).toFixed(2)
    const lines = content.split('\n').length
    totalSize += parseFloat(size)
    totalLines += lines
    
    console.log(`✅ ${batch.filename.padEnd(25)} - ${size.padStart(8)} KB, ${lines.toString().padStart(4)} linhas`)
  } else {
    console.log(`❌ ${batch.filename.padEnd(25)} - Arquivo não encontrado`)
  }
}

console.log('='.repeat(60))
console.log(`\n📊 Resumo:`)
console.log(`   Total batches: ${batches.length}`)
console.log(`   Tamanho total: ${totalSize.toFixed(2)} KB`)
console.log(`   Linhas totais: ${totalLines}`)
console.log(`\n💡 Para aplicar, use mcp_supabase_execute_sql com o conteúdo completo de cada arquivo\n`)

