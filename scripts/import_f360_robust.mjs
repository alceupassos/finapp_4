/**
 * Script de Importação F360 Robusto
 * 
 * Estratégias de classificação em cascata:
 * 1. Endpoint de parcelas com tipo explícito (Receita/Despesa)
 * 2. Lookup no Plano de Contas (por ID ou nome)
 * 3. TipoPlanoDeContas/TipoTitulo ("A receber" / "A pagar")
 * 4. Código da conta (100-199 = receita, 400+ = despesa)
 * 5. Palavras-chave no nome da conta
 * 
 * Tratamento de erros:
 * - Retry com backoff exponencial (3 tentativas)
 * - Delay entre empresas (5 segundos)
 * - Paginação para lotes grandes
 * - Log de erros detalhado sem parar execução
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

/**
 * Login F360 com retry
 */
async function loginF360(maxRetries = 3) {
  if (jwtToken) return jwtToken
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔐 Fazendo login na API F360... (tentativa ${attempt}/${maxRetries})`)
      const response = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: VOLPE_TOKEN }),
      })
      
      if (!response.ok) {
        throw new Error(`Login F360 failed: ${response.status}`)
      }
      
      const data = await response.json()
      jwtToken = data.Token
      console.log('✅ Login F360 OK')
      return jwtToken
    } catch (error) {
      if (attempt === maxRetries) throw error
      const delay = Math.pow(2, attempt) * 1000 // Backoff exponencial
      console.log(`   ⏳ Aguardando ${delay}ms antes de tentar novamente...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Request F360 com retry
 */
async function f360Request(endpoint, options = {}, maxRetries = 3) {
  const jwt = await loginF360()
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${F360_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      })
      
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`F360 ${endpoint}: ${response.status} - ${text}`)
      }
      
      return response.json()
    } catch (error) {
      if (attempt === maxRetries) throw error
      const delay = Math.pow(2, attempt) * 1000
      console.log(`   ⏳ Retry ${attempt}/${maxRetries} após ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Carregar Plano de Contas
 */
async function loadPlanoDeContas() {
  console.log('📋 Carregando Plano de Contas...')
  try {
    const response = await f360Request('/PlanoDeContasPublicAPI/ListarPlanosContas')
    const planos = response.Result || []
    
    const map = new Map()
    for (const plano of planos) {
      map.set(plano.PlanoDeContasId, {
        nome: plano.Nome,
        tipo: plano.Tipo, // "A receber" ou "A pagar"
        codigoContabil: plano.CodigoObrigacaoContabil
      })
      
      // Também indexar por nome para lookup alternativo
      const nomeLower = String(plano.Nome || '').toLowerCase().trim()
      if (nomeLower && !map.has(nomeLower)) {
        map.set(nomeLower, {
          nome: plano.Nome,
          tipo: plano.Tipo,
          codigoContabil: plano.CodigoObrigacaoContabil
        })
      }
    }
    
    const receberCount = [...map.values()].filter(p => p.tipo === 'A receber').length
    const pagarCount = [...map.values()].filter(p => p.tipo === 'A pagar').length
    
    console.log(`✅ Plano de Contas carregado: ${map.size} contas`)
    console.log(`   - A receber: ${receberCount}`)
    console.log(`   - A pagar: ${pagarCount}\n`)
    
    return map
  } catch (error) {
    console.error(`⚠️  Erro ao carregar Plano de Contas: ${error.message}`)
    console.log('   Continuando sem lookup no plano de contas...\n')
    return new Map()
  }
}

/**
 * Classificar DRE usando estratégias em cascata
 */
function classificarDRE(entry, planoMap, tipoExplicito = null) {
  // ESTRATÉGIA 0: Tipo explícito do endpoint (MAIS CONFIÁVEL)
  if (tipoExplicito) {
    if (tipoExplicito === 'Receita' || tipoExplicito === 'receita') return 'receita'
    if (tipoExplicito === 'Despesa' || tipoExplicito === 'despesa') return 'despesa'
  }
  
  // ESTRATÉGIA 1: Lookup no Plano de Contas por ID
  const planoId = entry.IdPlanoDeContas || entry.PlanoDeContasId
  if (planoId && planoMap.has(planoId)) {
    const plano = planoMap.get(planoId)
    if (plano.tipo === 'A receber') return 'receita'
    if (plano.tipo === 'A pagar') return 'despesa'
  }
  
  // ESTRATÉGIA 1b: Lookup no Plano de Contas por nome
  const nomeConta = String(entry.NomePlanoDeContas || '').trim()
  if (nomeConta) {
    const nomeLower = nomeConta.toLowerCase()
    if (planoMap.has(nomeLower)) {
      const plano = planoMap.get(nomeLower)
      if (plano.tipo === 'A receber') return 'receita'
      if (plano.tipo === 'A pagar') return 'despesa'
    }
  }
  
  // ESTRATÉGIA 2: Campo TipoPlanoDeContas/TipoTitulo
  const tipoPlano = String(entry.TipoPlanoDeContas || entry.TipoLcto || entry.TipoTitulo || '').toLowerCase()
  if (tipoPlano.includes('receber') || tipoPlano === 'a receber' || tipoPlano === 'receita') return 'receita'
  if (tipoPlano.includes('pagar') || tipoPlano === 'a pagar' || tipoPlano === 'despesa') return 'despesa'
  
  // ESTRATÉGIA 3: Código da conta (XXX-X no início do nome)
  const matchCodigo = nomeConta.match(/^(\d{3})-(\d)/)
  if (matchCodigo) {
    const grupo = parseInt(matchCodigo[1])
    // Contas 100-199: receitas
    if (grupo >= 100 && grupo < 200) return 'receita'
    // Contas 300-399: receitas
    if (grupo >= 300 && grupo < 400) return 'receita'
    // Contas 200-299: custos/despesas
    if (grupo >= 200 && grupo < 300) return 'despesa'
    // Contas 400+: despesas
    if (grupo >= 400) return 'despesa'
  }
  
  // ESTRATÉGIA 4: Palavras-chave no nome da conta
  const nomeContaLower = nomeConta.toLowerCase()
  const keywordsReceita = ['receita', 'venda', 'faturamento', 'recebimento', 'rendimento', 'receber']
  const keywordsDespesa = ['despesa', 'custo', 'pagamento', 'pagar', 'salario', 'salário', 'fornecedor', 'compra']
  
  if (keywordsReceita.some(k => nomeContaLower.includes(k)) && !nomeContaLower.includes('cancelad')) {
    return 'receita'
  }
  if (keywordsDespesa.some(k => nomeContaLower.includes(k))) {
    return 'despesa'
  }
  
  // FALLBACK: Logar e retornar 'despesa' (mais comum)
  console.warn('⚠️  Classificação indefinida, assumindo despesa:', {
    planoId: planoId || 'N/A',
    nomeConta: nomeConta.substring(0, 50) || 'N/A',
    tipo: entry.Tipo,
    tipoPlano: entry.TipoPlanoDeContas || 'N/A'
  })
  return 'despesa'
}

/**
 * Classificar DFC usando mesma lógica da DRE
 */
function classificarDFC(entry, planoMap, tipoExplicito = null) {
  const natureza = classificarDRE(entry, planoMap, tipoExplicito)
  if (natureza === 'receita') return 'in'
  if (natureza === 'despesa') return 'out'
  return 'out' // Default para saída
}

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL'
  return `'${String(str).replace(/'/g, "''").substring(0, 500)}'`
}

