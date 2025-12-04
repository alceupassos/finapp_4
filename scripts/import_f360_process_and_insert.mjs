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
 * Carregar Plano de Contas da API F360 e criar Map para lookup
 * O Plano de Contas é a fonte mais confiável para classificação
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
 * Classificar DRE usando lookup no Plano de Contas (ESTRATÉGIA PRINCIPAL)
 * Com fallbacks para quando o plano não está disponível
 */
function classificarDRE(entry, planoMap) {
  // ESTRATÉGIA 1: Lookup no Plano de Contas por ID (MAIS CONFIAVEL)
  const planoId = entry.IdPlanoDeContas || entry.PlanoDeContasId
  if (planoId && planoMap.has(planoId)) {
    const plano = planoMap.get(planoId)
    if (plano.tipo === 'A receber') return 'receita'
    if (plano.tipo === 'A pagar') return 'despesa'
  }
  
  // ESTRATÉGIA 1b: Lookup no Plano de Contas por nome (quando ID não disponível)
  const nomeConta = String(entry.NomePlanoDeContas || '').trim()
  if (nomeConta && planoMap.size > 0) {
    // Buscar pelo nome exato ou parcial
    for (const [id, plano] of planoMap.entries()) {
      if (plano.nome === nomeConta || nomeConta.includes(plano.nome) || plano.nome.includes(nomeConta)) {
        if (plano.tipo === 'A receber') return 'receita'
        if (plano.tipo === 'A pagar') return 'despesa'
        break
      }
    }
  }
  
  // ESTRATÉGIA 2: Campo TipoPlanoDeContas (vem direto na entry)
  const tipoPlano = String(entry.TipoPlanoDeContas || entry.TipoLcto || entry.TipoTitulo || '').toLowerCase()
  if (tipoPlano.includes('receber') || tipoPlano === 'a receber') return 'receita'
  if (tipoPlano.includes('pagar') || tipoPlano === 'a pagar') return 'despesa'
  
  // ESTRATÉGIA 3: Campo Tipo (boolean - pode não estar presente ou estar incorreto)
  if (entry.Tipo === true) return 'receita'
  if (entry.Tipo === false) {
    // Se Tipo é false, pode ser despesa, mas vamos validar com código da conta
    // para evitar falsos positivos (já que diagnóstico mostrou 100% false)
  }
  
  // ESTRATÉGIA 4: Código da conta (XXX-X no início do nome)
  // nomeConta já foi definido acima
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
  
  // ESTRATÉGIA 5: Palavras-chave no nome da conta
  const nomeContaLower = nomeConta.toLowerCase()
  const keywordsReceita = ['receita', 'venda', 'faturamento', 'recebimento', 'rendimento', 'receber']
  const keywordsDespesa = ['despesa', 'custo', 'pagamento', 'pagar', 'salario', 'salário', 'fornecedor', 'compra']
  
  if (keywordsReceita.some(k => nomeContaLower.includes(k)) && !nomeContaLower.includes('cancelad')) {
    return 'receita'
  }
  if (keywordsDespesa.some(k => nomeContaLower.includes(k))) {
    return 'despesa'
  }
  
  // FALLBACK: Logar e retornar 'despesa' (mais comum) para revisão manual
  // Apenas logar se realmente não conseguiu classificar (evitar spam)
  const planoIdCheck = entry.IdPlanoDeContas || entry.PlanoDeContasId
  if (!planoIdCheck && !matchCodigo && nomeConta.length === 0) {
    console.warn('⚠️  Classificação indefinida, assumindo despesa:', {
      planoId: planoIdCheck || 'N/A',
      nomeConta: nomeConta.substring(0, 50) || 'N/A',
      tipo: entry.Tipo,
      tipoPlano: entry.TipoPlanoDeContas || 'N/A'
    })
  }
  return 'despesa'
}

/**
 * Classificar DFC usando mesma lógica da DRE
 */
function classificarDFC(entry, planoMap) {
  const natureza = classificarDRE(entry, planoMap)
  if (natureza === 'receita') return 'in'
  if (natureza === 'despesa') return 'out'
  return 'out' // Default para saída
}

