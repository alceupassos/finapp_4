import { createClient } from '@supabase/supabase-js'

function readEnv() {
  const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CHECK_USER_EMAIL } = process.env
  if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente')
  }
  return { supabaseUrl: VITE_SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY, email: CHECK_USER_EMAIL }
}

async function main() {
  const { supabaseUrl, serviceRoleKey, email } = readEnv()
  if (!email) {
    throw new Error('Defina CHECK_USER_EMAIL com o e-mail do usuário a consultar')
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })

  console.log(`Consultando usuário ${email}...`)
  const { data, error } = await supabase.auth.admin.listUsers({ email })
  if (error) {
    throw error
  }
  if (!data.length) {
    console.log('Nenhum usuário encontrado para esse e-mail')
    return
  }
  const user = data[0]
  console.log('Usuário encontrado:')
  console.table({
    id: user.id,
    email: user.email,
    email_confirmed_at: user.email_confirmed_at,
    phone: user.phone,
    role: user.role,
    last_sign_in_at: user.identifiers?.last_sign_in_at || user.confirmed_at || 'não definido',
    disabled: user.disabled,
    created_at: user.created_at
  })
}

main().catch(error => {
  console.error('Erro ao consultar usuário:', error.message || error)
  process.exit(1)
})
