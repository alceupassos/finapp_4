/**
 * Script para aplicar batches DFC via migrations SQL
 * 
 * Este script lê os arquivos SQL gerados e aplica via MCP Supabase
 */

import fs from 'fs'
import path from 'path'

const batches = [
  'import_dfc_batch_1.sql',
  'import_dfc_batch_2.sql',
  'import_dfc_batch_3.sql',
]

console.log('📋 Batches DFC SQL gerados:')
batches.forEach((batch, i) => {
  const filePath = path.join(process.cwd(), batch)
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    console.log(`   ${i + 1}. ${batch} (${(stats.size / 1024).toFixed(2)} KB, ${content.split('\\n').length} linhas)`)
  } else {
    console.log(`   ${i + 1}. ${batch} (não encontrado)`)
  }
})

console.log('\\n⚠️  Para executar os batches, use o MCP Supabase apply_migration com o conteúdo de cada arquivo')
console.log('   Ou execute manualmente via Supabase Dashboard SQL Editor')

