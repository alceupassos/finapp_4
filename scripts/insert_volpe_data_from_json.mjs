import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Mapeamento de CNPJ para company_id (obtido via MCP)
const CNPJ_TO_COMPANY_ID = {
  '26888098000159': '39df3cf4-561f-4a3a-a8a2-fabf567f1cb9',
  '26888098000230': '1ba01bc7-d41c-4e9d-960f-1c4ed0be8852',
  '26888098000310': '84682a2d-4f20-4923-aa49-c1c500785445',
  '26888098000400': 'bc320d3e-7b2c-4409-81bf-638b7b76457f',
  '26888098000582': '6d93cc17-6db2-4bef-be52-654e45d0cef3',
  '26888098000663': 'b65f3484-83e2-4700-b9d4-b62ef310fff5',
  '26888098000744': 'f5869bed-abb8-4155-b22f-0ae1f706876b',
  '26888098000825': 'd6142649-0588-4c08-be02-77c4a415130e',
  '26888098000906': '52f14a6a-7a19-4ef8-84fb-131c47215116',
  '26888098001040': 'f042d596-12a1-4478-b4e7-01649fc78b73',
  '26888098001120': 'cbff3a6f-b772-4f35-a6d3-fe452341c0e4',
  '26888098001201': '67cb20db-3750-41c3-975a-fc39d7a8a055',
  '26888098001392': 'd1612628-5b69-4ce0-a1e8-a984f615b6fe',
}

/**
 * Inserir dados via SQL direto (usando MCP)
 * 
 * Nota: Este script gera SQL que deve ser executado via MCP Supabase
 */
