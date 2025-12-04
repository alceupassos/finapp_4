import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

// 13 empresas do Grupo Volpe
const VOLPE_CNPJS = [
  '26888098000159', '26888098000230', '26888098000310',
  '26888098000400', '26888098000582', '26888098000663',
  '26888098000744', '26888098000825', '26888098000906',
  '26888098001040', '26888098001120', '26888098001201',
  '26888098001392',
]

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
 * Função principal
 */
async function main() {
  try {
    console.log('🚀 Importação Completa - Grupo Volpe (via API direta)\n')
    console.log('='.repeat(60))

    console.log('\n⚠️  Este script requer que você execute os comandos SQL manualmente')
    console.log('   ou use o script import_volpe_complete.mjs após corrigir o problema de cache.\n')

    // 1. Login F360
    console.log('1. Fazendo login na API F360...')
    const jwt = await loginF360()
    console.log('✅ Login realizado com sucesso')

    // 2. Baixar plano de contas
    console.log('\n2. Baixando plano de contas...')
    const planosResponse = await f360Request(jwt, '/PlanoDeContasPublicAPI/ListarPlanosContas')
    const planos = planosResponse.Result || planosResponse.data || []
    console.log(`✅ ${planos.length} contas encontradas`)

    // 3. Gerar relatório
    console.log('\n3. Gerando relatório contábil...')
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
      CNPJEmpresas: [],
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

    // 4. Baixar relatório
    console.log('\n4. Aguardando processamento e baixando relatório...')
    const relatorioData = await baixarRelatorio(jwt, relatorioId)
    console.log(`✅ Relatório baixado: ${Array.isArray(relatorioData) ? relatorioData.length : 1} entradas`)

    // 5. Analisar dados
    console.log('\n5. Analisando dados do relatório...')
    const cnpjsNoRelatorio = new Set()
    if (Array.isArray(relatorioData)) {
      for (const entry of relatorioData) {
        const cnpj = normalizeCnpj(entry.CNPJEmpresa || '')
        if (cnpj && cnpj.length === 14) {
          cnpjsNoRelatorio.add(cnpj)
        }
      }
    }

    console.log(`✅ ${cnpjsNoRelatorio.size} CNPJs únicos encontrados no relatório`)
    console.log(`   CNPJs: ${Array.from(cnpjsNoRelatorio).slice(0, 5).join(', ')}${cnpjsNoRelatorio.size > 5 ? '...' : ''}`)

    // 6. Preparar dados para inserção
    console.log('\n6. Preparando dados para inserção...')
    const dreEntries = []
    const dfcEntries = []
    const accountingEntries = []

    // Assumir que todas empresas existem no banco (será validado na inserção)
    for (const entry of Array.isArray(relatorioData) ? relatorioData : [relatorioData]) {
      const entryCnpj = normalizeCnpj(entry.CNPJEmpresa || '')
      const targetCnpj = entryCnpj && VOLPE_CNPJS.includes(entryCnpj)
        ? entryCnpj
        : normalizeCnpj(VOLPE_CNPJS[0])

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
        company_cnpj: targetCnpj,
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
          company_cnpj: targetCnpj,
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
        company_cnpj: targetCnpj,
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

    console.log(`✅ DRE entries preparadas: ${dreEntries.length}`)
    console.log(`✅ DFC entries preparadas: ${dfcEntries.length}`)
    console.log(`✅ Accounting entries preparadas: ${accountingEntries.length}`)

    // 7. Salvar em arquivo JSON para inserção manual via SQL
    const fs = await import('fs')
    const output = {
      planos: planos,
      dreEntries: dreEntries,
      dfcEntries: dfcEntries,
      accountingEntries: accountingEntries,
      metadata: {
        relatorioId,
        dataInicio,
        dataFim,
        cnpjsEncontrados: Array.from(cnpjsNoRelatorio),
        totalEntries: relatorioData.length,
      },
    }

    const outputFile = 'volpe_import_data.json'
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2))
    console.log(`\n✅ Dados salvos em ${outputFile}`)
    console.log(`   Use este arquivo para inserir os dados manualmente via SQL ou Supabase MCP`)

    // 8. Resumo
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ DADOS EXTRAÍDOS COM SUCESSO!')
    console.log(`   Empresas no relatório: ${cnpjsNoRelatorio.size}`)
    console.log(`   Plano de contas: ${planos.length} contas`)
    console.log(`   DRE entries: ${dreEntries.length}`)
    console.log(`   DFC entries: ${dfcEntries.length}`)
    console.log(`   Accounting entries: ${accountingEntries.length}`)
    console.log(`\n📁 Arquivo gerado: ${outputFile}`)

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

