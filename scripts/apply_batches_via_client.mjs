/**
 * Script para aplicar batches SQL via Supabase Client
 * Lê os arquivos SQL, extrai os dados e faz INSERTs via client
 */
import dotenv from 'dotenv'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Extrai dados de um arquivo SQL INSERT
 */
function parseSQLFile(filename) {
  const sql = fs.readFileSync(filename, 'utf-8')
  
  // Extrair nome da tabela
  const tableMatch = sql.match(/INSERT INTO\s+(\w+)\s*\(/i)
  if (!tableMatch) {
    throw new Error(`Não foi possível identificar a tabela em ${filename}`)
  }
  const table = tableMatch[1]
  
  // Extrair colunas
  const columnsMatch = sql.match(/INSERT INTO\s+\w+\s*\(([^)]+)\)/i)
  if (!columnsMatch) {
    throw new Error(`Não foi possível identificar as colunas em ${filename}`)
  }
  const columns = columnsMatch[1].split(',').map(c => c.trim())
  
  // Extrair valores
  const valuesMatch = sql.match(/VALUES\s*([\s\S]+?)\s*ON CONFLICT/i) || sql.match(/VALUES\s*([\s\S]+?);?$/i)
  if (!valuesMatch) {
    throw new Error(`Não foi possível identificar os valores em ${filename}`)
  }
  
  const valuesText = valuesMatch[1].trim()
  const rows = []
  
  // Parsear cada linha de valores
  const valueRows = valuesText.split(/\),\s*\(/).map(row => {
    // Remover parênteses iniciais/finais
    return row.replace(/^\(/, '').replace(/\)$/, '').trim()
  })
  
  for (const rowText of valueRows) {
    if (!rowText || rowText === '') continue
    
    // Parsear valores (considerando strings com aspas simples)
    const values = []
    let current = ''
    let inString = false
    let escapeNext = false
    
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i]
      
      if (escapeNext) {
        current += char
        escapeNext = false
        continue
      }
      
      if (char === '\\') {
        escapeNext = true
        current += char
        continue
      }
      
      if (char === "'" && !escapeNext) {
        inString = !inString
        current += char
        continue
      }
      
      if (char === ',' && !inString) {
        values.push(parseValue(current.trim()))
        current = ''
        continue
      }
      
      current += char
    }
    
    if (current.trim()) {
      values.push(parseValue(current.trim()))
    }
    
    if (values.length === columns.length) {
      const row = {}
      columns.forEach((col, idx) => {
        row[col] = values[idx]
      })
      rows.push(row)
    }
  }
  
  return { table, columns, rows }
}

function parseValue(value) {
  value = value.trim()
  
  // String com aspas simples
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'")
  }
  
  // NULL
  if (value.toUpperCase() === 'NULL') {
    return null
  }
  
  // Número
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value)
  }
  
  // Boolean
  if (value.toUpperCase() === 'TRUE') return true
  if (value.toUpperCase() === 'FALSE') return false
  
  return value
}

async function applyBatch(filename) {
  console.log(`\n📥 Aplicando ${filename}...`)
  
  try {
    if (!fs.existsSync(filename)) {
      console.log(`   ⚠️  Arquivo não encontrado: ${filename}`)
      return { success: false, error: 'Arquivo não encontrado' }
    }
    
    const { table, columns, rows } = parseSQLFile(filename)
    console.log(`   📊 Tabela: ${table}, Colunas: ${columns.length}, Registros: ${rows.length}`)
    
    // Aplicar em lotes de 100
    const batchSize = 100
    let inserted = 0
    let updated = 0
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      
      // Usar upsert para lidar com ON CONFLICT
      const { data, error } = await supabase
        .from(table)
        .upsert(batch, { 
          onConflict: 'company_cnpj,date,account,natureza',
          ignoreDuplicates: false 
        })
      
      if (error) {
        console.error(`   ❌ Erro no lote ${i}:`, error.message)
        return { success: false, error: error.message }
      }
      
      inserted += batch.length
      process.stdout.write(`\r   ⏳ Processando: ${inserted}/${rows.length} registros`)
    }
    
    console.log(`\n   ✅ ${filename} aplicado com sucesso! (${inserted} registros)`)
    return { success: true, inserted }
  } catch (error) {
    console.error(`   ❌ Erro ao processar ${filename}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Aplicando batches SQL via Supabase Client\n')
  console.log('='.repeat(60))
  
  const batches = [
    // Batches DRE
    ...Array.from({ length: 14 }, (_, i) => ({
      filename: `import_dre_batch_${i + 1}.sql`,
      type: 'DRE',
      number: i + 1
    })),
    // Batches DFC
    ...Array.from({ length: 14 }, (_, i) => ({
      filename: `import_dfc_batch_${i + 1}.sql`,
      type: 'DFC',
      number: i + 1
    })),
  ]
  
  console.log(`📋 Total de batches: ${batches.length}`)
  console.log(`   📊 DRE: 14 batches`)
  console.log(`   💰 DFC: 14 batches\n`)
  
  const results = []
  let currentType = null
  
  for (const batch of batches) {
    // Mostrar separador quando mudar de tipo
    if (currentType !== batch.type) {
      if (currentType !== null) {
        console.log('\n' + '-'.repeat(60))
      }
      console.log(`\n📊 Processando batches ${batch.type}...`)
      currentType = batch.type
    }
    
    const result = await applyBatch(batch.filename)
    results.push({ ...batch, ...result })
    
    // Pequeno delay entre batches
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Resumo final
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalInserted = results
    .filter(r => r.success && r.inserted)
    .reduce((sum, r) => sum + r.inserted, 0)
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Processamento concluído!`)
  console.log(`   📊 Total: ${batches.length} batches`)
  console.log(`   ✅ Sucesso: ${successful}`)
  console.log(`   ❌ Falhas: ${failed}`)
  console.log(`   📝 Registros inseridos: ${totalInserted}`)
  
  if (failed > 0) {
    console.log(`\n⚠️  Batches com falha:`)
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.filename}: ${r.error}`)
      })
  }
  
  console.log('\n')
}

main().catch(error => {
  console.error('\n❌ Erro fatal:', error)
  process.exit(1)
})

