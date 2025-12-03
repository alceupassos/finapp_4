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
 * Importar Plano de Contas
 */
async function importPlanoContas(jwt, cnpj) {
  try {
    const response = await f360Request(jwt, '/PlanoDeContasPublicAPI/ListarPlanosContas', { cnpj })
    const planos = response.Result || response.data || []

    if (planos.length === 0) {
      console.log(`  ⚠️  Nenhum plano de contas encontrado`)
      return 0
    }

    // Buscar company_id
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', cnpj)
      .single()

    if (!company) {
      console.log(`  ⚠️  Empresa não encontrada no Supabase`)
      return 0
    }

    // Inserir/atualizar plano de contas
    const inserts = planos.map((plano) => ({
      company_id: company.id,
      company_cnpj: cnpj,
      code: plano.CodigoObrigacaoContabil || '',
      name: plano.Nome,
      type: plano.Tipo === 'A receber' ? 'RECEITA' : 'DESPESA',
      parent_code: null,
      level: 1,
      accepts_entries: true,
    }))

    const { error } = await supabase
      .from('chart_of_accounts')
      .upsert(inserts, { onConflict: 'company_id,code' })

    if (error) {
      console.error(`  ❌ Erro ao inserir plano de contas:`, error.message)
      return 0
    }

    console.log(`  ✅ ${planos.length} contas importadas`)
    return planos.length
  } catch (error) {
    console.error(`  ❌ Erro ao importar plano de contas:`, error.message)
    return 0
  }
}

/**
 * Importar Contas Bancárias
 */
async function importContasBancarias(jwt, cnpj) {
  try {
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
      console.log(`  ⚠️  Empresa não encontrada no Supabase`)
      return 0
    }

    // Inserir/atualizar contas bancárias
    const inserts = contas.map((conta) => ({
      company_id: company.id,
      company_cnpj: cnpj,
      f360_account_id: conta.Id,
      nome: conta.Nome,
      tipo_conta: conta.TipoDeConta,
      banco_numero: conta.NumeroBanco,
      agencia: conta.Agencia,
      conta: conta.Conta,
      digito_conta: conta.DigitoConta,
      active: true,
    }))

    const { error } = await supabase
      .from('bank_accounts')
      .upsert(inserts, { onConflict: 'company_cnpj,f360_account_id' })

    if (error) {
      console.error(`  ❌ Erro ao inserir contas bancárias:`, error.message)
      return 0
    }

    console.log(`  ✅ ${contas.length} contas bancárias importadas`)
    return contas.length
  } catch (error) {
    console.error(`  ❌ Erro ao importar contas bancárias:`, error.message)
    return 0
  }
}

/**
 * Importar Parcelas de Títulos e transformar em DRE/DFC
 */
