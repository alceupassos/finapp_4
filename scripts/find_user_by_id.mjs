import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TARGET_ID = 'a6a577f6-3109-4d68-a323-96bd99308b1a'

async function findUser() {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 0,
    perPage: 100,
  })
  
  if (error) {
    console.error('❌ Erro ao listar usuários:', error.message)
    process.exit(1)
  }
  
  const user = data.users.find(u => u.id === TARGET_ID)
  
  if (user) {
    console.log(`\n✅ Usuário encontrado:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Criado em: ${user.created_at}`)
    console.log(`   Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}\n`)
  } else {
    console.log(`\n❌ Usuário com ID ${TARGET_ID} não encontrado`)
    console.log(`\n📋 Usuários disponíveis:`)
    data.users.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email} (ID: ${u.id})`)
    })
  }
}

findUser().catch((err) => {
  console.error('❌ Erro inesperado:', err)
  process.exit(1)
})
