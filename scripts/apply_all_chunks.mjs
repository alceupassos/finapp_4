/**
 * Script final para aplicar todos os chunks SQL ao Supabase
 * Usa a função RPC exec_sql que criamos
 */
import dotenv from 'dotenv'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { glob } from 'glob'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyChunk(chunkFile) {
  try {
    const sql = fs.readFileSync(chunkFile, 'utf-8')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Aplicando todos os chunks SQL ao Supabase\n')
  console.log('='.repeat(60))
  
  // Encontrar todos os chunks
  const chunkFiles = await glob('batch_chunks/**/chunk_*.sql')
  chunkFiles.sort()
  
  console.log(`📋 Total de chunks encontrados: ${chunkFiles.length}\n`)
  
  const results = []
  let currentBatch = null
  
  for (const chunkFile of chunkFiles) {
    const batchMatch = chunkFile.match(/batch_chunks\/([^/]+)\//)
    const batch = batchMatch ? batchMatch[1] : 'unknown'
    const chunkNum = chunkFile.match(/chunk_(\d+)\.sql$/)?.[1] || '?'
    
    // Mostrar separador quando mudar de batch
    if (currentBatch !== batch) {
      if (currentBatch !== null) {
        console.log('')
      }
      console.log(`📊 Processando ${batch}...`)
      currentBatch = batch
    }
    
    process.stdout.write(`   📦 Chunk ${chunkNum}... `)
    
    const result = await applyChunk(chunkFile)
    results.push({ chunkFile, batch, chunkNum, ...result })
    
    if (result.success) {
      console.log('✅')
    } else {
      console.log(`❌ ${result.error}`)
    }
    
    // Pequeno delay
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Resumo final
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Processamento concluído!`)
  console.log(`   📊 Total: ${chunkFiles.length} chunks`)
  console.log(`   ✅ Sucesso: ${successful}`)
  console.log(`   ❌ Falhas: ${failed}`)
  
  if (failed > 0) {
    console.log(`\n⚠️  Chunks com falha:`)
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.chunkFile}: ${r.error}`)
      })
  }
  
  console.log('\n')
}

main().catch(error => {
  console.error('\n❌ Erro fatal:', error)
  process.exit(1)
})