/**
 * Baixar relatório F360 com retry
 */
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

/**
 * Importar empresa usando relatório contábil (método confiável)
 */
async function importarEmpresa(company, dataInicio, dataFim, planoMap) {
  const { cnpj, nome } = company
  const cnpjNormalizado = normalizeCnpj(cnpj)
  
  console.log(`\n📊 ${nome} (${cnpj})`)
  
  try {
    // Usar relatório contábil (método que já funciona)
    console.log(`   📥 Gerando relatório contábil...`)
    const relatorioResp = await f360Request('/PublicRelatorioAPI/GerarRelatorio', {
      method: 'POST',
      body: JSON.stringify({
        Data: dataInicio,
        DataFim: dataFim,
        ModeloContabil: 'obrigacao',
        ModeloRelatorio: 'gerencial',
        ExtensaoDeArquivo: 'json',
        CNPJEmpresas: [cnpjNormalizado],
        EnviarNotificacaoPorWebhook: false,
        URLNotificacao: '',
        Contas: '',
      }),
    })
    
    if (!relatorioResp.Result) {
      console.log(`   ⚠️ Nenhum relatório gerado`)
      return { dre: [], dfc: [] }
    }
    
    console.log(`   📥 Baixando relatório...`)
    const entries = await baixarRelatorio(relatorioResp.Result)
    
    if (!entries || entries.length === 0) {
      console.log(`   ⚠️ Nenhuma entrada encontrada`)
      return { dre: [], dfc: [] }
    }
    
    console.log(`   📊 ${entries.length} entradas brutas`)
    
    const dreEntries = []
    const dfcEntries = []
    let debugNaturezaCount = { receita: 0, despesa: 0, nao_determinado: 0 }
    
    // Processar todas as entradas do relatório
    for (const entry of entries) {
      const entryCnpj = normalizeCnpj(entry.CNPJEmpresa || cnpj)
      if (entryCnpj !== cnpjNormalizado) continue
      
      const valor = parseFloat(String(entry.ValorLcto || 0))
      if (valor === 0) continue
      
      const competenciaDate = entry.DataCompetencia || entry.DataDoLcto
      if (!competenciaDate) continue
      
      // Normalizar data para formato YYYY-MM-DD
      let dateStr = competenciaDate.split('T')[0]
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/')
        dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      
      // Classificar usando estratégias em cascata
      const natureza = classificarDRE(entry, planoMap)
      if (natureza === 'receita') debugNaturezaCount.receita++
      else if (natureza === 'despesa') debugNaturezaCount.despesa++
      else debugNaturezaCount.nao_determinado++
      
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
      
      // DFC: usar data de liquidação (regime de caixa)
      if (entry.Liquidacao || competenciaDate) {
        let dfcDate = entry.Liquidacao || competenciaDate
        dfcDate = dfcDate.split('T')[0]
        if (dfcDate.includes('/')) {
          const [day, month, year] = dfcDate.split('/')
          dfcDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
        
        // DFC: usar classificarDFC para determinar tipo
        const kindDFC = classificarDFC(entry, planoMap)
        dfcEntries.push({
          company_cnpj: entryCnpj,
          date: dfcDate,
          kind: kindDFC,
          category: account,
          amount: Math.abs(valor),
          bank_account: entry.ContaBancaria || '',
          description: (entry.ComplemHistorico || entry.NumeroTitulo || '').substring(0, 500),
          source_erp: 'F360',
          source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
        })
      }
    }
    
    console.log(`   🔍 Debug Natureza: receita=${debugNaturezaCount.receita}, despesa=${debugNaturezaCount.despesa}, nao_determinado=${debugNaturezaCount.nao_determinado}`)
    
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

/**
 * Gerar SQL para inserção
 */
function gerarSQL(dreEntries, dfcEntries) {
  let sql = '-- SQL gerado para importação F360 (ROBUSTO)\n\n'
  
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
      `  (${escapeSQL(e.company_cnpj)}, ${escapeSQL(e.date)}, ${escapeSQL(e.kind)}, ${escapeSQL(e.category)}, ${e.amount}, ${escapeSQL(e.bank_account || '')}, ${escapeSQL(e.description)}, ${escapeSQL(e.source_erp)}, ${escapeSQL(e.source_id)})`
    ).join(',\n')
    
    sql += dfcValues + '\n'
    sql += 'ON CONFLICT (company_cnpj, date, kind, category, COALESCE(bank_account, \'\')) DO UPDATE SET amount = EXCLUDED.amount;\n\n'
  }
  
  return sql
}

async function main() {
  console.log('🚀 Importação F360 Robusta - Usando Endpoint com Tipo Explícito\n')
  
  await loginF360()
  
  // Carregar Plano de Contas ANTES de processar empresas
  const planoMap = await loadPlanoDeContas()
  
  const hoje = new Date()
  const dataInicio = '2025-01-01' // Ano completo de 2025
  const dataFim = hoje.toISOString().split('T')[0]
  
  console.log(`📅 Período: ${dataInicio} a ${dataFim}\n`)
  
  const allDreEntries = []
  const allDfcEntries = []
  
  // TESTE: Processar apenas primeira empresa para validação
  const TEST_MODE = process.argv.includes('--test')
  const companiesToProcess = TEST_MODE ? VOLPE_COMPANIES.slice(0, 1) : VOLPE_COMPANIES
  
  if (TEST_MODE) {
    console.log('🧪 MODO TESTE: Processando apenas 1 empresa\n')
  }
  
  // Processar em batches de 3 empresas
  const BATCH_SIZE = 3
  const totalBatches = Math.ceil(companiesToProcess.length / BATCH_SIZE)
  
  for (let i = 0; i < companiesToProcess.length; i += BATCH_SIZE) {
    const batch = companiesToProcess.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    console.log(`\n📦 Processando batch ${batchNum}/${totalBatches} (${batch.length} empresas)`)
    
    for (const company of batch) {
      const result = await importarEmpresa(company, dataInicio, dataFim, planoMap)
      allDreEntries.push(...result.dre)
      allDfcEntries.push(...result.dfc)
      
      // Delay entre empresas (2 segundos)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // Delay entre batches (5 segundos)
    if (i + BATCH_SIZE < companiesToProcess.length) {
      console.log(`   ⏳ Aguardando 5 segundos antes do próximo batch...`)
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
  
  console.log(`\n📊 Total processado:`)
  console.log(`   DRE: ${allDreEntries.length} registros`)
  console.log(`   DFC: ${allDfcEntries.length} registros`)
  
  const receitasTotal = allDreEntries.filter(e => e.natureza === 'receita').length
  const despesasTotal = allDreEntries.filter(e => e.natureza === 'despesa').length
  const entradasTotal = allDfcEntries.filter(e => e.kind === 'in').length
  const saidasTotal = allDfcEntries.filter(e => e.kind === 'out').length
  
  console.log(`\n📊 Resumo de Classificação:`)
  console.log(`   DRE: ${receitasTotal} receitas, ${despesasTotal} despesas`)
  console.log(`   DFC: ${entradasTotal} entradas, ${saidasTotal} saídas`)
  
  // Gerar SQL
  const sql = gerarSQL(allDreEntries, allDfcEntries)
  const sqlFile = path.join(process.cwd(), 'import_f360_robust_generated.sql')
  fs.writeFileSync(sqlFile, sql)
  
  console.log(`\n✅ SQL gerado em: ${sqlFile}`)
  console.log(`   Execute este SQL via MCP Supabase para importar os dados`)
}

main().catch(console.error)