async function main() {
  try {
    console.log('📊 Gerando SQL para inserção de dados do Grupo Volpe\n')
    console.log('='.repeat(60))

    // Ler dados do JSON
    const data = JSON.parse(fs.readFileSync('volpe_import_data.json', 'utf-8'))

    console.log(`\n📋 Dados carregados:`)
    console.log(`   Plano de contas: ${data.planos.length} contas`)
    console.log(`   DRE entries: ${data.dreEntries.length}`)
    console.log(`   DFC entries: ${data.dfcEntries.length}`)
    console.log(`   Accounting entries: ${data.accountingEntries.length}`)

    // Preparar DRE entries com company_id
    console.log('\n1. Preparando DRE entries...')
    const dreEntriesWithCompanyId = data.dreEntries.map(entry => {
      const companyId = CNPJ_TO_COMPANY_ID[entry.company_cnpj]
      if (!companyId) {
        console.warn(`⚠️  Company ID não encontrado para CNPJ: ${entry.company_cnpj}`)
        return null
      }
      return {
        ...entry,
        company_id: companyId,
      }
    }).filter(Boolean)

    console.log(`✅ ${dreEntriesWithCompanyId.length} DRE entries preparadas`)

    // Preparar DFC entries com company_id
    console.log('\n2. Preparando DFC entries...')
    const dfcEntriesWithCompanyId = data.dfcEntries.map(entry => {
      const companyId = CNPJ_TO_COMPANY_ID[entry.company_cnpj]
      if (!companyId) {
        console.warn(`⚠️  Company ID não encontrado para CNPJ: ${entry.company_cnpj}`)
        return null
      }
      return {
        ...entry,
        company_id: companyId,
      }
    }).filter(Boolean)

    console.log(`✅ ${dfcEntriesWithCompanyId.length} DFC entries preparadas`)

    // Preparar Accounting entries com company_id
    console.log('\n3. Preparando Accounting entries...')
    const accountingEntriesWithCompanyId = data.accountingEntries.map(entry => {
      const companyId = CNPJ_TO_COMPANY_ID[entry.company_cnpj]
      if (!companyId) {
        console.warn(`⚠️  Company ID não encontrado para CNPJ: ${entry.company_cnpj}`)
        return null
      }
      return {
        ...entry,
        company_id: companyId,
      }
    }).filter(Boolean)

    console.log(`✅ ${accountingEntriesWithCompanyId.length} Accounting entries preparadas`)

    // Preparar plano de contas (usar primeira empresa)
    console.log('\n4. Preparando plano de contas...')
    const firstCompanyId = Object.values(CNPJ_TO_COMPANY_ID)[0]
    const chartOfAccountsEntries = data.planos.map(plano => ({
      company_id: firstCompanyId,
      code: plano.PlanoDeContasId || '',
      name: plano.Nome || '',
      type: plano.Tipo === 'A receber' ? 'RECEITA' : 'DESPESA',
      parent_code: null,
      level: 1,
      accepts_entries: true,
    }))

    console.log(`✅ ${chartOfAccountsEntries.length} contas preparadas`)

    // Salvar em arquivo SQL para execução via MCP
    const sqlFile = 'volpe_import_insert.sql'
    let sql = `-- Importação Grupo Volpe - Dados F360
-- Gerado em: ${new Date().toISOString()}
-- Total: ${dreEntriesWithCompanyId.length} DRE + ${dfcEntriesWithCompanyId.length} DFC + ${accountingEntriesWithCompanyId.length} Accounting

BEGIN;

-- Inserir plano de contas
INSERT INTO chart_of_accounts (company_id, code, name, type, parent_code, level, accepts_entries)
VALUES
${chartOfAccountsEntries.map(c => `  ('${c.company_id}', '${c.code.replace(/'/g, "''")}', '${c.name.replace(/'/g, "''")}', '${c.type}', ${c.parent_code ? `'${c.parent_code}'` : 'NULL'}, ${c.level}, ${c.accepts_entries})`).join(',\n')}
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type;

-- Inserir DRE entries (em batches de 500)
`

    // Dividir em batches para evitar SQL muito grande
    const BATCH_SIZE = 500
    for (let i = 0; i < dreEntriesWithCompanyId.length; i += BATCH_SIZE) {
      const batch = dreEntriesWithCompanyId.slice(i, i + BATCH_SIZE)
      sql += `\n-- DRE batch ${Math.floor(i / BATCH_SIZE) + 1}\n`
      sql += `INSERT INTO dre_entries (company_id, company_cnpj, date, account, account_code, natureza, valor, description, source_erp, source_id)\nVALUES\n`
      sql += batch.map(e => `  ('${e.company_id}', '${e.company_cnpj}', '${e.date}', '${String(e.account).replace(/'/g, "''")}', ${e.account_code ? `'${e.account_code}'` : 'NULL'}, '${e.natureza}', ${e.valor}, ${e.description ? `'${String(e.description).replace(/'/g, "''")}'` : 'NULL'}, '${e.source_erp}', ${e.source_id ? `'${e.source_id}'` : 'NULL'})`).join(',\n')
      sql += `\nON CONFLICT (company_cnpj, date, account, natureza) DO UPDATE SET\n  valor = EXCLUDED.valor,\n  description = EXCLUDED.description;\n\n`
    }

    // DFC entries
    for (let i = 0; i < dfcEntriesWithCompanyId.length; i += BATCH_SIZE) {
      const batch = dfcEntriesWithCompanyId.slice(i, i + BATCH_SIZE)
      sql += `\n-- DFC batch ${Math.floor(i / BATCH_SIZE) + 1}\n`
      sql += `INSERT INTO dfc_entries (company_id, company_cnpj, date, kind, category, amount, bank_account, description, source_erp, source_id)\nVALUES\n`
      sql += batch.map(e => `  ('${e.company_id}', '${e.company_cnpj}', '${e.date}', '${e.kind}', '${String(e.category).replace(/'/g, "''")}', ${e.amount}, ${e.bank_account ? `'${e.bank_account}'` : 'NULL'}, ${e.description ? `'${String(e.description).replace(/'/g, "''")}'` : 'NULL'}, '${e.source_erp}', ${e.source_id ? `'${e.source_id}'` : 'NULL'})`).join(',\n')
      sql += `\nON CONFLICT (company_cnpj, date, kind, category, bank_account) DO UPDATE SET\n  amount = EXCLUDED.amount,\n  description = EXCLUDED.description;\n\n`
    }

    // Accounting entries (sem ON CONFLICT, pode ter duplicatas)
    for (let i = 0; i < accountingEntriesWithCompanyId.length; i += BATCH_SIZE) {
      const batch = accountingEntriesWithCompanyId.slice(i, i + BATCH_SIZE)
      sql += `\n-- Accounting batch ${Math.floor(i / BATCH_SIZE) + 1}\n`
      sql += `INSERT INTO accounting_entries (company_id, entry_date, competence_date, description, account_code, debit_amount, credit_amount, cost_center, source_erp, source_id)\nVALUES\n`
      sql += batch.map(e => `  ('${e.company_id}', '${e.entry_date}', '${e.competence_date}', ${e.description ? `'${String(e.description).replace(/'/g, "''")}'` : 'NULL'}, '${String(e.account_code).replace(/'/g, "''")}', ${e.debit_amount}, ${e.credit_amount}, ${e.cost_center ? `'${e.cost_center}'` : 'NULL'}, '${e.source_erp}', ${e.source_id ? `'${e.source_id}'` : 'NULL'})`).join(',\n')
      sql += ';\n\n'
    }

    sql += 'COMMIT;\n'

    fs.writeFileSync(sqlFile, sql)
    console.log(`\n✅ SQL gerado em: ${sqlFile}`)
    console.log(`   Execute este arquivo via MCP Supabase ou SQL Editor`)

    // Também salvar JSON com company_ids para uso direto
    const jsonWithIds = {
      chartOfAccounts: chartOfAccountsEntries,
      dreEntries: dreEntriesWithCompanyId,
      dfcEntries: dfcEntriesWithCompanyId,
      accountingEntries: accountingEntriesWithCompanyId,
    }

    fs.writeFileSync('volpe_import_data_with_ids.json', JSON.stringify(jsonWithIds, null, 2))
    console.log(`✅ JSON com company_ids salvo em: volpe_import_data_with_ids.json`)

    console.log('\n' + '='.repeat(60))
    console.log('\n✅ PREPARAÇÃO CONCLUÍDA!')
    console.log(`   Execute o SQL ou use o JSON para inserir via Supabase MCP`)

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()

