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
 * Importar Contas Bancárias para uma empresa
 */
async function importContasBancarias(jwt, cnpj) {
  try {
    // Buscar contas bancárias (pode retornar todas as contas do grupo)
    const response = await f360Request(jwt, '/ContaBancariaPublicAPI/ListarContasBancarias')
    const contas = response.Result || response.data || []

    if (contas.length === 0) {
      console.log(`  ⚠️  Nenhuma conta bancária encontrada`)
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

    // Filtrar contas que pertencem a este CNPJ (se a API retornar CNPJ nas contas)
    // Caso contrário, associar todas as contas à empresa
    const contasFiltradas = contas.filter((conta) => {
      const contaCnpj = conta.CNPJ || conta.cnpj
      if (contaCnpj) {
        // Normalizar CNPJ (remover formatação)
        const cnpjNormalizado = contaCnpj.replace(/\D/g, '')
        return cnpjNormalizado === cnpj
      }
      // Se não houver CNPJ na conta, associar à empresa atual
      return true
    })

    if (contasFiltradas.length === 0) {
      console.log(`  ⚠️  Nenhuma conta bancária encontrada para CNPJ ${cnpj}`)
      return 0
    }

    // Inserir/atualizar contas bancárias
    const inserts = contasFiltradas.map((conta) => ({
      company_id: company.id,
      company_cnpj: cnpj,
      f360_account_id: conta.Id || conta.id || String(conta.ContaBancariaId || conta.contaBancariaId || ''),
      nome: conta.Nome || conta.nome || '',
      tipo_conta: conta.TipoDeConta || conta.tipoDeConta || conta.Tipo || '',
      banco_numero: conta.NumeroBanco || conta.numeroBanco || conta.Banco || null,
      agencia: conta.Agencia || conta.agencia || '',
      conta: conta.Conta || conta.conta || '',
      digito_conta: conta.DigitoConta || conta.digitoConta || conta.Digito || '',
      saldo_atual: conta.SaldoAtual || conta.saldoAtual || conta.Saldo || 0,
      saldo_data: conta.SaldoData || conta.saldoData || conta.DataSaldo || null,
      active: conta.Ativo !== false && conta.ativo !== false,
    }))

    const { error } = await supabase
      .from('bank_accounts')
      .upsert(inserts, { onConflict: 'company_cnpj,f360_account_id' })

    if (error) {
      console.error(`  ❌ Erro ao inserir contas bancárias:`, error.message)
      return 0
    }

    console.log(`  ✅ ${contasFiltradas.length} contas bancárias importadas para ${cnpj}`)
    return contasFiltradas.length
  } catch (error) {
    console.error(`  ❌ Erro ao importar contas bancárias para ${cnpj}:`, error.message)
    return 0
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando importação de Contas Bancárias - Grupo Volpe\n')

  const jwt = await loginF360()
  if (!jwt) {
    console.error('❌ Falha na autenticação F360')
    process.exit(1)
  }

  let totalContas = 0

  for (const cnpj of VOLPE_CNPJS) {
    console.log(`\n📊 Processando CNPJ: ${cnpj}`)
    const count = await importContasBancarias(jwt, cnpj)
    totalContas += count

    // Delay entre empresas
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  console.log(`\n📊 Resumo Final:`)
  console.log(`✅ Total de contas bancárias importadas: ${totalContas}`)
  console.log(`\n✨ Importação concluída!`)
}

main().catch((err) => {
  console.error('❌ Erro inesperado:', err)
  process.exit(1)
})

