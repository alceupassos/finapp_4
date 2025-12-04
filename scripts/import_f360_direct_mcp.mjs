/**
 * Script de Importação F360 - Inserção Direta via MCP
 * 
 * Processa dados do F360 e insere diretamente via MCP Supabase em batches
 */

import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

const VOLPE_COMPANIES = [
  { cnpj: '26888098000159', nome: 'VOLPE MATRIZ', id: '39df3cf4-561f-4a3a-a8a2-fabf567f1cb9' },
  { cnpj: '26888098000230', nome: 'VOLPE ZOIAO', id: '1ba01bc7-d41c-4e9d-960f-1c4ed0be8852' },
  { cnpj: '26888098000310', nome: 'VOLPE MAUÁ', id: '84682a2d-4f20-4923-aa49-c1c500785445' },
  { cnpj: '26888098000400', nome: 'VOLPE DIADEMA', id: 'bc320d3e-7b2c-4409-81bf-638b7b76457f' },
  { cnpj: '26888098000582', nome: 'VOLPE GRAJAÚ', id: '6d93cc17-6db2-4bef-be52-654e45d0cef3' },
  { cnpj: '26888098000663', nome: 'VOLPE SANTO ANDRÉ', id: 'b65f3484-83e2-4700-b9d4-b62ef310fff5' },
  { cnpj: '26888098000744', nome: 'VOLPE CAMPO LIMPO', id: 'f5869bed-abb8-4155-b22f-0ae1f706876b' },
  { cnpj: '26888098000825', nome: 'VOLPE BRASILÂNDIA', id: 'd6142649-0588-4c08-be02-77c4a415130e' },
  { cnpj: '26888098000906', nome: 'VOLPE POÁ', id: '52f14a6a-7a19-4ef8-84fb-131c47215116' },
  { cnpj: '26888098001040', nome: 'VOLPE ITAIM', id: 'f042d596-12a1-4478-b4e7-01649fc78b73' },
  { cnpj: '26888098001120', nome: 'VOLPE PRAIA GRANDE', id: 'cbff3a6f-b772-4f35-a6d3-fe452341c0e4' },
  { cnpj: '26888098001201', nome: 'VOLPE ITANHAÉM', id: '67cb20db-3750-41c3-975a-fc39d7a8a055' },
  { cnpj: '26888098001392', nome: 'VOLPE SÃO MATHEUS', id: 'd1612628-5b69-4ce0-a1e8-a984f615b6fe' },
]

let jwtToken = null

async function loginF360() {
  if (jwtToken) return jwtToken
  console.log('🔐 Fazendo login na API F360...')
  const response = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: VOLPE_TOKEN }),
  })
  if (!response.ok) throw new Error(`Login F360 failed: ${response.status}`)
  const data = await response.json()
  jwtToken = data.Token
  console.log('✅ Login F360 OK')
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

async function baixarRelatorio(relatorioId, maxTentativas = 30) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const response = await f360Request(`/PublicRelatorioAPI/Download?id=${relatorioId}`)
      if (Array.isArray(response)) return response
      if (typeof response === 'object') return [response]
      throw new Error('Formato inesperado')
    } catch (error) {
      if (error.message?.includes("status 'Aguardando'") || error.message?.includes("status 'Processando'")) {
        console.log(`  ⏳ Aguardando... (${tentativa}/${maxTentativas})`)
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }
      throw error
    }
  }
  throw new Error(`Relatório não disponível após ${maxTentativas} tentativas`)
}

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

function determinarNatureza(entry) {
  const tipoPlano = String(entry.TipoPlanoDeContas || '').toLowerCase()
  if (tipoPlano.includes('receber') || tipoPlano.includes('receita')) return 'receita'
  if (tipoPlano.includes('pagar') || tipoPlano.includes('despesa')) return 'despesa'
  if (entry.Tipo === true) return 'receita'
  if (entry.Tipo === false) return 'despesa'
  if (entry.ContaACredito && !entry.ContaADebito) return 'receita'
  if (entry.ContaADebito && !entry.ContaACredito) return 'despesa'
  const nomeConta = String(entry.NomePlanoDeContas || '').toLowerCase()
  if (nomeConta.includes('receita') || nomeConta.includes('venda')) return 'receita'
  return 'despesa'
}

