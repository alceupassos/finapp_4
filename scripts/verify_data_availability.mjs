import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VOLPE_COMPANIES = [
  { cnpj: '26888098000159', nome: 'VOLPE MATRIZ (LOJA 01)' },
  { cnpj: '26888098000230', nome: 'VOLPE ZOIAO (LOJA 02 - SÃO MATEUS)' },
  { cnpj: '26888098000310', nome: 'VOLPE MAUÁ (LOJA 03)' },
  { cnpj: '26888098000400', nome: 'VOLPE DIADEMA (LOJA 04)' },
  { cnpj: '26888098000582', nome: 'VOLPE GRAJAÚ (LOJA 05)' },
  { cnpj: '26888098000663', nome: 'VOLPE SANTO ANDRÉ (LOJA 06)' },
  { cnpj: '26888098000744', nome: 'VOLPE CAMPO LIMPO (LOJA 07)' },
  { cnpj: '26888098000825', nome: 'VOLPE BRASILÂNDIA (LOJA 08)' },
  { cnpj: '26888098000906', nome: 'VOLPE POÁ (LOJA 09)' },
  { cnpj: '26888098001040', nome: 'VOLPE ITAIM (LOJA 10 - JARDIM BARTIRA)' },
  { cnpj: '26888098001120', nome: 'VOLPE PRAIA GRANDE (LOJA 11)' },
  { cnpj: '26888098001201', nome: 'VOLPE ITANHAÉM (LOJA 12)' },
  { cnpj: '26888098001392', nome: 'VOLPE SÃO MATHEUS (LOJA 13)' },
]

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

async function checkDataAvailability(cnpj, nome) {
  const normalizedCnpj = normalizeCnpj(cnpj)

  // Verificar DRE
  const { count: dreCount } = await supabase
    .from('dre_entries')
    .select('*', { count: 'exact', head: true })
    .eq('company_cnpj', normalizedCnpj)

  // Verificar DFC
  const { count: dfcCount } = await supabase
    .from('dfc_entries')
    .select('*', { count: 'exact', head: true })
    .eq('company_cnpj', normalizedCnpj)

  // Verificar Contas Bancárias
  const { count: bankCount } = await supabase
    .from('bank_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('company_cnpj', normalizedCnpj)

  // Verificar Plano de Contas
  const { count: planoCount } = await supabase
    .from('chart_of_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('company_cnpj', normalizedCnpj)

  // Verificar Transações Bancárias
  const { count: transCount } = await supabase
    .from('bank_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('company_cnpj', normalizedCnpj)

  return {
    cnpj: normalizedCnpj,
    nome,
    dre: dreCount || 0,
    dfc: dfcCount || 0,
    banks: bankCount || 0,
    plano: planoCount || 0,
    transactions: transCount || 0,
    hasData: (dreCount || 0) > 0 || (dfcCount || 0) > 0 || (bankCount || 0) > 0,
  }
}

async function main() {
  console.log('🔍 Verificando disponibilidade de dados do Grupo Volpe\n')

  const results = []
  let totalWithData = 0
  let totalWithoutData = 0

  for (const company of VOLPE_COMPANIES) {
    const result = await checkDataAvailability(company.cnpj, company.nome)
    results.push(result)

    if (result.hasData) {
      totalWithData++
      console.log(`✅ ${result.nome}:`)
      console.log(`   DRE: ${result.dre} | DFC: ${result.dfc} | Bancos: ${result.banks} | Plano: ${result.plano} | Transações: ${result.transactions}`)
    } else {
      totalWithoutData++
      console.log(`❌ ${result.nome}: SEM DADOS`)
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // Resumo
  console.log(`\n📊 Resumo:`)
  console.log(`  ✅ Empresas com dados: ${totalWithData}/13`)
  console.log(`  ❌ Empresas sem dados: ${totalWithoutData}/13`)

  if (totalWithoutData > 0) {
    console.log(`\n❌ Empresas sem dados:`)
    results
      .filter((r) => !r.hasData)
      .forEach((r) => {
        console.log(`   - ${r.nome} (CNPJ: ${r.cnpj})`)
      })
    console.log(`\n💡 Execute scripts/import_volpe_excel.mjs para importar dados`)
    process.exit(1)
  } else {
    console.log(`\n✨ Todas as empresas têm dados!`)
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})

