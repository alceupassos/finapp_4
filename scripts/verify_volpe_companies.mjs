import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GROUP_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'

// 13 empresas do Grupo Volpe
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

async function main() {
  console.log('🔍 Verificando empresas do Grupo Volpe no Supabase\n')

  // Verificar cliente "Grupo Volpe"
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, group_name')
    .eq('group_name', 'Grupo Volpe')
    .single()

  if (clientError || !client) {
    console.error('❌ Cliente "Grupo Volpe" não encontrado!')
    console.log('💡 Execute scripts/register_volpe_companies_sql.mjs primeiro')
    process.exit(1)
  }

  console.log(`✅ Cliente encontrado: ${client.group_name} (ID: ${client.id})\n`)

  const clientId = client.id
  const results = {
    found: [],
    missing: [],
    withoutToken: [],
    wrongClient: [],
  }

  // Verificar cada empresa
  for (const company of VOLPE_COMPANIES) {
    const normalizedCnpj = normalizeCnpj(company.cnpj)

    const { data: dbCompany, error } = await supabase
      .from('companies')
      .select('id, cnpj, razao_social, nome_fantasia, token_f360, client_id, active')
      .eq('cnpj', normalizedCnpj)
      .single()

    if (error || !dbCompany) {
      results.missing.push({ ...company, cnpj: normalizedCnpj })
      console.log(`❌ ${company.nome}: NÃO ENCONTRADA`)
      continue
    }

    // Verificar token
    if (!dbCompany.token_f360 || dbCompany.token_f360 !== GROUP_TOKEN) {
      results.withoutToken.push({ ...company, dbCompany })
      console.log(`⚠️  ${company.nome}: SEM TOKEN ou token incorreto`)
      continue
    }

    // Verificar cliente
    if (dbCompany.client_id !== clientId) {
      results.wrongClient.push({ ...company, dbCompany })
      console.log(`⚠️  ${company.nome}: Cliente incorreto (ID: ${dbCompany.client_id})`)
      continue
    }

    results.found.push({ ...company, dbCompany })
    console.log(`✅ ${company.nome}: OK`)
  }

  // Resumo
  console.log(`\n📊 Resumo:`)
  console.log(`  ✅ Empresas encontradas e corretas: ${results.found.length}/13`)
  console.log(`  ❌ Empresas faltantes: ${results.missing.length}`)
  console.log(`  ⚠️  Empresas sem token: ${results.withoutToken.length}`)
  console.log(`  ⚠️  Empresas com cliente incorreto: ${results.wrongClient.length}`)

  if (results.missing.length > 0) {
    console.log(`\n❌ Empresas faltantes:`)
    results.missing.forEach((c) => {
      console.log(`   - ${c.nome} (CNPJ: ${c.cnpj})`)
    })
  }

  if (results.withoutToken.length > 0) {
    console.log(`\n⚠️  Empresas sem token F360:`)
    results.withoutToken.forEach((c) => {
      console.log(`   - ${c.nome} (Token atual: ${c.dbCompany.token_f360 || 'NENHUM'})`)
    })
  }

  if (results.wrongClient.length > 0) {
    console.log(`\n⚠️  Empresas com cliente incorreto:`)
    results.wrongClient.forEach((c) => {
      console.log(`   - ${c.nome} (Cliente ID: ${c.dbCompany.client_id})`)
    })
  }

  // Retornar código de saída
  if (results.missing.length > 0 || results.withoutToken.length > 0 || results.wrongClient.length > 0) {
    console.log(`\n💡 Execute scripts/fix_volpe_companies.mjs para corrigir automaticamente`)
    process.exit(1)
  } else {
    console.log(`\n✨ Todas as empresas estão corretas!`)
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})

