/**
 * Script de Importação F360 - Processa dados e gera SQL para inserção via MCP
 * 
 * Este script:
 * 1. Busca dados do F360
 * 2. Processa e valida
 * 3. Gera arquivo SQL para inserção
 * 4. O SQL pode ser executado via MCP Supabase
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

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

/**
 * Determinar natureza (receita/despesa) usando múltiplas estratégias
 * Melhorado para capturar corretamente receitas e despesas
 */
function determinarNatureza(entry) {
  // Estratégia 1: Tipo do Plano de Contas
  const tipoPlano = String(entry.TipoPlanoDeContas || '').toLowerCase()
  if (tipoPlano.includes('receber') || tipoPlano.includes('receita') || tipoPlano.includes('a receber')) {
    return 'receita'
  }
  if (tipoPlano.includes('pagar') || tipoPlano.includes('despesa') || tipoPlano.includes('a pagar')) {
    return 'despesa'
  }
  
  // Estratégia 2: Campo Tipo (pode ser boolean ou string)
  if (entry.Tipo === true || entry.Tipo === 'true' || String(entry.Tipo || '').toLowerCase() === 'receita') {
    return 'receita'
  }
  if (entry.Tipo === false || entry.Tipo === 'false' || String(entry.Tipo || '').toLowerCase() === 'despesa') {
    return 'despesa'
  }
  
  // Estratégia 3: Sinal do valor (ValorLcto positivo = receita, negativo = despesa)
  const valor = parseFloat(String(entry.ValorLcto || 0))
  if (valor > 0 && entry.ValorLctoOriginal === undefined) {
    // Se não temos indicadores claros e o valor é positivo, pode ser receita
    // Mas vamos usar outras estratégias primeiro
  }
  
  // Estratégia 4: Conta a Crédito vs Débito
  if (entry.ContaACredito && !entry.ContaADebito) {
    return 'receita'
  }
  if (entry.ContaADebito && !entry.ContaACredito) {
    return 'despesa'
  }
  
  // Estratégia 5: Nome da Conta (mais confiável - busca palavras-chave)
  const nomeConta = String(entry.NomePlanoDeContas || '').toLowerCase()
  const palavrasReceita = ['receita', 'venda', 'faturamento', 'vendas', 'vender', 'recebimento', 'receber', 'rendimento']
  const palavrasDespesa = ['despesa', 'custo', 'pagamento', 'pagar', 'gasto', 'compra', 'fornecedor']
  
  if (palavrasReceita.some(palavra => nomeConta.includes(palavra))) {
    return 'receita'
  }
  if (palavrasDespesa.some(palavra => nomeConta.includes(palavra))) {
    return 'despesa'
  }
  
  // Estratégia 6: Código da conta (contas 1xx-3xx geralmente são receitas, 4xx-6xx são despesas)
  const codigoConta = String(entry.ContaADebito || entry.ContaACredito || '').trim()
  if (codigoConta.match(/^[1-3]/)) {
    return 'receita'
  }
  if (codigoConta.match(/^[4-6]/)) {
    return 'despesa'
  }
  
  // Estratégia 7: Tipo de Título (se disponível)
  const tipoTitulo = String(entry.TipoTitulo || entry.Tipo || '').toLowerCase()
  if (tipoTitulo.includes('receber') || tipoTitulo.includes('receita')) {
    return 'receita'
  }
  if (tipoTitulo.includes('pagar') || tipoTitulo.includes('despesa')) {
    return 'despesa'
  }
  
  // Por padrão, usar sinal do valor como última instância
  // Valor positivo sem outros indicadores = assumir receita
  // Valor negativo ou zero = assumir despesa
  if (valor > 0) {
    // Log de warning para debug
    console.warn(`⚠️  Natureza não determinada claramente, assumindo receita (valor positivo):`, {
      conta: nomeConta,
      tipo: entry.Tipo,
      tipoPlano: tipoPlano,
      valor: valor
    })
    return 'receita'
  }
  
  // Default: despesa (mais comum em sistemas contábeis)
  return 'despesa'
}

