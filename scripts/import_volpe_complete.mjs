import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

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
 * Login F360
 */
async function loginF360() {
  const response = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: VOLPE_TOKEN }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }

  const data = await response.json()
  return data.Token
}

/**
 * Requisição F360
 */
async function f360Request(jwt, endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${F360_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`F360 ${endpoint}: ${response.status} - ${text}`)
  }

  return response.json()
}

/**
 * Verificar status do relatório
 */
async function verificarStatusRelatorio(jwt, relatorioId) {
  try {
    await f360Request(jwt, `/PublicRelatorioAPI/Download?id=${relatorioId}`)
    return 'Finalizado'
  } catch (error) {
    if (error.message.includes("status 'Aguardando'")) return 'Aguardando'
    if (error.message.includes("status 'Processando'")) return 'Processando'
    if (error.message.includes("status 'Erro'")) return 'Erro'
    throw error
  }
}

/**
 * Baixar relatório
 */
async function baixarRelatorio(jwt, relatorioId, maxTentativas = 30) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    const status = await verificarStatusRelatorio(jwt, relatorioId)

    if (status === 'Finalizado') {
      const response = await f360Request(jwt, `/PublicRelatorioAPI/Download?id=${relatorioId}`)
      if (Array.isArray(response)) return response
      if (typeof response === 'object') return [response]
      throw new Error('Formato inesperado')
    }

    if (status === 'Aguardando' || status === 'Processando') {
      if (tentativa % 5 === 0) {
        console.log(`   ⏳ Aguardando processamento... (${tentativa}/${maxTentativas})`)
      }
      await new Promise(resolve => setTimeout(resolve, 5000))
      continue
    }

    if (status === 'Erro') {
      throw new Error('Relatório falhou no processamento')
    }
  }

  throw new Error('Relatório não disponível após todas as tentativas')
}

/**
 * Normalizar CNPJ
 */
function normalizeCnpj(cnpj) {
  return String(cnpj).replace(/\D/g, '')
}

/**
 * Parsear data
 */
function parseDate(dateStr) {
  if (dateStr.includes('T')) return new Date(dateStr)
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/')
    return new Date(`${year}-${month}-${day}`)
  }
  return new Date(dateStr)
}

/**
 * Processar e salvar entradas
 */
