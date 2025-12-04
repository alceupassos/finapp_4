/**
 * Script de Importação Completa F360 - Ano 2025
 * Importa dados de todas as 13 empresas Volpe para o ano de 2025
 * 
 * Dados importados:
 * - DRE (via Relatório Contábil)
 * - DFC (via Parcelas Liquidadas)
 * - Contas Bancárias
 * - Transações Bancárias (se disponível)
 * 
 * Processamento: Mês a mês (Janeiro a Dezembro 2025)
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Requisição REST para Supabase
 */
async function supabaseRequest(method, table, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${options.query ? '?' + new URLSearchParams(options.query).toString() : ''}`
  
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Supabase ${method} ${table}: ${response.status} - ${text}`)
  }

  if (method === 'DELETE' || response.status === 204) return null
  return response.json()
}

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

// 13 empresas do Grupo Volpe
const VOLPE_CNPJS = [
  { cnpj: '26888098000159', nome: 'VOLPE MATRIZ' },
  { cnpj: '26888098000230', nome: 'VOLPE ZOIAO' },
  { cnpj: '26888098000310', nome: 'VOLPE MAUÁ' },
  { cnpj: '26888098000400', nome: 'VOLPE DIADEMA' },
  { cnpj: '26888098000582', nome: 'VOLPE GRAJAÚ' },
  { cnpj: '26888098000663', nome: 'VOLPE SANTO ANDRÉ' },
  { cnpj: '26888098000744', nome: 'VOLPE CAMPO LIMPO' },
  { cnpj: '26888098000825', nome: 'VOLPE BRASILÂNDIA' },
  { cnpj: '26888098000906', nome: 'VOLPE POÁ' },
  { cnpj: '26888098001040', nome: 'VOLPE ITAIM' },
  { cnpj: '26888098001120', nome: 'VOLPE PRAIA GRANDE' },
  { cnpj: '26888098001201', nome: 'VOLPE ITANHAÉM' },
  { cnpj: '26888098001392', nome: 'VOLPE SÃO MATHEUS' },
]

// Meses de 2025
const MONTHS_2025 = [
  { month: 1, name: 'Janeiro', start: '2025-01-01', end: '2025-01-31' },
  { month: 2, name: 'Fevereiro', start: '2025-02-01', end: '2025-02-28' },
  { month: 3, name: 'Março', start: '2025-03-01', end: '2025-03-31' },
  { month: 4, name: 'Abril', start: '2025-04-01', end: '2025-04-30' },
  { month: 5, name: 'Maio', start: '2025-05-01', end: '2025-05-31' },
  { month: 6, name: 'Junho', start: '2025-06-01', end: '2025-06-30' },
  { month: 7, name: 'Julho', start: '2025-07-01', end: '2025-07-31' },
  { month: 8, name: 'Agosto', start: '2025-08-01', end: '2025-08-31' },
  { month: 9, name: 'Setembro', start: '2025-09-01', end: '2025-09-30' },
  { month: 10, name: 'Outubro', start: '2025-10-01', end: '2025-10-31' },
  { month: 11, name: 'Novembro', start: '2025-11-01', end: '2025-11-30' },
  { month: 12, name: 'Dezembro', start: '2025-12-01', end: '2025-12-31' },
]

let jwtToken = null
let jwtExpiry = 0

/**
 * Login F360
 */
async function loginF360() {
  if (jwtToken && Date.now() < jwtExpiry - 5 * 60 * 1000) {
    return jwtToken
  }

  const response = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: VOLPE_TOKEN }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }

  const data = await response.json()
  jwtToken = data.Token
  jwtExpiry = Date.now() + 3600 * 1000 // 1 hora
  return jwtToken
}

/**
 * Requisição F360
 */
