/**
 * Script para executar SQL em batches via MCP Supabase
 */

import fs from 'fs'

const SQL_FILE = 'f360_import_october_dre_only.sql'
const BATCH_SIZE = 100 // Número de linhas VALUES por batch

async function executeBatch(sqlBatch) {
  // Usar MCP Supabase para executar
  console.log(`Executando batch de ${sqlBatch.split('VALUES').length - 1} registros...`)
  // Por enquanto, apenas logar
  return true
}

async function main() {
  const content = fs.readFileSync(SQL_FILE, 'utf-8')
  
  // Extrair INSERT statement
  const insertMatch = content.match(/INSERT INTO .+? VALUES\s+(.+?)(?:ON CONFLICT|$)/s)
  if (!insertMatch) {
    console.error('Não foi possível encontrar INSERT statement')
    return
  }
  
  const valuesPart = insertMatch[1]
  const values = valuesPart.split('),\n    (').map(v => {
    if (!v.includes('(')) return null
    const cleaned = v.replace(/^\(/, '').replace(/\)$/, '').trim()
    return cleaned ? `(${cleaned})` : null
  }).filter(Boolean)
  
  console.log(`Total de valores: ${values.length}`)
  console.log(`Primeiros 3 valores:`)
  values.slice(0, 3).forEach((v, i) => console.log(`  ${i + 1}: ${v.substring(0, 100)}...`))
  
  // Dividir em batches
  const batches = []
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE)
    const batchSQL = `INSERT INTO dre_entries (company_id, company_cnpj, date, account, account_code, natureza, valor, description, source_erp, source_id)
VALUES
    ${batch.join(',\n    ')}
ON CONFLICT (company_cnpj, date, account, natureza) DO UPDATE SET
    valor = EXCLUDED.valor,
    description = EXCLUDED.description,
    updated_at = NOW();`
    batches.push(batchSQL)
  }
  
  console.log(`\nTotal de batches: ${batches.length}`)
  console.log(`\nPrimeiro batch (primeiras 5 linhas):`)
  console.log(batches[0].split('\n').slice(0, 5).join('\n'))
  
  // Salvar batches
  fs.writeFileSync('f360_import_batches.json', JSON.stringify(batches.map((b, i) => ({
    batch: i + 1,
    sql: b,
    size: b.length
  })), null, 2))
  
  console.log(`\n✅ Batches salvos em f360_import_batches.json`)
  console.log(`💡 Execute cada batch via mcp_supabase_apply_migration`)
}

main().catch(console.error)

