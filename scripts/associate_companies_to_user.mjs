import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const USER_EMAIL = 'dev@angrax.com.br'
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

async function getUserIdByEmail(email) {
  // Buscar usuário na tabela auth.users via Admin API
  const { data, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('❌ Erro ao buscar usuários:', error)
    return null
  }
  
  const user = data.users.find(u => u.email === email)
  if (user) {
    console.log(`✅ Usuário encontrado: ${user.email} (ID: ${user.id})`)
    return user.id
  }
  
  console.log(`⚠️ Usuário ${email} não encontrado`)
  return null
}

async function associateCompaniesToUser(userId, cnpjs) {
  console.log(`\n📊 Associando ${cnpjs.length} empresas ao usuário...\n`)
  
  const records = cnpjs.map(cnpj => ({
    user_id: userId,
    company_cnpj: cnpj
  }))
  
  // Primeiro, remover associações existentes para este usuário
  const { error: deleteError } = await supabase
    .from('user_companies')
    .delete()
    .eq('user_id', userId)
  
  if (deleteError) {
    console.warn('⚠️ Aviso ao limpar associações antigas:', deleteError.message)
  } else {
    console.log('✅ Associações antigas removidas')
  }
  
  // Inserir novas associações usando upsert para evitar duplicatas
  const { data, error } = await supabase
    .from('user_companies')
    .upsert(records, { onConflict: 'user_id,company_cnpj' })
    .select()
  
  if (error) {
    console.error('❌ Erro ao associar empresas:', error)
    console.error('Detalhes:', JSON.stringify(error, null, 2))
    return false
  }
  
  if (!data || data.length === 0) {
    console.error('❌ Nenhum dado foi inserido. Verifique as políticas RLS.')
    return false
  }
  
  console.log(`\n✅ ${data.length} empresas associadas com sucesso:`)
  data.forEach((record, index) => {
    console.log(`   ${index + 1}. ${record.company_cnpj}`)
  })
  
  return true
}

async function main() {
  console.log('🔍 Buscando usuário:', USER_EMAIL)
  
  const userId = await getUserIdByEmail(USER_EMAIL)
  
  if (!userId) {
    console.error('\n❌ Usuário não encontrado. Por favor, crie o usuário primeiro no Supabase Auth.')
    console.log('\n💡 Para criar o usuário, você pode:')
    console.log('   1. Usar o dashboard do Supabase')
    console.log('   2. Ou fazer login uma vez com este email para criar automaticamente')
    process.exit(1)
  }
  
  const success = await associateCompaniesToUser(userId, COMPANIES_CNPJ)
  
  if (success) {
    console.log('\n✅ Processo concluído com sucesso!')
    console.log(`\n📝 O usuário ${USER_EMAIL} agora tem acesso às ${COMPANIES_CNPJ.length} empresas.`)
  } else {
    console.error('\n❌ Falha ao associar empresas')
    process.exit(1)
  }
}

main().catch(console.error)