async function f360Request(endpoint, options = {}) {
  const jwt = await loginF360()
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
async function verificarStatusRelatorio(relatorioId) {
  try {
    const response = await f360Request(`/PublicRelatorioAPI/Status?id=${relatorioId}`)
    return response.Status || 'Aguardando'
  } catch (error) {
    if (error.message?.includes("status 'Aguardando'")) return 'Aguardando'
    if (error.message?.includes("status 'Processando'")) return 'Processando'
    if (error.message?.includes("status 'Erro'")) return 'Erro'
    throw error
  }
}

/**
 * Baixar relatório
 */
async function baixarRelatorio(relatorioId, maxTentativas = 30) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    const status = await verificarStatusRelatorio(relatorioId)

    if (status === 'Finalizado') {
      const response = await f360Request(`/PublicRelatorioAPI/Download?id=${relatorioId}`)
      if (Array.isArray(response)) return response
      if (typeof response === 'object') return [response]
      throw new Error('Formato inesperado')
    }

    if (status === 'Aguardando' || status === 'Processando') {
      console.log(`  ⏳ Relatório ${relatorioId}: ${status} (tentativa ${tentativa}/${maxTentativas})`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      continue
    }

    if (status === 'Erro') {
      throw new Error(`Relatório falhou: ${relatorioId}`)
    }
  }

  throw new Error(`Relatório não disponível após ${maxTentativas} tentativas`)
}

/**
 * Buscar company_id por CNPJ
 */
async function getCompanyId(cnpj) {
  const normalizedCnpj = normalizeCnpj(cnpj)
  try {
    const data = await supabaseRequest('GET', 'companies', {
      query: { cnpj: `eq.${normalizedCnpj}`, select: 'id,cnpj,razao_social' }
    })
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️  Empresa não encontrada: ${cnpj} (normalizado: ${normalizedCnpj})`)
      return null
    }

    return data[0].id
  } catch (error) {
    console.warn(`⚠️  Erro ao buscar empresa ${cnpj}:`, error.message)
    return null
  }
}

/**
 * Normalizar CNPJ
 */
function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

/**
 * Importar Contas Bancárias
 */
async function importBankAccounts(companyCnpj, companyId) {
  try {
    const accounts = await f360Request('/ContaBancariaPublicAPI/ListarContasBancarias')
    const result = accounts.Result || accounts.data || []

    if (result.length === 0) {
      console.log(`  ℹ️  Nenhuma conta bancária encontrada para ${companyCnpj}`)
      return 0
    }

    const inserts = []
    for (const acc of result) {
      // Para tokens GROUP, pode ter CNPJ na conta
      const accCnpj = normalizeCnpj(acc.CNPJ || acc.cnpj || companyCnpj)
      
      // Só importar se for da empresa atual
      if (accCnpj !== normalizeCnpj(companyCnpj)) continue

      inserts.push({
        company_id: companyId,
        company_cnpj: accCnpj,
        f360_account_id: acc.Id,
        nome: acc.Nome,
        tipo_conta: acc.TipoDeConta || 'Conta Corrente',
        banco_numero: acc.NumeroBanco || null,
        agencia: acc.Agencia || null,
        conta: acc.Conta || null,
        digito_conta: acc.DigitoConta || null,
        saldo_atual: 0,
        active: true,
      })
    }

    if (inserts.length === 0) return 0

    // Upsert via REST API (POST com Prefer: resolution=merge-duplicates)
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    }
    
    for (const insert of inserts) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/bank_accounts?on_conflict=company_id,f360_account_id`, {
          method: 'POST',
          headers,
          body: JSON.stringify(insert),
        })
      } catch (err) {
        // Ignorar duplicatas
        if (!err.message?.includes('duplicate')) throw err
      }
    }
    return inserts.length
  } catch (error) {
    console.error(`  ❌ Erro ao importar contas bancárias:`, error.message)
    return 0
  }
}

/**
 * Importar DRE via Relatório
 */
