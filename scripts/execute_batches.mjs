/**
 * Script para executar batches SQL via MCP Supabase
 * 
 * Este script lê os arquivos SQL gerados e executa via MCP
 * Como não podemos chamar MCP diretamente de Node.js, este script
 * apenas prepara os comandos para execução manual via MCP
 */

import fs from 'fs'
import path from 'path'

const batches = [
  'import_dre_batch_1.sql',
  'import_dre_batch_2.sql',
  'import_dre_batch_3.sql',
  'import_dre_batch_4.sql',
  'import_dre_batch_5.sql',
  'import_dfc_batch_1.sql',
  'import_dfc_batch_2.sql',
  'import_dfc_batch_3.sql',
  'import_dfc_batch_4.sql',
  'import_dfc_batch_5.sql',
]

console.log('📋 Batches SQL gerados:')
batches.forEach((batch, i) => {
  const filePath = path.join(process.cwd(), batch)
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    console.log(`   ${i + 1}. ${batch} (${(stats.size / 1024).toFixed(2)} KB)`)
  } else {
    console.log(`   ${i + 1}. ${batch} (não encontrado)`)
  }
})

console.log('\n⚠️  Para executar os batches, use o MCP Supabase execute_sql com o conteúdo de cada arquivo')
console.log('   Ou execute manualmente via Supabase Dashboard SQL Editor')