function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL'
  return `'${String(str).replace(/'/g, "''").substring(0, 500)}'`
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

      // Normalizar data para formato YYYY-MM-DD
      let dateStr = competenciaDate.split('T')[0]
      if (dateStr.includes('/')) {
        // Converter DD/MM/YYYY para YYYY-MM-DD
        const [day, month, year] = dateStr.split('/')
        dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }

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
        let liquidacaoDate = entry.Liquidacao.split('T')[0]
        if (liquidacaoDate.includes('/')) {
          const [day, month, year] = liquidacaoDate.split('/')
          liquidacaoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
        
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

    const receitasCount = dreEntries.filter(e => e.natureza === 'receita').length
    const despesasCount = dreEntries.filter(e => e.natureza === 'despesa').length
    const totalReceitas = dreEntries.filter(e => e.natureza === 'receita').reduce((sum, e) => sum + e.valor, 0)
    const totalDespesas = dreEntries.filter(e => e.natureza === 'despesa').reduce((sum, e) => sum + e.valor, 0)
    
    const entradasCount = dfcEntries.filter(e => e.kind === 'in').length
    const saidasCount = dfcEntries.filter(e => e.kind === 'out').length
    const totalEntradas = dfcEntries.filter(e => e.kind === 'in').reduce((sum, e) => sum + e.amount, 0)
    const totalSaidas = dfcEntries.filter(e => e.kind === 'out').reduce((sum, e) => sum + e.amount, 0)
    
    console.log(`   📊 DRE: ${receitasCount} receitas (R$ ${totalReceitas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}), ${despesasCount} despesas (R$ ${totalDespesas.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`)
    console.log(`   💰 DFC: ${entradasCount} entradas (R$ ${totalEntradas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}), ${saidasCount} saídas (R$ ${totalSaidas.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`)

    return { dre: dreEntries, dfc: dfcEntries }
  } catch (error) {
    console.error(`   ❌ ${error.message}`)
    return { dre: [], dfc: [] }
  }
}

function gerarSQL(dreEntries, dfcEntries) {
  let sql = '-- SQL gerado para importação F360\n\n'
  
  // DRE Entries
  if (dreEntries.length > 0) {
    sql += '-- Inserir DRE entries\n'
    sql += 'INSERT INTO dre_entries (company_cnpj, date, account, natureza, valor, description, source_erp, source_id)\n'
    sql += 'VALUES\n'
    
    const dreValues = dreEntries.map(e => 
      `  (${escapeSQL(e.company_cnpj)}, ${escapeSQL(e.date)}, ${escapeSQL(e.account)}, ${escapeSQL(e.natureza)}, ${e.valor}, ${escapeSQL(e.description)}, ${escapeSQL(e.source_erp)}, ${escapeSQL(e.source_id)})`
    ).join(',\n')
    
    sql += dreValues + '\n'
    sql += 'ON CONFLICT (company_cnpj, date, account, natureza) DO UPDATE SET valor = EXCLUDED.valor;\n\n'
  }

  // DFC Entries
  if (dfcEntries.length > 0) {
    sql += '-- Inserir DFC entries\n'
    sql += 'INSERT INTO dfc_entries (company_cnpj, date, kind, category, amount, bank_account, description, source_erp, source_id)\n'
    sql += 'VALUES\n'
    
    const dfcValues = dfcEntries.map(e => 
      `  (${escapeSQL(e.company_cnpj)}, ${escapeSQL(e.date)}, ${escapeSQL(e.kind)}, ${escapeSQL(e.category)}, ${e.amount}, ${escapeSQL(e.bank_account)}, ${escapeSQL(e.description)}, ${escapeSQL(e.source_erp)}, ${escapeSQL(e.source_id)})`
    ).join(',\n')
    
    sql += dfcValues + '\n'
    sql += 'ON CONFLICT (company_cnpj, date, kind, category, bank_account) DO UPDATE SET amount = EXCLUDED.amount;\n\n'
  }

  return sql
}

async function main() {
  console.log('🚀 Processamento F360 para Importação via SQL\n')
  
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

  // Gerar SQL
  const sql = gerarSQL(allDreEntries, allDfcEntries)
  const sqlFile = path.join(process.cwd(), 'import_f360_generated.sql')
  fs.writeFileSync(sqlFile, sql)
  
  console.log(`\n✅ SQL gerado em: ${sqlFile}`)
  console.log(`   Execute este SQL via MCP Supabase para importar os dados`)
}

main().catch(console.error)

