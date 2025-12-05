/**
 * Script que divide batches SQL em chunks menores e aplica via MCP
 * Como os arquivos são muito grandes, divide em lotes de 100 registros
 */
import fs from 'fs'
import { execSync } from 'child_process'

function splitSQLFile(filename, chunkSize = 100) {
  const sql = fs.readFileSync(filename, 'utf-8')
  
  // Extrair informações do INSERT
  const tableMatch = sql.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)/i)
  if (!tableMatch) {
    throw new Error(`Não foi possível identificar a tabela em ${filename}`)
  }
  
  const table = tableMatch[1]
  const columns = tableMatch[2].split(',').map(c => c.trim())
  
  // Extrair valores
  const valuesMatch = sql.match(/VALUES\s*([\s\S]+?)\s*ON CONFLICT/i) || sql.match(/VALUES\s*([\s\S]+?);?$/i)
  if (!valuesMatch) {
    throw new Error(`Não foi possível identificar os valores em ${filename}`)
  }
  
  const valuesText = valuesMatch[1].trim()
  
  // Extrair ON CONFLICT clause
  const conflictMatch = sql.match(/ON CONFLICT\s*\(([^)]+)\)\s*DO UPDATE\s+SET\s+([^;]+);?/i)
  const conflictColumns = conflictMatch ? conflictMatch[1].split(',').map(c => c.trim()) : []
  const conflictUpdate = conflictMatch ? conflictMatch[2].trim() : ''
  
  // Dividir valores em linhas (aproximado - cada linha é um registro)
  const lines = valuesText.split(/\),\s*\(/).map(line => {
    return line.replace(/^\(/, '').replace(/\)$/, '').trim()
  }).filter(line => line)
  
  const chunks = []
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunkLines = lines.slice(i, i + chunkSize)
    const chunkSQL = `INSERT INTO ${table} (${columns.join(', ')})\nVALUES\n(${chunkLines.map(l => `(${l})`).join(',\n')})\n${conflictMatch ? `ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${conflictUpdate}` : ''};`
    chunks.push(chunkSQL)
  }
  
  return chunks
}

async function applyChunk(chunkSQL, chunkNum, totalChunks) {
  // Salvar chunk em arquivo temporário
  const tempFile = `/tmp/batch_chunk_${Date.now()}_${chunkNum}.sql`
  fs.writeFileSync(tempFile, chunkSQL)
  
  try {
    // Aplicar via mcp_supabase_execute_sql
    // Como não podemos chamar MCP tools diretamente, vamos usar uma abordagem diferente
    // Vamos criar um script que pode ser executado manualmente ou via outro método
    
    console.log(`   📦 Chunk ${chunkNum}/${totalChunks} preparado (${tempFile})`)
    return { success: true, tempFile }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Preparando batches SQL em chunks para aplicação\n')
  console.log('='.repeat(60))
  
  const batches = [
    ...Array.from({ length: 14 }, (_, i) => `import_dre_batch_${i + 1}.sql`),
    ...Array.from({ length: 14 }, (_, i) => `import_dfc_batch_${i + 1}.sql`),
  ]
  
  console.log(`📋 Total de batches: ${batches.length}\n`)
  
  for (const batch of batches) {
    if (!fs.existsSync(batch)) {
      console.log(`❌ ${batch} - Arquivo não encontrado`)
      continue
    }
    
    console.log(`\n📥 Processando ${batch}...`)
    
    try {
      const chunks = splitSQLFile(batch, 100)
      console.log(`   📊 Dividido em ${chunks.length} chunks de ~100 registros cada`)
      
      // Salvar chunks em arquivos
      const chunkDir = `./batch_chunks/${batch.replace('.sql', '')}`
      if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir, { recursive: true })
      }
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkFile = `${chunkDir}/chunk_${i + 1}.sql`
        fs.writeFileSync(chunkFile, chunks[i])
      }
      
      console.log(`   ✅ Chunks salvos em ${chunkDir}/`)
    } catch (error) {
      console.error(`   ❌ Erro ao processar ${batch}:`, error.message)
    }
  }
  
  console.log(`\n\n✅ Todos os batches foram divididos em chunks!`)
  console.log(`\n💡 Para aplicar os chunks:`)
  console.log(`   1. Use mcp_supabase_execute_sql com o conteúdo de cada arquivo em batch_chunks/`)
  console.log(`   2. Ou use o script apply_chunks_auto.mjs (próximo passo)\n`)
}

main().catch(console.error)