function formatDate(dateStr) {
  if (!dateStr) return null
  if (dateStr.includes('T')) return dateStr.split('T')[0]
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return dateStr
}

function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL'
  return `'${String(str).replace(/'/g, "''").substring(0, 500)}'`
}

function removerDuplicatas(entries, table) {
  const seen = new Map()
  const unique = []
  
  for (const entry of entries) {
    let key
    if (table === 'dre_entries') {
      key = `${entry.company_cnpj}|${entry.date}|${entry.account}|${entry.natureza}`
    } else if (table === 'dfc_entries') {
      key = `${entry.company_cnpj}|${entry.date}|${entry.kind}|${entry.category}|${entry.bank_account || ''}`
    }
    
    if (!seen.has(key)) {
      seen.set(key, entry)
      unique.push(entry)
    } else {
      // Se já existe, somar o valor
      const existing = seen.get(key)
      if (table === 'dre_entries') {
        existing.valor += entry.valor
      } else {
        existing.amount += entry.amount
      }
    }
  }
  
  return unique
}

function gerarSQLBatch(table, entries, batchSize = 500) {
  // Remover duplicatas primeiro
  const uniqueEntries = removerDuplicatas(entries, table)
  
  const batches = []
  for (let i = 0; i < uniqueEntries.length; i += batchSize) {
    const batch = uniqueEntries.slice(i, i + batchSize)
    let sql = ''
    
    if (table === 'dre_entries') {
      sql = 'INSERT INTO dre_entries (company_cnpj, date, account, natureza, valor, description, source_erp, source_id)\nVALUES\n'
      const values = batch.map(e => 
        `  (${escapeSQL(e.company_cnpj)}, ${escapeSQL(e.date)}, ${escapeSQL(e.account)}, ${escapeSQL(e.natureza)}, ${e.valor}, ${escapeSQL(e.description)}, ${escapeSQL(e.source_erp)}, ${escapeSQL(e.source_id)})`
      ).join(',\n')
      sql += values + '\nON CONFLICT (company_cnpj, date, account, natureza) DO UPDATE SET valor = EXCLUDED.valor;'
    } else if (table === 'dfc_entries') {
      sql = 'INSERT INTO dfc_entries (company_cnpj, date, kind, category, amount, bank_account, description, source_erp, source_id)\nVALUES\n'
      const values = batch.map(e => 
        `  (${escapeSQL(e.company_cnpj)}, ${escapeSQL(e.date)}, ${escapeSQL(e.kind)}, ${escapeSQL(e.category)}, ${e.amount}, ${escapeSQL(e.bank_account)}, ${escapeSQL(e.description)}, ${escapeSQL(e.source_erp)}, ${escapeSQL(e.source_id)})`
      ).join(',\n')
      sql += values + '\nON CONFLICT (company_cnpj, date, kind, category, bank_account) DO UPDATE SET amount = EXCLUDED.amount;'
    }
    
    batches.push(sql)
  }
  return batches
}