async function importDRE(companyCnpj, companyId, dataInicio, dataFim) {
  try {
    console.log(`  📊 Gerando relatório DRE: ${dataInicio} a ${dataFim}`)
    
    const relatorioId = await f360Request('/PublicRelatorioAPI/GerarRelatorio', {
      method: 'POST',
      body: JSON.stringify({
        Data: dataInicio,
        DataFim: dataFim,
        ModeloContabil: 'provisao',
        ModeloRelatorio: 'gerencial',
        ExtensaoDeArquivo: 'json',
        CNPJEmpresas: [normalizeCnpj(companyCnpj)],
        EnviarNotificacaoPorWebhook: false,
        URLNotificacao: '',
        Contas: '',
      }),
    })

    if (!relatorioId.Result) {
      throw new Error('Relatório não gerado')
    }

    const entries = await baixarRelatorio(relatorioId.Result)
    if (!Array.isArray(entries) || entries.length === 0) {
      console.log(`  ℹ️  Nenhuma entrada DRE encontrada`)
      return { dre: 0, dfc: 0, accounting: 0 }
    }

    const dreEntries = []
    const dfcEntries = []
    const accountingEntries = []

    for (const entry of entries) {
      const entryCnpj = normalizeCnpj(entry.CNPJEmpresa || companyCnpj)
      if (entryCnpj !== normalizeCnpj(companyCnpj)) continue

      const valor = parseFloat(String(entry.ValorLcto || 0))
      if (valor === 0) continue

      const competenciaDate = entry.DataCompetencia || entry.DataDoLcto
      if (!competenciaDate) continue

      const natureza = entry.Tipo === false ? 'despesa' : 'receita'
      const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'

      // DRE Entry
      dreEntries.push({
        company_id: companyId,
        company_cnpj: entryCnpj,
        date: competenciaDate.split('T')[0],
        account: account,
        account_code: entry.IdPlanoDeContas || null,
        natureza: natureza,
        valor: valor,
        description: entry.ComplemHistorico || entry.NumeroTitulo || '',
        source_erp: 'F360',
        source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
      })

      // DFC Entry (se tiver liquidação)
      if (entry.Liquidacao) {
        dfcEntries.push({
          company_id: companyId,
          company_cnpj: entryCnpj,
          date: entry.Liquidacao.split('T')[0],
          kind: natureza === 'receita' ? 'in' : 'out',
          category: account,
          amount: valor,
          bank_account: null,
          description: entry.ComplemHistorico || entry.NumeroTitulo || '',
          source_erp: 'F360',
          source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
        })
      }

      // Accounting Entry
      accountingEntries.push({
        company_id: companyId,
        entry_date: (entry.DataDoLcto || competenciaDate).split('T')[0],
        competence_date: competenciaDate.split('T')[0],
        description: entry.ComplemHistorico || entry.NumeroTitulo || '',
        account_code: entry.IdPlanoDeContas || account,
        debit_amount: natureza === 'despesa' ? valor : 0,
        credit_amount: natureza === 'receita' ? valor : 0,
        cost_center: entry.CentroDeCusto || null,
        source_erp: 'F360',
        source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
      })
    }

    // Inserir no banco
    let dreCount = 0
    let dfcCount = 0
    let accountingCount = 0

    // Inserir DRE em batches via REST (ignorar duplicatas)
    if (dreEntries.length > 0) {
      const batchSize = 500
      for (let i = 0; i < dreEntries.length; i += batchSize) {
        const batch = dreEntries.slice(i, i + batchSize)
        console.log(`  💾 Inserindo batch DRE ${Math.floor(i/batchSize) + 1}/${Math.ceil(dreEntries.length/batchSize)} (${batch.length} registros)`)
        
        try {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/dre_entries`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(batch),
          })
          
          if (!response.ok) {
            const text = await response.text()
            // Ignorar erros de duplicata (23505)
            if (!text.includes('23505') && !text.includes('duplicate')) {
              console.warn(`  ⚠️  Erro ao inserir DRE: ${response.status} - ${text.substring(0, 200)}`)
            }
          }
        } catch (err) {
          if (!err.message?.includes('23505') && !err.message?.includes('duplicate')) {
            console.warn(`  ⚠️  Erro ao inserir DRE batch:`, err.message)
          }
        }
      }
      dreCount = dreEntries.length
    }

    // Inserir DFC em batches
    if (dfcEntries.length > 0) {
      const batchSize = 500
      for (let i = 0; i < dfcEntries.length; i += batchSize) {
        const batch = dfcEntries.slice(i, i + batchSize)
        console.log(`  💾 Inserindo batch DFC ${Math.floor(i/batchSize) + 1}/${Math.ceil(dfcEntries.length/batchSize)} (${batch.length} registros)`)
        
        try {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/dfc_entries`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(batch),
          })
          
          if (!response.ok) {
            const text = await response.text()
            if (!text.includes('23505') && !text.includes('duplicate')) {
              console.warn(`  ⚠️  Erro ao inserir DFC: ${response.status} - ${text.substring(0, 200)}`)
            }
          }
        } catch (err) {
          if (!err.message?.includes('23505') && !err.message?.includes('duplicate')) {
            console.warn(`  ⚠️  Erro ao inserir DFC batch:`, err.message)
          }
        }
      }
      dfcCount = dfcEntries.length
    }

    // Inserir Accounting em batches
    if (accountingEntries.length > 0) {
      const batchSize = 500
      for (let i = 0; i < accountingEntries.length; i += batchSize) {
        const batch = accountingEntries.slice(i, i + batchSize)
        console.log(`  💾 Inserindo batch Accounting ${Math.floor(i/batchSize) + 1}/${Math.ceil(accountingEntries.length/batchSize)} (${batch.length} registros)`)
        
        try {
          await supabaseRequest('POST', 'accounting_entries', { body: batch })
        } catch (err) {
          console.warn(`  ⚠️  Erro ao inserir accounting batch:`, err.message)
        }
      }
      accountingCount = accountingEntries.length
    }

    return { dre: dreCount, dfc: dfcCount, accounting: accountingCount }
  } catch (error) {
    console.error(`  ❌ Erro ao importar DRE:`, error.message)
    return { dre: 0, dfc: 0, accounting: 0 }
  }
}

