import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function validateImport() {
  console.log('📊 VALIDANDO IMPORTAÇÃO\n')
  console.log('='.repeat(60))
  
  // 1. Empresas
  console.log('\n1️⃣  EMPRESAS CADASTRADAS')
  const { data: companies, count: companyCount } = await supabase
    .from('companies')
    .select('cnpj, company_name, is_holding', { count: 'exact' })
    .order('cnpj')
  
  console.log(`   Total: ${companyCount || 0}`)
  if (companies) {
    companies.forEach(c => {
      const flag = c.is_holding ? '🏢' : '📍'
      console.log(`   ${flag} ${c.cnpj}: ${c.company_name}`)
    })
  }
  
  // 2. Plano de Contas
  console.log('\n2️⃣  PLANO DE CONTAS')
  const { count: chartCount } = await supabase
    .from('chart_of_accounts')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   Total de contas: ${chartCount || 0}`)
  
  const { data: chartSample } = await supabase
    .from('chart_of_accounts')
    .select('code, name, account_type')
    .order('code')
    .limit(10)
  
  if (chartSample) {
    console.log('   Primeiras 10 contas:')
    chartSample.forEach(c => {
      console.log(`     ${c.code}: ${c.name} (${c.account_type})`)
    })
  }
  
  // 3. Fluxo de Caixa
  console.log('\n3️⃣  FLUXO DE CAIXA (cashflow_entries)')
  const { data: dfcStats } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT company_cnpj, COUNT(*) as total
        FROM cashflow_entries
        GROUP BY company_cnpj
        ORDER BY company_cnpj
      `
    })
    .select('*')
  
  const { count: dfcTotal } = await supabase
    .from('cashflow_entries')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   Total geral: ${dfcTotal || 0}`)
  
  const { data: dfcByCnpj } = await supabase
    .from('cashflow_entries')
    .select('company_cnpj')
  
  if (dfcByCnpj) {
    const stats = dfcByCnpj.reduce((acc, row) => {
      acc[row.company_cnpj] = (acc[row.company_cnpj] || 0) + 1
      return acc
    }, {})
    
    console.log('   Por empresa:')
    Object.entries(stats).sort().forEach(([cnpj, count]) => {
      console.log(`     ${cnpj}: ${count.toLocaleString('pt-BR')} registros`)
    })
  }
  
  // 4. DRE
  console.log('\n4️⃣  DRE (dre_entries)')
  const { count: dreTotal } = await supabase
    .from('dre_entries')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   Total geral: ${dreTotal || 0}`)
  
  const { data: dreByCnpj } = await supabase
    .from('dre_entries')
    .select('company_cnpj')
  
  if (dreByCnpj) {
    const stats = dreByCnpj.reduce((acc, row) => {
      acc[row.company_cnpj] = (acc[row.company_cnpj] || 0) + 1
      return acc
    }, {})
    
    console.log('   Por empresa:')
    Object.entries(stats).sort().forEach(([cnpj, count]) => {
      console.log(`     ${cnpj}: ${count.toLocaleString('pt-BR')} registros`)
    })
  }
  
  // 5. Período de dados
  console.log('\n5️⃣  PERÍODO DOS DADOS')
  
  const { data: dfcDates } = await supabase
    .from('cashflow_entries')
    .select('date')
    .order('date', { ascending: true })
    .limit(1)
  
  const { data: dfcDatesEnd } = await supabase
    .from('cashflow_entries')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
  
  if (dfcDates && dfcDatesEnd) {
    console.log(`   DFC: ${dfcDates[0]?.date} até ${dfcDatesEnd[0]?.date}`)
  }
  
  const { data: dreDates } = await supabase
    .from('dre_entries')
    .select('date')
    .order('date', { ascending: true })
    .limit(1)
  
  const { data: dreDatesEnd } = await supabase
    .from('dre_entries')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
  
  if (dreDates && dreDatesEnd) {
    console.log(`   DRE: ${dreDates[0]?.date} até ${dreDatesEnd[0]?.date}`)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ VALIDAÇÃO CONCLUÍDA\n')
}

validateImport().catch(console.error)
