/**
 * Teste de Duplicatas
 * 
 * Verifica ausência de registros duplicados nas tabelas principais
 */

import { mcp_supabase_execute_sql } from './supabase_helper.mjs'

async function testDuplicates(table, columns) {
  const columnList = columns.join(', ')
  const query = `
    SELECT ${columnList}, COUNT(*) as count
    FROM ${table}
    GROUP BY ${columnList}
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 100
  `
  
  const results = await mcp_supabase_execute_sql({ query })
  
  if (results.length === 0) {
    console.log(`  ✅ ${table}: Nenhuma duplicata encontrada`)
    return 0
  }
  
  console.log(`  ⚠️  ${table}: ${results.length} grupos com duplicatas`)
  
  let totalDuplicates = 0
  for (const row of results) {
    const count = parseInt(row.count)
    totalDuplicates += (count - 1) // -1 porque um registro é válido
    console.log(`    - ${columnList}: ${count} ocorrências`)
  }
  
  return totalDuplicates
}

async function main() {
  console.log('🔍 TESTE DE DUPLICATAS')
  console.log('='.repeat(60))
  
  const tests = [
    { table: 'dre_entries', columns: ['company_cnpj', 'date', 'account', 'natureza'] },
    { table: 'dfc_entries', columns: ['company_cnpj', 'date', 'kind', 'category', 'bank_account'] },
    { table: 'accounting_entries', columns: ['company_id', 'entry_date', 'account_code', 'debit_amount', 'credit_amount'] },
    { table: 'chart_of_accounts', columns: ['company_id', 'code'] },
    { table: 'bank_accounts', columns: ['company_id', 'f360_account_id'] },
  ]
  
  let totalDuplicates = 0
  
  for (const test of tests) {
    console.log(`\n📋 Testando ${test.table}...`)
    const duplicates = await testDuplicates(test.table, test.columns)
    totalDuplicates += duplicates
  }
  
  console.log(`\n${'='.repeat(60)}`)
  if (totalDuplicates === 0) {
    console.log('✅ Nenhuma duplicata encontrada em todas as tabelas')
  } else {
    console.log(`⚠️  Total de ${totalDuplicates} registros duplicados encontrados`)
  }
  console.log('='.repeat(60))
}

main().catch(console.error)