async function importParcelasTitulos(jwt, cnpj, dataInicio, dataFim) {
  try {
    let allParcelas = []
    let pagina = 1
    let hasMore = true

    // Paginar resultados
    while (hasMore) {
      const response = await f360Request(jwt, '/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos', {
        cnpj,
        dataInicio,
        dataFim,
        tipo: 'Ambos',
        tipoDatas: 'Emissão',
        pagina: String(pagina),
      })

      const parcelas = response.Result || response.data || []
      allParcelas = [...allParcelas, ...parcelas]

      hasMore = parcelas.length >= 100
      pagina++

      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 200)) // Rate limiting
      }
    }

    if (allParcelas.length === 0) {
      console.log(`  ⚠️  Nenhuma parcela encontrada`)
      return { dre: 0, dfc: 0 }
    }

    // Buscar company_id
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', cnpj)
      .single()

    if (!company) {
      console.log(`  ⚠️  Empresa não encontrada no Supabase`)
      return { dre: 0, dfc: 0 }
    }

    // Transformar em DRE entries
    const dreEntries = []
    const dfcEntries = []

    for (const parcela of allParcelas) {
      const dataEmissao = new Date(parcela.DataEmissao || parcela.dataEmissao)
      const dataLiquidacao = parcela.DataLiquidacao || parcela.dataLiquidacao
        ? new Date(parcela.DataLiquidacao || parcela.dataLiquidacao)
        : null

      // DRE: baseado na competência ou data de emissão
      const competencia = parcela.Competencia || parcela.competencia
      const dreDate = competencia
        ? new Date(`${competencia.split('-')[1]}-${competencia.split('-')[0]}-01`)
        : dataEmissao

      const natureza = parcela.TipoTitulo === 'Receita' ? 'receita' : 'despesa'
      const valor = parseFloat(parcela.Valor || parcela.valor || 0)

      dreEntries.push({
        company_id: company.id,
        company_cnpj: cnpj,
        date: dreDate.toISOString().split('T')[0],
        account: parcela.PlanoDeContas || parcela.planoDeContas || 'Outros',
        account_code: null,
        natureza,
        valor,
        description: `${parcela.TipoTitulo || parcela.tipoTitulo} - ${parcela.ClienteFornecedor || parcela.clienteFornecedor || ''}`,
        source_erp: 'F360',
        source_id: parcela.ParcelaId || parcela.parcelaId || parcela.TituloId || parcela.tituloId,
      })

      // DFC: baseado na data de liquidação (se houver) ou vencimento
      if (dataLiquidacao || parcela.DataVencimento || parcela.dataVencimento) {
        const dfcDate = dataLiquidacao || new Date(parcela.DataVencimento || parcela.dataVencimento)
        const kind = parcela.TipoTitulo === 'Receita' ? 'in' : 'out'

        dfcEntries.push({
          company_id: company.id,
          company_cnpj: cnpj,
          date: dfcDate.toISOString().split('T')[0],
          kind,
          category: parcela.PlanoDeContas || parcela.planoDeContas || 'Outros',
          amount: valor,
          bank_account: null,
          description: `${parcela.TipoTitulo || parcela.tipoTitulo} - ${parcela.ClienteFornecedor || parcela.clienteFornecedor || ''}`,
          source_erp: 'F360',
          source_id: parcela.ParcelaId || parcela.parcelaId || parcela.TituloId || parcela.tituloId,
        })
      }
    }

    // Inserir DRE entries
    let dreCount = 0
    if (dreEntries.length > 0) {
      const { error: dreError } = await supabase
        .from('dre_entries')
        .upsert(dreEntries, { onConflict: 'company_cnpj,date,account,natureza' })

      if (dreError) {
        console.error(`  ❌ Erro ao inserir DRE:`, dreError.message)
      } else {
        dreCount = dreEntries.length
        console.log(`  ✅ ${dreCount} entradas DRE importadas`)
      }
    }

    // Inserir DFC entries
    let dfcCount = 0
    if (dfcEntries.length > 0) {
      const { error: dfcError } = await supabase
        .from('dfc_entries')
        .upsert(dfcEntries, { onConflict: 'company_cnpj,date,kind,category,bank_account' })

      if (dfcError) {
        console.error(`  ❌ Erro ao inserir DFC:`, dfcError.message)
      } else {
        dfcCount = dfcEntries.length
        console.log(`  ✅ ${dfcCount} entradas DFC importadas`)
      }
    }

    return { dre: dreCount, dfc: dfcCount }
  } catch (error) {
    console.error(`  ❌ Erro ao importar parcelas:`, error.message)
    return { dre: 0, dfc: 0 }
  }
}

/**
 * Importar dados de uma empresa
 */
async function importCompany(cnpj, dataInicio, dataFim) {
  console.log(`\n📊 Importando dados para CNPJ: ${cnpj}`)

  const jwt = await loginF360()
  if (!jwt) {
    console.error(`❌ Falha na autenticação F360`)
    return { planoContas: 0, contasBancarias: 0, dre: 0, dfc: 0 }
  }

  const planoContas = await importPlanoContas(jwt, cnpj)
  await new Promise((resolve) => setTimeout(resolve, 200))

  const contasBancarias = await importContasBancarias(jwt, cnpj)
  await new Promise((resolve) => setTimeout(resolve, 200))

  const { dre, dfc } = await importParcelasTitulos(jwt, cnpj, dataInicio, dataFim)

  return { planoContas, contasBancarias, dre, dfc }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando importação F360 - Grupo Volpe\n')

  // Período padrão: últimos 12 meses
  const hoje = new Date()
  const dataFim = hoje.toISOString().split('T')[0]
  const dataInicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  console.log(`📅 Período: ${dataInicio} a ${dataFim}\n`)

  let totalPlanoContas = 0
  let totalContasBancarias = 0
  let totalDRE = 0
  let totalDFC = 0

  for (const cnpj of VOLPE_CNPJS) {
    const result = await importCompany(cnpj, dataInicio, dataFim)
    totalPlanoContas += result.planoContas
    totalContasBancarias += result.contasBancarias
    totalDRE += result.dre
    totalDFC += result.dfc

    // Delay entre empresas
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log(`\n📊 Resumo Final:`)
  console.log(`✅ Plano de Contas: ${totalPlanoContas} contas`)
  console.log(`✅ Contas Bancárias: ${totalContasBancarias} contas`)
  console.log(`✅ DRE: ${totalDRE} entradas`)
  console.log(`✅ DFC: ${totalDFC} entradas`)
  console.log(`\n✨ Importação concluída!`)
}

main().catch(console.error)

