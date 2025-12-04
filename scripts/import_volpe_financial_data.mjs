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
 * Importar Parcelas de Títulos e transformar em DRE/DFC
 */
async function importParcelasTitulos(jwt, cnpj, dataInicio, dataFim) {
  try {
    let allParcelas = []
    let pagina = 1
    let hasMore = true

    console.log(`  📥 Buscando parcelas de ${dataInicio} a ${dataFim}...`)

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
      console.log(`  ⚠️  Nenhuma parcela encontrada para ${cnpj}`)
      return { dre: 0, dfc: 0 }
    }

    console.log(`  📊 ${allParcelas.length} parcelas encontradas`)

    // Buscar company_id
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', cnpj)
      .single()

    if (!company) {
      console.log(`  ⚠️  Empresa não encontrada no Supabase: ${cnpj}`)
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
      let dreDate = dataEmissao
      
      if (competencia) {
        // Formato esperado: MM/YYYY ou YYYY-MM
        const parts = competencia.split(/[-\/]/)
        if (parts.length === 2) {
          const month = parseInt(parts[0]) || parseInt(parts[1])
          const year = parseInt(parts[1]) || parseInt(parts[0])
          if (month && year) {
            dreDate = new Date(year, month - 1, 1)
          }
        }
      }

      const natureza = parcela.TipoTitulo === 'Receita' || parcela.TipoTitulo === 'A receber' ? 'receita' : 'despesa'
      const valor = parseFloat(parcela.Valor || parcela.valor || parcela.ValorLiquido || parcela.valorLiquido || 0)

      if (valor === 0) continue

      dreEntries.push({
        company_id: company.id,
        company_cnpj: cnpj,
        date: dreDate.toISOString().split('T')[0],
        account: parcela.PlanoDeContas || parcela.planoDeContas || parcela.Categoria || 'Outros',
        account_code: null,
        natureza,
        valor,
        description: `${parcela.TipoTitulo || parcela.tipoTitulo || ''} - ${parcela.ClienteFornecedor || parcela.clienteFornecedor || ''}`.trim(),
        source_erp: 'F360',
        source_id: parcela.ParcelaId || parcela.parcelaId || parcela.TituloId || parcela.tituloId || '',
      })

      // DFC: baseado na data de liquidação (se houver) ou vencimento
      if (dataLiquidacao || parcela.DataVencimento || parcela.dataVencimento) {
        const dfcDate = dataLiquidacao || new Date(parcela.DataVencimento || parcela.dataVencimento)
        const kind = parcela.TipoTitulo === 'Receita' || parcela.TipoTitulo === 'A receber' ? 'in' : 'out'

        dfcEntries.push({
          company_id: company.id,
          company_cnpj: cnpj,
          date: dfcDate.toISOString().split('T')[0],
          kind,
          category: parcela.PlanoDeContas || parcela.planoDeContas || parcela.Categoria || 'Outros',
          amount: valor,
          bank_account: null,
          description: `${parcela.TipoTitulo || parcela.tipoTitulo || ''} - ${parcela.ClienteFornecedor || parcela.clienteFornecedor || ''}`.trim(),
          source_erp: 'F360',
          source_id: parcela.ParcelaId || parcela.parcelaId || parcela.TituloId || parcela.tituloId || '',
        })
      }
    }

    // Inserir DRE entries em batches
    let dreCount = 0
    if (dreEntries.length > 0) {
      const BATCH_SIZE = 500
      for (let i = 0; i < dreEntries.length; i += BATCH_SIZE) {
        const batch = dreEntries.slice(i, i + BATCH_SIZE)
        const { error: dreError } = await supabase
          .from('dre_entries')
          .upsert(batch, { onConflict: 'company_cnpj,date,account,natureza' })

        if (dreError) {
          console.error(`  ❌ Erro ao inserir DRE (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, dreError.message)
        } else {
          dreCount += batch.length
        }
      }
      console.log(`  ✅ ${dreCount} entradas DRE importadas`)
    }

    // Inserir DFC entries em batches
    let dfcCount = 0
    if (dfcEntries.length > 0) {
      const BATCH_SIZE = 500
      for (let i = 0; i < dfcEntries.length; i += BATCH_SIZE) {
        const batch = dfcEntries.slice(i, i + BATCH_SIZE)
        const { error: dfcError } = await supabase
          .from('dfc_entries')
          .upsert(batch, { onConflict: 'company_cnpj,date,kind,category,bank_account' })

        if (dfcError) {
          console.error(`  ❌ Erro ao inserir DFC (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, dfcError.message)
        } else {
          dfcCount += batch.length
        }
      }
      console.log(`  ✅ ${dfcCount} entradas DFC importadas`)
    }

    return { dre: dreCount, dfc: dfcCount }
  } catch (error) {
    console.error(`  ❌ Erro ao importar parcelas para ${cnpj}:`, error.message)
    return { dre: 0, dfc: 0 }
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando importação de DRE/DFC - Grupo Volpe\n')

  // Período padrão: últimos 12 meses
  const hoje = new Date()
  const dataFim = hoje.toISOString().split('T')[0]
  const dataInicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  console.log(`📅 Período: ${dataInicio} a ${dataFim}\n`)

  const jwt = await loginF360()
  if (!jwt) {
    console.error('❌ Falha na autenticação F360')
    process.exit(1)
  }

  let totalDRE = 0
  let totalDFC = 0

  for (const cnpj of VOLPE_CNPJS) {
    console.log(`\n📊 Processando CNPJ: ${cnpj}`)
    const { dre, dfc } = await importParcelasTitulos(jwt, cnpj, dataInicio, dataFim)
    totalDRE += dre
    totalDFC += dfc

    // Delay entre empresas
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log(`\n📊 Resumo Final:`)
  console.log(`✅ Total DRE: ${totalDRE} entradas`)
  console.log(`✅ Total DFC: ${totalDFC} entradas`)
  console.log(`\n✨ Importação concluída!`)
}

main().catch((err) => {
  console.error('❌ Erro inesperado:', err)
  process.exit(1)
})