/**
 * Importar dados de uma empresa para um mês
 */
async function importCompanyMonth(company, month) {
  const { cnpj, nome } = company
  const { name, start, end } = month

  console.log(`\n📅 ${nome} - ${name} 2025`)

  const companyId = await getCompanyId(cnpj)
  if (!companyId) {
    console.log(`  ⚠️  Empresa não encontrada no banco, pulando...`)
    return { success: false }
  }

  // Importar contas bancárias (apenas uma vez)
  if (month.month === 1) {
    console.log(`  🏦 Importando contas bancárias...`)
    const bankAccountsCount = await importBankAccounts(cnpj, companyId)
    console.log(`  ✅ ${bankAccountsCount} contas bancárias importadas`)
  }

  // Importar DRE/DFC/Accounting
  const result = await importDRE(cnpj, companyId, start, end)
  console.log(`  ✅ DRE: ${result.dre} | DFC: ${result.dfc} | Accounting: ${result.accounting}`)

  return { success: true, ...result }
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Iniciando importação completa F360 - Ano 2025\n')
  console.log(`📊 Empresas: ${VOLPE_CNPJS.length}`)
  console.log(`📅 Período: Janeiro a Dezembro 2025\n`)

  const stats = {
    companies: 0,
    months: 0,
    dreTotal: 0,
    dfcTotal: 0,
    accountingTotal: 0,
    errors: [],
  }

  // Processar empresa por empresa, mês por mês
  for (const company of VOLPE_CNPJS) {
    stats.companies++
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🏢 ${company.nome} (${company.cnpj})`)
    console.log(`${'='.repeat(60)}`)

    for (const month of MONTHS_2025) {
      stats.months++
      try {
        const result = await importCompanyMonth(company, month)
        if (result.success) {
          stats.dreTotal += result.dre || 0
          stats.dfcTotal += result.dfc || 0
          stats.accountingTotal += result.accounting || 0
        }
        
        // Delay entre meses para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        stats.errors.push(`${company.nome} - ${month.name}: ${error.message}`)
        console.error(`  ❌ Erro:`, error.message)
      }
    }

    // Delay maior entre empresas
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  // Resumo final
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 RESUMO DA IMPORTAÇÃO')
  console.log(`${'='.repeat(60)}`)
  console.log(`✅ Empresas processadas: ${stats.companies}/${VOLPE_CNPJS.length}`)
  console.log(`✅ Meses processados: ${stats.months}/${VOLPE_CNPJS.length * 12}`)
  console.log(`✅ DRE entries: ${stats.dreTotal.toLocaleString()}`)
  console.log(`✅ DFC entries: ${stats.dfcTotal.toLocaleString()}`)
  console.log(`✅ Accounting entries: ${stats.accountingTotal.toLocaleString()}`)
  
  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Erros encontrados: ${stats.errors.length}`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }

  console.log(`\n✅ Importação concluída!\n`)
}

main().catch(console.error)

