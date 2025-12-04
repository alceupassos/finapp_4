import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

/**
 * Teste de login F360
 */
async function testLogin() {
  console.log('🧪 Teste de Login F360\n')
  console.log('='.repeat(60))

  try {
    console.log('1. Fazendo login...')
    const response = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FinApp/1.0',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ token: VOLPE_TOKEN }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Login failed: ${response.status} - ${text}`)
    }

    const data = await response.json()
    const jwt = data.Token

    if (!jwt) {
      throw new Error('Token JWT não retornado')
    }

    console.log('✅ Login realizado com sucesso')
    console.log(`   JWT: ${jwt.substring(0, 50)}...`)
    console.log(`   Tamanho: ${jwt.length} caracteres`)

    // Validar formato JWT
    const parts = jwt.split('.')
    if (parts.length !== 3) {
      throw new Error('JWT não está no formato correto')
    }

    console.log('✅ JWT está no formato correto (3 partes)')

    return { success: true, jwt }
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    return { success: false, error: error.message }
  }
}

testLogin().then(result => {
  if (result.success) {
    console.log('\n✅ TESTE DE LOGIN PASSOU')
    process.exit(0)
  } else {
    console.log('\n❌ TESTE DE LOGIN FALHOU')
    process.exit(1)
  }
})

