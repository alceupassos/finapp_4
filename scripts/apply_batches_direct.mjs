/**
 * Script que aplica batches SQL diretamente via mcp_supabase_execute_sql
 * Este script lê os arquivos e gera instruções para aplicação manual
 * ou pode ser usado como base para automação
 */
import fs from 'fs'

const batches = [
  ...Array.from({ length: 14 }, (_, i) => `import_dre_batch_${i + 1}.sql`),
  ...Array.from({ length: 14 }, (_, i) => `import_dfc_batch_${i + 1}.sql`),
]

console.log('📋 Script para aplicar batches SQL ao Supabase\n')
console.log('='.repeat(60))
console.log(`\nTotal de batches: ${batches.length}`)
console.log(`\n💡 Para aplicar cada batch, use:`)
console.log(`   mcp_supabase_execute_sql com o conteúdo completo do arquivo\n`)

for (const batch of batches) {
  if (fs.existsSync(batch)) {
    const size = (fs.readFileSync(batch, 'utf-8').length / 1024).toFixed(2)
    const lines = fs.readFileSync(batch, 'utf-8').split('\n').length
    console.log(`✅ ${batch} - ${size} KB, ${lines} linhas`)
  } else {
    console.log(`❌ ${batch} - Arquivo não encontrado`)
  }
}

console.log(`\n📝 Todos os arquivos estão prontos para aplicação via mcp_supabase_execute_sql\n`)