/**
 * Determinar natureza (receita/despesa) - DEPRECATED
 * Mantido para compatibilidade, mas usar classificarDRE() no lugar
 */
function determinarNatureza(entry) {
  const valor = parseFloat(String(entry.ValorLcto || 0))
  
  // Estratégia 0: Campo Tipo (MAIS CONFIÁVEL na API F360)
  // true = A Receber (receita), false = A Pagar (despesa)
  if (entry.Tipo === true || entry.Tipo === 'true' || entry.Tipo === 1) {
    return 'receita'
  }
  if (entry.Tipo === false || entry.Tipo === 'false' || entry.Tipo === 0) {
    return 'despesa'
  }
  
  // Estratégia 1: Tipo do Plano de Contas (pode vir em diferentes campos)
  const tipoPlano = String(entry.TipoPlanoDeContas || entry.TipoLcto || entry.TipoTitulo || '').toLowerCase()
  if (tipoPlano.includes('a receber') || tipoPlano === 'a receber' || tipoPlano.includes('receber')) {
    return 'receita'
  }
  if (tipoPlano.includes('a pagar') || tipoPlano === 'a pagar' || tipoPlano.includes('pagar')) {
    return 'despesa'
  }
  
  // Estratégia 2: Código da conta (REGRA PRINCIPAL para F360)
  // Extrair código do NomePlanoDeContas (formato: "XXX-X - Nome da Conta")
  let codigoConta = ''
  const nomeConta = String(entry.NomePlanoDeContas || '')
  const matchCodigo = nomeConta.match(/^(\d{3}-\d)/)
  if (matchCodigo) {
    codigoConta = matchCodigo[1]
  } else {
    // Fallback: tentar ContaADebito ou ContaACredito
    const codigoContaDebito = String(entry.ContaADebito || '').trim()
    const codigoContaCredito = String(entry.ContaACredito || '').trim()
    // Remover texto "Plano de contas..." e extrair código
    const matchDeb = codigoContaDebito.match(/(\d{3}-\d)/)
    const matchCred = codigoContaCredito.match(/(\d{3}-\d)/)
    codigoConta = (matchDeb?.[1] || matchCred?.[1] || '').trim()
  }
  
  // Receitas: códigos começando com 1, 2 (impostos), 3
  if (codigoConta.match(/^(1|2[0-5]|3[0-2])/)) {
    // Verificar exceções (impostos são despesas)
    if (codigoConta.match(/^205-0/) || codigoConta.match(/^431-9/)) {
      return 'despesa'
    }
    return 'receita'
  }
  
  // Despesas: códigos começando com 4, 5, 6
  if (codigoConta.match(/^[4-6]/)) {
    return 'despesa'
  }
  
  // Estratégia 3: Nome da Conta com códigos específicos (já temos nomeConta acima)
  const nomeContaLower = nomeConta.toLowerCase()
  const codigoNoNome = codigoConta
  
  // Receitas específicas: 102-1 (vendas), 302-1 (receitas diversas), 303-4 (descontos obtidos)
  if (codigoNoNome.match(/^(102-1|302-1|303-4)/) && !nomeContaLower.includes('cancelad')) {
    return 'receita'
  }
  
  // Despesas específicas: 400-0 (CMV), 201-6 (salários), etc
  if (codigoNoNome.match(/^(400-0|201-|202-|203-|205-0|415-|417-|420-|421-|422-|424-|425-|431-5|431-9|432-|434-)/)) {
    return 'despesa'
  }
  
  // Estratégia 4: Palavras-chave no nome da conta
  const palavrasReceita = ['receita', 'venda', 'faturamento', 'vendas', 'vender', 'recebimento', 'receber', 'rendimento', 'fatura']
  const palavrasDespesa = ['despesa', 'custo', 'pagamento', 'pagar', 'gasto', 'compra', 'fornecedor', 'salário', 'salario', 'ordenado']
  
  if (palavrasReceita.some(palavra => nomeContaLower.includes(palavra)) && !nomeContaLower.includes('cancelad')) {
    return 'receita'
  }
  if (palavrasDespesa.some(palavra => nomeContaLower.includes(palavra))) {
    return 'despesa'
  }
  
  // Por padrão: se temos código de conta, usar regra genérica
  if (codigoConta) {
    // Contas 1xx-3xx geralmente são receitas (exceto impostos)
    if (codigoConta.match(/^[1-3]/) && !codigoConta.match(/^205-0|^431-9/)) {
      return 'receita'
    }
    // Contas 4xx-6xx são despesas
    if (codigoConta.match(/^[4-6]/)) {
      return 'despesa'
    }
  }
  
  // Último recurso: valor positivo sem indicadores claros = assumir receita
  if (valor > 0) {
    console.warn(`⚠️  Natureza não determinada claramente, assumindo receita:`, {
      conta: entry.NomePlanoDeContas,
      codigo: codigoConta,
      tipo: entry.Tipo,
      valor: valor
    })
    return 'receita'
  }
  
  // Default: despesa
  return 'despesa'
}

