/**
 * Script final para aplicar todos os 28 batches SQL ao Supabase
 * Lê cada arquivo completo e aplica via mcp_supabase_execute_sql
 */
import fs from 'fs'

const batches = [
  ...Array.from({ length: 14 }, (_, i) => `import_dre_batch_${i + 1}.sql`),
  ...Array.from({ length: 14 }, (_, i) => `import_dfc_batch_${i + 1}.sql`),
]

console.log('📋 Lista de batches para aplicar:\n')
batches.forEach((batch, idx) => {
  if (fs.existsSync(batch)) {
    const size = (fs.readFileSync(batch, 'utf-8').length / 1024).toFixed(2)
    const lines = fs.readFileSync(batch, 'utf-8').split('\n').length
    console.log(`${idx + 1}. ${batch} - ${size} KB, ${lines} linhas`)
  }
})

console.log(`\n✅ Total: ${batches.length} batches prontos para aplicação`)
console.log(`\n💡 Use mcp_supabase_execute_sql com o conteúdo completo de cada arquivo\n`)

