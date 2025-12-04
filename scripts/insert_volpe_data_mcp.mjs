import fs from 'fs'

/**
 * Script para inserir dados do Grupo Volpe via MCP Supabase
 * 
 * Este script deve ser executado manualmente ou via MCP
 * Os dados estão em volpe_import_data_with_ids.json
 */

const data = JSON.parse(fs.readFileSync('volpe_import_data_with_ids.json', 'utf-8'))

console.log('📊 Dados para inserção:')
console.log(`   Plano de contas: ${data.chartOfAccounts.length}`)
console.log(`   DRE entries: ${data.dreEntries.length}`)
console.log(`   DFC entries: ${data.dfcEntries.length}`)
console.log(`   Accounting entries: ${data.accountingEntries.length}`)

console.log('\n⚠️  Use o MCP Supabase para executar as inserções:')
console.log('   1. Inserir plano de contas (202 contas)')
console.log('   2. Inserir DRE entries em batches de 500')
console.log('   3. Inserir DFC entries em batches de 500')
console.log('   4. Inserir Accounting entries em batches de 500')

console.log('\n📝 Exemplo de comando SQL para primeira batch de DRE:')
if (data.dreEntries.length > 0) {
  const firstBatch = data.dreEntries.slice(0, 5)
  console.log('\nINSERT INTO dre_entries (company_id, company_cnpj, date, account, account_code, natureza, valor, description, source_erp, source_id)')
  console.log('VALUES')
  firstBatch.forEach((e, i) => {
    const comma = i < firstBatch.length - 1 ? ',' : ';'
    console.log(`  ('${e.company_id}', '${e.company_cnpj}', '${e.date}', $${i + 1}, ${e.account_code ? `'${e.account_code}'` : 'NULL'}, '${e.natureza}', ${e.valor}, $${i + 2}, '${e.source_erp}', ${e.source_id ? `'${e.source_id}'` : 'NULL'})${comma}`)
  })
}

console.log('\n✅ Arquivo volpe_import_data_with_ids.json está pronto para uso')
console.log('   Execute as inserções via MCP Supabase ou SQL Editor')

