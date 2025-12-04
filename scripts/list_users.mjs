import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function listUsers() {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 0,
    perPage: 100,
  })
  
  if (error) {
    console.error('❌ Erro ao listar usuários:', error.message)
    process.exit(1)
  }
  
  console.log(`\n📋 Usuários encontrados (${data.users.length}):\n`)
  data.users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email} (ID: ${user.id})`)
    console.log(`   Criado em: ${user.created_at}`)
    console.log(`   Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}\n`)
  })
}

listUsers().catch((err) => {
  console.error('❌ Erro inesperado:', err)
  process.exit(1)
})
