import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TARGET_EMAIL = '13@angra.io'
const TARGET_PASSWORD = 'Angra1323!'
const COMPANIES_CNPJ = [
  '26888098000159',
  '26888098000230',
  '26888098000310',
  '26888098000400',
  '26888098000582',
  '26888098000663',
  '26888098000744',
  '26888098000825',
  '26888098000906',
  '26888098001040',
  '26888098001120',
  '26888098001201',
  '26888098001392'
]

async function ensureUser() {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 0,
    perPage: 50,
  })

  if (error) {
    console.error('❌ Erro ao listar usuários:', error.message)
    process.exit(1)
  }

  const existing = data.users.find((user) => user.email === TARGET_EMAIL)

  if (existing) {
    console.log(`✅ Usuário já existe: ${existing.email} (ID: ${existing.id})`)
    return existing
  }

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: TARGET_EMAIL,
    password: TARGET_PASSWORD,
    email_confirm: true,
  })

  if (createError) {
    console.error('❌ Falha ao criar usuário:', createError.message)
    process.exit(1)
  }

  const createdUser = createData?.user || createData
  console.log(`✅ Usuário criado: ${createdUser.email} (ID: ${createdUser.id})`)
  return createdUser
}

async function associateCompanies(userId) {
  console.log(`\n📊 Associando ${COMPANIES_CNPJ.length} companhias ao usuário ${TARGET_EMAIL}\n`)

  await supabase
    .from('user_companies')
    .delete()
    .eq('user_id', userId)

  const records = COMPANIES_CNPJ.map((cnpj) => ({
    user_id: userId,
    company_cnpj: cnpj,
  }))

  const { error } = await supabase.from('user_companies').insert(records)

  if (error) {
    console.error('❌ Erro ao associar empresas:', error.message)
    process.exit(1)
  }

  console.log(`✅ ${COMPANIES_CNPJ.length} empresas vinculadas`)
}

async function main() {
  const user = await ensureUser()
  await associateCompanies(user.id)
  console.log('\n🎉 Login pronto: ', TARGET_EMAIL)
  console.log('🔐 Senha provisória:', TARGET_PASSWORD)
}

main().catch((err) => {
  console.error('❌ Erro inesperado:', err)
  process.exit(1)
})