async function processarEntradas(entries, cnpjToCompanyId) {
  const dreEntries = []
  const dfcEntries = []
  const accountingEntries = []

  for (const entry of entries) {
    const entryCnpj = normalizeCnpj(entry.CNPJEmpresa || '')
    const targetCnpj = entryCnpj && cnpjToCompanyId.has(entryCnpj)
      ? entryCnpj
      : VOLPE_CNPJS[0]

    const companyId = cnpjToCompanyId.get(normalizeCnpj(targetCnpj))
    if (!companyId) continue

    const valor = parseFloat(String(entry.ValorLcto || 0))
    if (valor === 0) continue

    const competenciaDate = entry.DataCompetencia
      ? parseDate(entry.DataCompetencia)
      : entry.DataDoLcto
      ? parseDate(entry.DataDoLcto)
      : new Date()

    const natureza = entry.Tipo === false ? 'despesa' : 'receita'
    const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'

    dreEntries.push({
      company_id: companyId,
      company_cnpj: normalizeCnpj(targetCnpj),
      date: competenciaDate.toISOString().split('T')[0],
      account: account,
      account_code: entry.IdPlanoDeContas || null,
      natureza: natureza,
      valor: valor,
      description: entry.ComplemHistorico || entry.NumeroTitulo || '',
      source_erp: 'F360',
      source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
    })

    if (entry.Liquidacao) {
      const liquidacaoDate = parseDate(entry.Liquidacao)
      dfcEntries.push({
        company_id: companyId,
        company_cnpj: normalizeCnpj(targetCnpj),
        date: liquidacaoDate.toISOString().split('T')[0],
        kind: natureza === 'receita' ? 'in' : 'out',
        category: account,
        amount: valor,
        bank_account: null,
        description: entry.ComplemHistorico || entry.NumeroTitulo || '',
        source_erp: 'F360',
        source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
      })
    }

    accountingEntries.push({
      company_id: companyId,
      entry_date: competenciaDate.toISOString().split('T')[0],
      competence_date: competenciaDate.toISOString().split('T')[0],
      description: entry.ComplemHistorico || entry.NumeroTitulo || '',
      account_code: entry.IdPlanoDeContas || account,
      debit_amount: natureza === 'despesa' ? valor : 0,
      credit_amount: natureza === 'receita' ? valor : 0,
      cost_center: entry.CentroDeCusto || null,
      source_erp: 'F360',
      source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
    })
  }

  // Salvar no banco
  let dreCount = 0
  let dfcCount = 0
  let accountingCount = 0

  if (dreEntries.length > 0) {
    const { error } = await supabase
      .from('dre_entries')
      .upsert(dreEntries, { onConflict: 'company_cnpj,date,account,natureza' })
    if (error) throw error
    dreCount = dreEntries.length
  }

  if (dfcEntries.length > 0) {
    const { error } = await supabase
      .from('dfc_entries')
      .upsert(dfcEntries, { onConflict: 'company_cnpj,date,kind,category,bank_account' })
    if (error) throw error
    dfcCount = dfcEntries.length
  }

  if (accountingEntries.length > 0) {
    const { error } = await supabase.from('accounting_entries').insert(accountingEntries)
    if (error) throw error
    accountingCount = accountingEntries.length
  }

  return { dre: dreCount, dfc: dfcCount, accounting: accountingCount }
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log('🚀 Importação Completa - Grupo Volpe\n')
    console.log('='.repeat(60))

    // 1. Verificar empresas no banco
    console.log('\n1. Verificando empresas no banco...')
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, cnpj, razao_social')
      .in('cnpj', VOLPE_CNPJS.map(normalizeCnpj))

    if (companiesError) throw companiesError

    if (!companies || companies.length === 0) {
      throw new Error('Nenhuma empresa do Grupo Volpe encontrada no banco')
    }

    console.log(`✅ ${companies.length} empresas encontradas no banco`)

    // Criar mapa de CNPJ -> company_id
    const cnpjToCompanyId = new Map()
    for (const company of companies) {
      cnpjToCompanyId.set(normalizeCnpj(company.cnpj), company.id)
    }

    // 2. Login F360
    console.log('\n2. Fazendo login na API F360...')
    const jwt = await loginF360()
    console.log('✅ Login realizado com sucesso')

    // 3. Baixar plano de contas
    console.log('\n3. Baixando plano de contas...')
    const planosResponse = await f360Request(jwt, '/PlanoDeContasPublicAPI/ListarPlanosContas')
    const planos = planosResponse.Result || planosResponse.data || []
    console.log(`✅ ${planos.length} contas encontradas`)

    // Salvar plano de contas para primeira empresa
    if (planos.length > 0 && companies.length > 0) {
      const firstCompanyId = companies[0].id
      const inserts = planos.map((plano) => ({
        company_id: firstCompanyId,
        code: plano.PlanoDeContasId || '',
        name: plano.Nome || '',
        type: plano.Tipo === 'A receber' ? 'RECEITA' : 'DESPESA',
        parent_code: null,
        level: 1,
        accepts_entries: true,
      }))

      const { error: planosError } = await supabase
        .from('chart_of_accounts')
        .upsert(inserts, { onConflict: 'company_id,code' })

      if (planosError) {
        console.log(`⚠️  Erro ao salvar plano de contas: ${planosError.message}`)
      } else {
        console.log(`✅ ${inserts.length} contas salvas no plano de contas`)
      }
    }

    // 4. Gerar relatório para todas empresas (últimos 3 meses)
    console.log('\n4. Gerando relatório contábil...')
    const hoje = new Date()
    const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1)
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

    const dataInicio = tresMesesAtras.toISOString().split('T')[0]
    const dataFim = ultimoDiaMes.toISOString().split('T')[0]

    console.log(`   Período: ${dataInicio} a ${dataFim}`)

    const relatorioBody = {
      Data: dataInicio,
      DataFim: dataFim,
      ModeloContabil: 'provisao',
      ModeloRelatorio: 'gerencial',
      ExtensaoDeArquivo: 'json',
      EnviarNotificacaoPorWebhook: false,
      URLNotificacao: '',
      Contas: '',
      CNPJEmpresas: [], // Vazio = todas empresas do grupo
    }

    const relatorioResponse = await f360Request(jwt, '/PublicRelatorioAPI/GerarRelatorio', {
      method: 'POST',
      body: JSON.stringify(relatorioBody),
    })

    const relatorioId = relatorioResponse.Result
    if (!relatorioId) {
      throw new Error('ID do relatório não retornado')
    }

    console.log(`✅ Relatório gerado: ${relatorioId}`)

    // 5. Baixar relatório
    console.log('\n5. Aguardando processamento e baixando relatório...')
    const relatorioData = await baixarRelatorio(jwt, relatorioId)
    console.log(`✅ Relatório baixado: ${Array.isArray(relatorioData) ? relatorioData.length : 1} entradas`)

    // 6. Processar e salvar
    console.log('\n6. Processando e salvando entradas...')
    const { dre, dfc, accounting } = await processarEntradas(relatorioData, cnpjToCompanyId)

    console.log(`✅ DRE entries: ${dre}`)
    console.log(`✅ DFC entries: ${dfc}`)
    console.log(`✅ Accounting entries: ${accounting}`)

    // 7. Registrar log
    console.log('\n7. Registrando log de importação...')
    for (const company of companies) {
      await supabase.from('import_logs').insert({
        company_id: company.id,
        import_type: 'MANUAL',
        status: 'SUCESSO',
        records_processed: Array.isArray(relatorioData) ? relatorioData.length : 1,
        records_imported: dre + dfc + accounting,
        finished_at: new Date().toISOString(),
      })
    }
    console.log('✅ Log registrado')

    // 8. Resumo final
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!')
    console.log(`   Empresas processadas: ${companies.length}`)
    console.log(`   Plano de contas: ${planos.length} contas`)
    console.log(`   DRE entries: ${dre}`)
    console.log(`   DFC entries: ${dfc}`)
    console.log(`   Accounting entries: ${accounting}`)
    console.log(`   Total: ${dre + dfc + accounting} registros`)

  } catch (error) {
    console.error('\n❌ Erro durante a importação:', error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()

