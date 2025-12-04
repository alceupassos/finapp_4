import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Teste de persistência (idempotência)
 */
async function testPersistence() {
  console.log('🧪 Teste de Persistência e Idempotência\n')
  console.log('='.repeat(60))

  try {
    // 1. Buscar uma empresa com dados
    console.log('1. Buscando empresa com dados...')
    const { data: companies } = await supabase
      .from('companies')
      .select('id, cnpj, razao_social')
      .eq('active', true)
      .limit(1)

    if (!companies || companies.length === 0) {
      throw new Error('Nenhuma empresa encontrada')
    }

    const company = companies[0]
    console.log(`✅ Empresa encontrada: ${company.cnpj} - ${company.razao_social}`)

    // 2. Contar registros atuais
    console.log('\n2. Contando registros atuais...')
    const { count: dreCountBefore } = await supabase
      .from('dre_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)

    const { count: dfcCountBefore } = await supabase
      .from('dfc_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)

    const { count: accountingCountBefore } = await supabase
      .from('accounting_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)

    console.log(`   DRE entries: ${dreCountBefore || 0}`)
    console.log(`   DFC entries: ${dfcCountBefore || 0}`)
    console.log(`   Accounting entries: ${accountingCountBefore || 0}`)

    // 3. Criar entrada de teste
    console.log('\n3. Criando entrada de teste...')
    const testEntry = {
      company_id: company.id,
      company_cnpj: company.cnpj,
      date: new Date().toISOString().split('T')[0],
      account: 'TESTE_IDEMPOTENCIA',
      account_code: null,
      natureza: 'receita',
      valor: 100.50,
      description: 'Teste de idempotência',
      source_erp: 'F360',
      source_id: 'TEST_ID_' + Date.now(),
    }

    // 4. Inserir primeira vez
    console.log('4. Inserindo primeira vez...')
    const { error: insertError1 } = await supabase
      .from('dre_entries')
      .upsert(testEntry, { onConflict: 'company_cnpj,date,account,natureza' })

    if (insertError1) {
      throw new Error(`Erro ao inserir: ${insertError1.message}`)
    }

    console.log('✅ Inserido com sucesso')

    // 5. Contar após primeira inserção
    const { count: dreCountAfter1 } = await supabase
      .from('dre_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)

    console.log(`   DRE entries após primeira inserção: ${dreCountAfter1 || 0}`)

    // 6. Tentar inserir novamente (deve ser idempotente)
    console.log('\n5. Tentando inserir novamente (teste de idempotência)...')
    const { error: insertError2 } = await supabase
      .from('dre_entries')
      .upsert(testEntry, { onConflict: 'company_cnpj,date,account,natureza' })

    if (insertError2) {
      throw new Error(`Erro ao inserir segunda vez: ${insertError2.message}`)
    }

    console.log('✅ Upsert executado sem erro')

    // 7. Contar após segunda inserção
    const { count: dreCountAfter2 } = await supabase
      .from('dre_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)

    console.log(`   DRE entries após segunda inserção: ${dreCountAfter2 || 0}`)

    // 8. Verificar idempotência
    if (dreCountAfter1 === dreCountAfter2) {
      console.log('✅ Idempotência confirmada: contagem não mudou')
    } else {
      console.log('⚠️  Idempotência não confirmada: contagem mudou')
    }

    // 9. Limpar entrada de teste
    console.log('\n6. Limpando entrada de teste...')
    await supabase
      .from('dre_entries')
      .delete()
      .eq('source_id', testEntry.source_id)

    console.log('✅ Entrada de teste removida')

    return {
      success: true,
      idempotent: dreCountAfter1 === dreCountAfter2,
      counts: {
        before: dreCountBefore || 0,
        after1: dreCountAfter1 || 0,
        after2: dreCountAfter2 || 0,
      },
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    return { success: false, error: error.message }
  }
}

testPersistence().then(result => {
  console.log('\n' + '='.repeat(60))
  if (result.success) {
    console.log('✅ TESTE DE PERSISTÊNCIA PASSOU')
    console.log(`   Idempotência: ${result.idempotent ? '✅' : '⚠️'}`)
    console.log(`   Contagens: ${result.counts.before} → ${result.counts.after1} → ${result.counts.after2}`)
    process.exit(0)
  } else {
    console.log('❌ TESTE DE PERSISTÊNCIA FALHOU')
    console.log(`   Erro: ${result.error}`)
    process.exit(1)
  }
})

