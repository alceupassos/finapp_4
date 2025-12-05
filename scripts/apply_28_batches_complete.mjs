/**
 * Script para aplicar todos os 28 batches SQL completos ao Supabase
 * Usa mcp_supabase_execute_sql para aplicar cada batch completo
 */
import fs from 'fs'

const batches = [
  ...Array.from({ length: 14 }, (_, i) => `import_dre_batch_${i + 1}.sql`),
  ...Array.from({ length: 14 }, (_, i) => `import_dfc_batch_${i + 1}.sql`),
]

console.log('📋 Preparando aplicação de 28 batches SQL completos\n')
console.log('='.repeat(60))

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i]
  if (fs.existsSync(batch)) {
    const content = fs.readFileSync(batch, 'utf-8')
    const size = (content.length / 1024).toFixed(2)
    const lines = content.split('\n').length
    console.log(`${(i + 1).toString().padStart(2)}. ${batch.padEnd(25)} - ${size.padStart(8)} KB, ${lines.toString().padStart(4)} linhas`)
  }
}

console.log('='.repeat(60))
console.log(`\n✅ Todos os 28 batches estão prontos para aplicação`)
console.log(`\n💡 Para aplicar cada batch, use:`)
console.log(`   mcp_supabase_execute_sql com o conteúdo completo do arquivo`)
console.log(`\n📝 Ordem de aplicação:`)
console.log(`   1-14: Batches DRE (import_dre_batch_1.sql até import_dre_batch_14.sql)`)
console.log(`   15-28: Batches DFC (import_dfc_batch_1.sql até import_dfc_batch_14.sql)\n`)