function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL'
  return `'${String(str).replace(/'/g, "''").substring(0, 500)}'`
}

async function importarEmpresa(company, dataInicio, dataFim, planoMap) {
  const { cnpj, nome } = company
  
  console.log(`\n📊 ${nome} (${cnpj})`)
  
  try {
    const relatorioResp = await f360Request('/PublicRelatorioAPI/GerarRelatorio', {
      method: 'POST',
      body: JSON.stringify({
        Data: dataInicio,
        DataFim: dataFim,
        ModeloContabil: 'obrigacao', // 'obrigacao' = data de pagamento, pode incluir mais receitas
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
    
    // Debug: amostra de entradas para análise
    if (entries.length > 0) {
      console.log(`   🔍 Debug - Primeira entrada (amostra):`, {
        TipoPlanoDeContas: entries[0].TipoPlanoDeContas,
        Tipo: entries[0].Tipo,
        NomePlanoDeContas: entries[0].NomePlanoDeContas?.substring(0, 50),
        ContaADebito: entries[0].ContaADebito,
        ContaACredito: entries[0].ContaACredito,
        ValorLcto: entries[0].ValorLcto,
      })
      
      // Contar tipos diferentes
      const tiposPlano = new Set()
      entries.slice(0, 50).forEach(e => {
        if (e.TipoPlanoDeContas) tiposPlano.add(e.TipoPlanoDeContas)
      })
      console.log(`   🔍 TiposPlanoDeContas encontrados (primeiros 50):`, Array.from(tiposPlano))
      
      // Contar códigos de conta
      const codigos = new Set()
      entries.slice(0, 50).forEach(e => {
        const cod = e.ContaADebito || e.ContaACredito
        if (cod) codigos.add(cod.substring(0, 5))
      })
      console.log(`   🔍 Códigos de conta (primeiros 5 chars):`, Array.from(codigos).slice(0, 20))
    }

    const dreEntries = []
    const dfcEntries = []
    
    let debugNaturezaCount = { receita: 0, despesa: 0, nao_determinado: 0 }

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
      // Se não tiver liquidação, usar data de competência
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
    console.log(`   🔍 Debug Natureza: receita=${debugNaturezaCount.receita}, despesa=${debugNaturezaCount.despesa}, nao_determinado=${debugNaturezaCount.nao_determinado}`)

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
  
  // Carregar Plano de Contas ANTES de processar empresas (para lookup)
  const planoMap = await loadPlanoDeContas()

  const hoje = new Date()
  const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1)
  const dataInicio = tresMesesAtras.toISOString().split('T')[0]
  const dataFim = hoje.toISOString().split('T')[0]

  console.log(`📅 Período: ${dataInicio} a ${dataFim}\n`)

  const allDreEntries = []
  const allDfcEntries = []

  for (const company of VOLPE_COMPANIES) {
    const result = await importarEmpresa(company, dataInicio, dataFim, planoMap)
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



