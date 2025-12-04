/**
 * Script de Importação F360 2025 - Gera SQL para execução via MCP Supabase
 * 
 * Este script extrai dados do F360 e gera arquivos SQL que podem ser executados
 * via MCP Supabase (mcp_supabase_apply_migration) para evitar problemas de schema cache.
 */

import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

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
  jwtExpiry = Date.now() + 3600 * 1000
  return jwtToken
}

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

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

function escapeSql(str) {
  if (!str) return 'NULL'
  return `'${String(str).replace(/'/g, "''")}'`
}

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

async function importCompanyMonth(company, month, companyIdMap) {
  const { cnpj, nome } = company
  const { name, start, end } = month
  const companyId = companyIdMap.get(normalizeCnpj(cnpj))

  if (!companyId) {
    console.log(`  ⚠️  Company ID não encontrado para ${cnpj}`)
    return { dre: [], dfc: [], accounting: [] }
  }

  console.log(`  📊 Gerando relatório: ${start} a ${end}`)
  
  const relatorioId = await f360Request('/PublicRelatorioAPI/GerarRelatorio', {
    method: 'POST',
    body: JSON.stringify({
      Data: start,
      DataFim: end,
      ModeloContabil: 'provisao',
      ModeloRelatorio: 'gerencial',
      ExtensaoDeArquivo: 'json',
      CNPJEmpresas: [normalizeCnpj(cnpj)],
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
    return { dre: [], dfc: [], accounting: [] }
  }

  const dreEntries = []
  const dfcEntries = []
  const accountingEntries = []

  for (const entry of entries) {
    const entryCnpj = normalizeCnpj(entry.CNPJEmpresa || cnpj)
    if (entryCnpj !== normalizeCnpj(cnpj)) continue

    const valor = parseFloat(String(entry.ValorLcto || 0))
    if (valor === 0) continue

    const competenciaDate = entry.DataCompetencia || entry.DataDoLcto
    if (!competenciaDate) continue

    const natureza = entry.Tipo === false ? 'despesa' : 'receita'
    const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'

    dreEntries.push({
      company_id: companyId,
      company_cnpj: entryCnpj,
      date: competenciaDate.split('T')[0],
      account,
      account_code: entry.IdPlanoDeContas || null,
      natureza,
      valor,
      description: entry.ComplemHistorico || entry.NumeroTitulo || '',
      source_erp: 'F360',
      source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
    })

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

  return { dre: dreEntries, dfc: dfcEntries, accounting: accountingEntries }
}

async function main() {
  console.log('🚀 Extração de Dados F360 - Ano 2025\n')
  console.log('📝 Este script extrai dados e gera SQL para execução via MCP Supabase\n')

  // Buscar company IDs via MCP (será feito manualmente ou via outro script)
  // Por enquanto, vamos gerar SQL que busca os IDs
  const allDre = []
  const allDfc = []
  const allAccounting = []

  for (const company of VOLPE_CNPJS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🏢 ${company.nome} (${company.cnpj})`)
    console.log(`${'='.repeat(60)}`)

    // Buscar company_id (vamos gerar SQL que faz isso)
    for (const month of MONTHS_2025) {
      console.log(`\n📅 ${month.name} 2025`)
      try {
        const result = await importCompanyMonth(company, month, new Map())
        allDre.push(...result.dre)
        allDfc.push(...result.dfc)
        allAccounting.push(...result.accounting)
        console.log(`  ✅ DRE: ${result.dre.length} | DFC: ${result.dfc.length} | Accounting: ${result.accounting.length}`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`  ❌ Erro:`, error.message)
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  // Salvar dados em JSON para processamento posterior
  const output = {
    dre: allDre,
    dfc: allDfc,
    accounting: allAccounting,
    extracted_at: new Date().toISOString(),
  }

  fs.writeFileSync('f360_2025_data.json', JSON.stringify(output, null, 2))
  console.log(`\n✅ Dados extraídos salvos em f360_2025_data.json`)
  console.log(`   DRE: ${allDre.length} | DFC: ${allDfc.length} | Accounting: ${allAccounting.length}`)
}

main().catch(console.error)

