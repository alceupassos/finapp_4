/**
 * Script de Importação F360 2025 via MCP Supabase
 * 
 * Este script importa dados do F360 e insere diretamente via MCP Supabase
 * para evitar problemas de schema cache.
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

// Mapeamento CNPJ -> Company ID (será preenchido via MCP)
const COMPANY_MAP = {
  '26888098000159': '39df3cf4-561f-4a3a-a8a2-fabf567f1cb9', // VOLPE MATRIZ
  '26888098000230': '1ba01bc7-d41c-4e9d-960f-1c4ed0be8852', // VOLPE ZOIAO
  '26888098000310': '84682a2d-4f20-4923-aa49-c1c500785445', // VOLPE MAUÁ
  '26888098000400': 'bc320d3e-7b2c-4409-81bf-638b7b76457f', // VOLPE DIADEMA
  '26888098000582': '6d93cc17-6db2-4bef-be52-654e45d0cef3', // VOLPE GRAJAÚ
  '26888098000663': 'b65f3484-83e2-4700-b9d4-b62ef310fff5', // VOLPE SANTO ANDRÉ
  '26888098000744': 'f5869bed-abb8-4155-b22f-0ae1f706876b', // VOLPE CAMPO LIMPO
  '26888098000825': 'd6142649-0588-4c08-be02-77c4a415130e', // VOLPE BRASILÂNDIA
  '26888098000906': '52f14a6a-7a19-4ef8-84fb-131c47215116', // VOLPE POÁ
  '26888098001040': 'f042d596-12a1-4478-b4e7-01649fc78b73', // VOLPE ITAIM
  '26888098001120': 'cbff3a6f-b772-4f35-a6d3-fe452341c0e4', // VOLPE PRAIA GRANDE
  '26888098001201': '67cb20db-3750-41c3-975a-fc39d7a8a055', // VOLPE ITANHAÉM
  '26888098001392': 'd1612628-5b69-4ce0-a1e8-a984f615b6fe', // VOLPE SÃO MATHEUS
}

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
    await f360Request(`/PublicRelatorioAPI/Download?id=${relatorioId}`)
    return 'Finalizado'
  } catch (error) {
    if (error.message?.includes("status 'Aguardando'")) return 'Aguardando'
    if (error.message?.includes("status 'Processando'")) return 'Processando'
    if (error.message?.includes("status 'Erro'")) return 'Erro'
    if (error.message?.includes('404')) return 'Aguardando'
    return 'Aguardando'
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

async function importCompanyMonth(cnpj, companyId, month) {
  const { name, start, end } = month
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
      account: account,
      account_code: entry.IdPlanoDeContas || null,
      natureza: natureza,
      valor: valor,
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

function generateSQLInsert(table, entries, conflictColumns) {
  if (entries.length === 0) return ''
  
  const columns = Object.keys(entries[0])
  const values = entries.map(e => {
    return '(' + columns.map(col => {
      const val = e[col]
      if (val === null || val === undefined) return 'NULL'
      if (typeof val === 'string') return escapeSql(val)
      if (typeof val === 'number') return val
      if (typeof val === 'boolean') return val ? 'true' : 'false'
      return escapeSql(String(val))
    }).join(', ') + ')'
  }).join(',\n    ')

  const conflictClause = conflictColumns 
    ? `ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET
      ${columns.filter(c => !conflictColumns.includes(c) && c !== 'created_at').map(c => `${c} = EXCLUDED.${c}`).join(',\n      ')},
      updated_at = NOW()`
    : ''

  return `
INSERT INTO ${table} (${columns.join(', ')})
VALUES
    ${values}
${conflictClause};
`
}

async function main() {
  console.log('🚀 Importação F360 2025 via MCP Supabase\n')
  console.log('📝 Este script gera SQL para execução via MCP Supabase\n')

  const allDre = []
  const allDfc = []
  const allAccounting = []

  // Processar apenas Outubro 2025 para teste inicial
  const testMonth = MONTHS_2025.find(m => m.month === 10)
  const testCompany = { cnpj: '26888098000159', nome: 'VOLPE MATRIZ' }
  const companyId = COMPANY_MAP[testCompany.cnpj]

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🏢 ${testCompany.nome} (${testCompany.cnpj})`)
  console.log(`${'='.repeat(60)}`)
  console.log(`\n📅 ${testMonth.name} 2025`)

  try {
    const result = await importCompanyMonth(testCompany.cnpj, companyId, testMonth)
    allDre.push(...result.dre)
    allDfc.push(...result.dfc)
    allAccounting.push(...result.accounting)
    console.log(`  ✅ DRE: ${result.dre.length} | DFC: ${result.dfc.length} | Accounting: ${result.accounting.length}`)
  } catch (error) {
    console.error(`  ❌ Erro:`, error.message)
  }

  // Gerar SQL
  console.log('\n📝 Gerando SQL para inserção...\n')
  
  const sqlDre = generateSQLInsert('dre_entries', allDre, ['company_cnpj', 'date', 'account', 'natureza'])
  const sqlDfc = generateSQLInsert('dfc_entries', allDfc, ['company_cnpj', 'date', 'kind', 'category', 'bank_account'])
  const sqlAccounting = generateSQLInsert('accounting_entries', allAccounting, null)

  if (sqlDre) {
    console.log('SQL DRE:')
    console.log(sqlDre.length > 500 ? sqlDre.substring(0, 500) + '...' : sqlDre)
    console.log('')
  }
  
  if (sqlDfc) {
    console.log('SQL DFC:')
    console.log(sqlDfc.length > 500 ? sqlDfc.substring(0, 500) + '...' : sqlDfc)
    console.log('')
  }
  
  if (sqlAccounting) {
    console.log('SQL Accounting:')
    console.log(sqlAccounting.length > 500 ? sqlAccounting.substring(0, 500) + '...' : sqlAccounting)
    console.log('')
  }

  // Salvar SQL completo
  const fullSQL = `-- Importação F360 2025 - ${testCompany.nome} - ${testMonth.name}\n\n${sqlDre}\n${sqlDfc}\n${sqlAccounting}`
  
  const fs = await import('fs')
  fs.writeFileSync('f360_import_test.sql', fullSQL)
  console.log('✅ SQL salvo em f360_import_test.sql')
  console.log(`\n📊 Resumo:`)
  console.log(`   DRE: ${allDre.length} registros`)
  console.log(`   DFC: ${allDfc.length} registros`)
  console.log(`   Accounting: ${allAccounting.length} registros`)
}

main().catch(console.error)

