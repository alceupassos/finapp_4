import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Senha hardcoded
const TARGET_EMAIL = 'alceu@angra.io'
const NEW_PASSWORD = 'Angra1323!'

async function resetPassword() {
  console.log(`🔐 Resetando senha para: ${TARGET_EMAIL}`)
  
  // Buscar o usuário
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('❌ Erro ao listar usuários:', listError.message)
    process.exit(1)
  }
  
  const user = users.users.find(u => u.email === TARGET_EMAIL)
  
  if (!user) {
    console.error(`❌ Usuário ${TARGET_EMAIL} não encontrado`)
    process.exit(1)
  }
  
  console.log(`✅ Usuário encontrado: ${user.email} (ID: ${user.id})`)
  
  // Atualizar a senha do usuário
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      password: NEW_PASSWORD,
      email_confirm: true
    }
  )
  
  if (error) {
    console.error('❌ Erro ao resetar senha:', error.message)
    process.exit(1)
  }
  
  console.log(`\n✅ Senha resetada com sucesso!`)
  console.log(`📧 Email: ${TARGET_EMAIL}`)
  console.log(`🔐 Nova senha: ${NEW_PASSWORD}`)
  console.log(`\n💡 Agora você pode fazer login com essas credenciais.`)
}

resetPassword().catch((err) => {
  console.error('❌ Erro inesperado:', err)
  process.exit(1)
})
