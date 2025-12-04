import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Tentar conectar com retry
async function getSupabaseClient() {
  const maxRetries = 5
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      // Testar conexão
      const { error } = await client.from('companies').select('id').limit(1)
      if (!error) return client
      
      if (i < maxRetries - 1) {
        console.log(`   Tentativa ${i + 1}/${maxRetries} - aguardando...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  throw new Error('Não foi possível conectar ao Supabase após todas as tentativas')
}

async function main() {
  try {
    console.log('🚀 Inserção Final - Dados Grupo Volpe\n')
    console.log('='.repeat(60))

    // Conectar ao Supabase
    console.log('\n1. Conectando ao Supabase...')
    const supabase = await getSupabaseClient()
    console.log('✅ Conectado com sucesso')

    // Carregar dados
    console.log('\n2. Carregando dados do JSON...')
    const data = JSON.parse(fs.readFileSync('volpe_import_data_with_ids.json', 'utf-8'))
    console.log(`✅ Dados carregados:`)
    console.log(`   Plano de contas: ${data.chartOfAccounts.length}`)
    console.log(`   DRE entries: ${data.dreEntries.length}`)
    console.log(`   DFC entries: ${data.dfcEntries.length}`)
    console.log(`   Accounting entries: ${data.accountingEntries.length}`)

    // Inserir plano de contas
    console.log('\n3. Inserindo plano de contas...')
    const BATCH_SIZE = 50
    let chartInserted = 0
    
    for (let i = 0; i < data.chartOfAccounts.length; i += BATCH_SIZE) {
      const batch = data.chartOfAccounts.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('chart_of_accounts')
        .upsert(batch, { onConflict: 'company_id,code' })
      
      if (error) {
        console.error(`   ⚠️  Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        chartInserted += batch.length
        if ((i / BATCH_SIZE + 1) % 5 === 0) {
          console.log(`   ✅ ${chartInserted}/${data.chartOfAccounts.length} contas inseridas...`)
        }
      }
    }
    console.log(`✅ ${chartInserted} contas do plano de contas inseridas`)

    // Inserir DRE entries
    console.log('\n4. Inserindo DRE entries...')
    let dreInserted = 0
    
    // Remover duplicatas baseado na chave única
    const dreUnique = new Map()
    for (const entry of data.dreEntries) {
      const key = `${entry.company_cnpj}|${entry.date}|${entry.account}|${entry.natureza}`
      if (!dreUnique.has(key) || dreUnique.get(key).valor < entry.valor) {
        dreUnique.set(key, entry)
      }
    }
    
    const dreEntriesUnique = Array.from(dreUnique.values())
    console.log(`   Removidas ${data.dreEntries.length - dreEntriesUnique.length} duplicatas`)
    
    for (let i = 0; i < dreEntriesUnique.length; i += BATCH_SIZE) {
      const batch = dreEntriesUnique.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('dre_entries')
        .upsert(batch, { onConflict: 'company_cnpj,date,account,natureza' })
      
      if (error) {
        console.error(`   ⚠️  Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        dreInserted += batch.length
        if ((i / BATCH_SIZE + 1) % 10 === 0) {
          console.log(`   ✅ ${dreInserted}/${dreEntriesUnique.length} DRE entries inseridas...`)
        }
      }
      
      // Delay para evitar rate limiting
      if (i + BATCH_SIZE < dreEntriesUnique.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    console.log(`✅ ${dreInserted} DRE entries inseridas`)

    // Inserir DFC entries
    console.log('\n5. Inserindo DFC entries...')
    let dfcInserted = 0
    
    // Remover duplicatas
    const dfcUnique = new Map()
    for (const entry of data.dfcEntries) {
      const key = `${entry.company_cnpj}|${entry.date}|${entry.kind}|${entry.category}|${entry.bank_account || ''}`
      if (!dfcUnique.has(key) || dfcUnique.get(key).amount < entry.amount) {
        dfcUnique.set(key, entry)
      }
    }
    
    const dfcEntriesUnique = Array.from(dfcUnique.values())
    console.log(`   Removidas ${data.dfcEntries.length - dfcEntriesUnique.length} duplicatas`)
    
    for (let i = 0; i < dfcEntriesUnique.length; i += BATCH_SIZE) {
      const batch = dfcEntriesUnique.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('dfc_entries')
        .upsert(batch, { onConflict: 'company_cnpj,date,kind,category,bank_account' })
      
      if (error) {
        console.error(`   ⚠️  Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        dfcInserted += batch.length
        if ((i / BATCH_SIZE + 1) % 10 === 0) {
          console.log(`   ✅ ${dfcInserted}/${dfcEntriesUnique.length} DFC entries inseridas...`)
        }
      }
      
      if (i + BATCH_SIZE < dfcEntriesUnique.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    console.log(`✅ ${dfcInserted} DFC entries inseridas`)

    // Inserir Accounting entries (sem constraint unique, pode ter duplicatas)
    console.log('\n6. Inserindo Accounting entries...')
    let accountingInserted = 0
    
    for (let i = 0; i < data.accountingEntries.length; i += BATCH_SIZE) {
      const batch = data.accountingEntries.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('accounting_entries')
        .insert(batch)
      
      if (error) {
        console.error(`   ⚠️  Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        accountingInserted += batch.length
        if ((i / BATCH_SIZE + 1) % 10 === 0) {
          console.log(`   ✅ ${accountingInserted}/${data.accountingEntries.length} Accounting entries inseridas...`)
        }
      }
      
      if (i + BATCH_SIZE < data.accountingEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    console.log(`✅ ${accountingInserted} Accounting entries inseridas`)

    // Registrar logs
    console.log('\n7. Registrando logs de importação...')
    const companyIds = Array.from(new Set([
      ...data.dreEntries.map(e => e.company_id),
      ...data.dfcEntries.map(e => e.company_id),
    ]))
    
    for (const companyId of companyIds) {
      await supabase.from('import_logs').insert({
        company_id: companyId,
        import_type: 'MANUAL',
        status: 'SUCESSO',
        records_processed: data.dreEntries.length + data.dfcEntries.length + data.accountingEntries.length,
        records_imported: dreInserted + dfcInserted + accountingInserted,
        finished_at: new Date().toISOString(),
      })
    }
    console.log('✅ Logs registrados')

    // Resumo final
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!')
    console.log(`   Plano de contas: ${chartInserted} contas`)
    console.log(`   DRE entries: ${dreInserted}`)
    console.log(`   DFC entries: ${dfcInserted}`)
    console.log(`   Accounting entries: ${accountingInserted}`)
    console.log(`   Total: ${chartInserted + dreInserted + dfcInserted + accountingInserted} registros`)

  } catch (error) {
    console.error('\n❌ Erro durante a importação:', error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()