async function importarEmpresa(company, dataInicio, dataFim) {
  const { cnpj, nome } = company
  
  console.log(`\n📊 ${nome} (${cnpj})`)
  
  try {
    const relatorioResp = await f360Request('/PublicRelatorioAPI/GerarRelatorio', {
      method: 'POST',
      body: JSON.stringify({
        Data: dataInicio,
        DataFim: dataFim,
        ModeloContabil: 'provisao',
        ModeloRelatorio: 'gerencial',
        ExtensaoDeArquivo: 'json',
        CNPJEmpresas: [normalizeCnpj(cnpj)],
        EnviarNotificacaoPorWebhook: false,
        URLNotificacao: '',
        Contas: '',
      }),
    })

    if (!relatorioResp.Result) {
      return { dre: [], dfc: [] }
    }

    console.log(`   📥 Baixando relatório...`)
    const entries = await baixarRelatorio(relatorioResp.Result)
    
    if (!entries || entries.length === 0) {
      return { dre: [], dfc: [] }
    }

    console.log(`   📊 ${entries.length} entradas brutas`)

    const dreEntries = []
    const dfcEntries = []

    for (const entry of entries) {
      const entryCnpj = normalizeCnpj(entry.CNPJEmpresa || cnpj)
      if (entryCnpj !== normalizeCnpj(cnpj)) continue

      const valor = parseFloat(String(entry.ValorLcto || 0))
      if (valor === 0) continue

      const competenciaDate = entry.DataCompetencia || entry.DataDoLcto
      if (!competenciaDate) continue

      const dateStr = formatDate(competenciaDate)
      if (!dateStr) continue

      const natureza = determinarNatureza(entry)
      const account = (entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros').substring(0, 500)

      dreEntries.push({
        company_cnpj: entryCnpj,
        date: dateStr,
        account: account,
        natureza: natureza,
        valor: Math.abs(valor),
        description: (entry.ComplemHistorico || entry.NumeroTitulo || '').substring(0, 500),
        source_erp: 'F360',
        source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
      })

      if (entry.Liquidacao) {
        const liquidacaoDate = formatDate(entry.Liquidacao)
        if (liquidacaoDate) {
          dfcEntries.push({
            company_cnpj: entryCnpj,
            date: liquidacaoDate,
            kind: natureza === 'receita' ? 'in' : 'out',
            category: account,
            amount: Math.abs(valor),
            bank_account: '',
            description: (entry.ComplemHistorico || entry.NumeroTitulo || '').substring(0, 500),
            source_erp: 'F360',
            source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
          })
        }
      }
    }

    const receitasCount = dreEntries.filter(e => e.natureza === 'receita').length
    const despesasCount = dreEntries.filter(e => e.natureza === 'despesa').length
    console.log(`   📊 ${receitasCount} receitas, ${despesasCount} despesas`)

    return { dre: dreEntries, dfc: dfcEntries }
  } catch (error) {
    console.error(`   ❌ ${error.message}`)
    return { dre: [], dfc: [] }
  }
}

async function main() {
  console.log('🚀 Importação F360 - Processamento para MCP\n')
  
  await loginF360()

  const hoje = new Date()
  const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1)
  const dataInicio = tresMesesAtras.toISOString().split('T')[0]
  const dataFim = hoje.toISOString().split('T')[0]

  console.log(`📅 Período: ${dataInicio} a ${dataFim}\n`)

  const allDreEntries = []
  const allDfcEntries = []

  for (const company of VOLPE_COMPANIES) {
    const result = await importarEmpresa(company, dataInicio, dataFim)
    allDreEntries.push(...result.dre)
    allDfcEntries.push(...result.dfc)
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log(`\n📊 Total processado:`)
  console.log(`   DRE: ${allDreEntries.length}`)
  console.log(`   DFC: ${allDfcEntries.length}`)

  // Gerar SQL em batches
  const dreBatches = gerarSQLBatch('dre_entries', allDreEntries, 500)
  const dfcBatches = gerarSQLBatch('dfc_entries', allDfcEntries, 500)

  console.log(`\n📝 SQL gerado em ${dreBatches.length} batches DRE e ${dfcBatches.length} batches DFC`)
  console.log(`   Execute os batches via MCP Supabase para importar os dados`)
  
  // Salvar batches em arquivos
  dreBatches.forEach((batch, i) => {
    fs.writeFileSync(`import_dre_batch_${i + 1}.sql`, batch)
  })
  dfcBatches.forEach((batch, i) => {
    fs.writeFileSync(`import_dfc_batch_${i + 1}.sql`, batch)
  })
  
  console.log(`   Arquivos salvos: import_dre_batch_*.sql e import_dfc_batch_*.sql`)
}

main().catch(console.error)

