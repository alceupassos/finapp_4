/**
 * Script para aplicar importação F360 robusta via MCP
 * Divide o SQL em batches menores para evitar timeout
 */

import fs from 'fs'
import path from 'path'

const SQL_FILE = path.join(process.cwd(), 'import_f360_robust_generated.sql')

async function applySQLBatch(sqlBatch) {
  // Usar MCP Supabase para aplicar
  // Como não temos acesso direto ao MCP aqui, vamos gerar arquivos menores
  return sqlBatch
}

function splitSQLFile(filePath, batchSize = 500) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  const batches = []
  let currentBatch = []
  let inInsert = false
  let insertStatement = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (line.startsWith('INSERT INTO')) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch.join('\n'))
        currentBatch = []
      }
      inInsert = true
      insertStatement = line
      currentBatch.push(line)
    } else if (inInsert && (line.startsWith('ON CONFLICT') || line === '')) {
      currentBatch.push(line)
      if (line.startsWith('ON CONFLICT')) {
        inInsert = false
        if (currentBatch.length >= batchSize) {
          batches.push(currentBatch.join('\n'))
          currentBatch = []
        }
      }
    } else if (inInsert) {
      currentBatch.push(line)
      if (currentBatch.length >= batchSize) {
        batches.push(currentBatch.join('\n'))
        currentBatch = []
        inInsert = false
      }
    } else {
      currentBatch.push(line)
    }
  }
  
  if (currentBatch.length > 0) {
    batches.push(currentBatch.join('\n'))
  }
  
  return batches
}

async function main() {
  console.log('📦 Dividindo SQL em batches...\n')
  
  const batches = splitSQLFile(SQL_FILE, 500)
  console.log(`✅ Dividido em ${batches.length} batches\n`)
  
  // Salvar batches em arquivos separados
  const batchesDir = path.join(process.cwd(), 'batch_chunks', 'import_f360_robust')
  if (!fs.existsSync(batchesDir)) {
    fs.mkdirSync(batchesDir, { recursive: true })
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batchFile = path.join(batchesDir, `chunk_${i + 1}.sql`)
    fs.writeFileSync(batchFile, batches[i])
    console.log(`✅ Batch ${i + 1}/${batches.length} salvo em ${batchFile}`)
  }
  
  console.log(`\n📋 Total: ${batches.length} batches criados`)
  console.log(`\n💡 Aplique os batches via MCP Supabase usando:`)
  console.log(`   mcp_supabase_execute_sql com cada chunk_*.sql`)
}

main().catch(console.error)

