import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'

// 13 empresas do Grupo Volpe
const VOLPE_CNPJS = [
  '26888098000159', // VOLPE MATRIZ
  '26888098000230', // VOLPE ZOIAO
  '26888098000310', // VOLPE MAUÁ
  '26888098000400', // VOLPE DIADEMA
  '26888098000582', // VOLPE GRAJAÚ
  '26888098000663', // VOLPE SANTO ANDRÉ
  '26888098000744', // VOLPE CAMPO LIMPO
  '26888098000825', // VOLPE BRASILÂNDIA
  '26888098000906', // VOLPE POÁ
  '26888098001040', // VOLPE ITAIM
  '26888098001120', // VOLPE PRAIA GRANDE
  '26888098001201', // VOLPE ITANHAÉM
  '26888098001392', // VOLPE SÃO MATHEUS
]

/**
 * Login F360 e obter JWT
 */
async function loginF360() {
  try {
    const response = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: VOLPE_TOKEN }),
    })

    if (!response.ok) {
      throw new Error(`F360 Login failed: ${response.status}`)
    }

    const data = await response.json()
    return data.Token || null
  } catch (error) {
    console.error('❌ Erro no login F360:', error)
    return null
  }
}

/**
 * Requisição genérica F360
 */
async function f360Request(jwt, endpoint, params = {}) {
  const url = new URL(`${F360_BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value)
  })

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${jwt}` },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`F360 ${endpoint}: ${response.status} - ${text}`)
  }

  return response.json()
}

/**
 * Importar Plano de Contas para uma empresa
 */
async function importPlanoContas(jwt, cnpj) {
  try {
    const response = await f360Request(jwt, '/PlanoDeContasPublicAPI/ListarPlanosContas', { cnpj })
    const planos = response.Result || response.data || []

    if (planos.length === 0) {
      console.log(`  ⚠️  Nenhum plano de contas encontrado para CNPJ ${cnpj}`)
      return 0
    }

    // Buscar company_id
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', cnpj)
      .single()

    if (!company) {
      console.log(`  ⚠️  Empresa não encontrada no Supabase: ${cnpj}`)
      return 0
    }

    // Inserir/atualizar plano de contas
    const inserts = planos.map((plano) => ({
      company_id: company.id,
      code: plano.CodigoObrigacaoContabil || plano.Codigo || '',
      name: plano.Nome || plano.NomeConta || '',
      type: plano.Tipo === 'A receber' || plano.Tipo === 'Receita' ? 'RECEITA' : 
            plano.Tipo === 'A pagar' || plano.Tipo === 'Despesa' ? 'DESPESA' : 
            plano.Tipo || 'DESPESA',
      parent_code: plano.CodigoPai || plano.ParentCode || null,
      level: plano.Nivel || plano.Level || 1,
      accepts_entries: plano.AceitaLancamentos !== false,
    }))

    const { error } = await supabase
      .from('chart_of_accounts')
      .upsert(inserts, { onConflict: 'company_id,code' })

    if (error) {
      console.error(`  ❌ Erro ao inserir plano de contas:`, error.message)
      return 0
    }

    console.log(`  ✅ ${planos.length} contas importadas para ${cnpj}`)
    return planos.length
  } catch (error) {
    console.error(`  ❌ Erro ao importar plano de contas para ${cnpj}:`, error.message)
    return 0
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando importação de Plano de Contas - Grupo Volpe\n')

  const jwt = await loginF360()
  if (!jwt) {
    console.error('❌ Falha na autenticação F360')
    process.exit(1)
  }

  let totalContas = 0

  for (const cnpj of VOLPE_CNPJS) {
    console.log(`\n📊 Processando CNPJ: ${cnpj}`)
    const count = await importPlanoContas(jwt, cnpj)
    totalContas += count

    // Delay entre empresas
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  console.log(`\n📊 Resumo Final:`)
  console.log(`✅ Total de contas importadas: ${totalContas}`)
  console.log(`\n✨ Importação concluída!`)
}

main().catch((err) => {
  console.error('❌ Erro inesperado:', err)
  process.exit(1)
})

