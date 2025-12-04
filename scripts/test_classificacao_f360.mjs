/**
 * Script de Teste - Classificação F360 com Plano de Contas
 * Testa a classificação com apenas 1 empresa e 50 registros
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Importar funções do script principal
const scriptPath = path.join(process.cwd(), 'scripts/import_f360_process_and_insert.mjs')
const scriptContent = fs.readFileSync(scriptPath, 'utf-8')

// Executar script principal mas modificar para testar apenas 1 empresa
dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

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

async function loadPlanoDeContas() {
  console.log('📋 Carregando Plano de Contas...')
  try {
    const response = await f360Request('/PlanoDeContasPublicAPI/ListarPlanosContas')
    const planos = response.Result || []
    
    const map = new Map()
    for (const plano of planos) {
      map.set(plano.PlanoDeContasId, {
        nome: plano.Nome,
        tipo: plano.Tipo,
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
    return new Map()
  }
}

function classificarDRE(entry, planoMap) {
  const planoId = entry.IdPlanoDeContas || entry.PlanoDeContasId
  if (planoId && planoMap.has(planoId)) {
    const plano = planoMap.get(planoId)
    if (plano.tipo === 'A receber') return 'receita'
    if (plano.tipo === 'A pagar') return 'despesa'
  }
  
  const tipoPlano = String(entry.TipoPlanoDeContas || entry.TipoLcto || entry.TipoTitulo || '').toLowerCase()
  if (tipoPlano.includes('receber') || tipoPlano === 'a receber') return 'receita'
  if (tipoPlano.includes('pagar') || tipoPlano === 'a pagar') return 'despesa'
  
  if (entry.Tipo === true) return 'receita'
  
  const nomeConta = String(entry.NomePlanoDeContas || '')
  const matchCodigo = nomeConta.match(/^(\d{3})-(\d)/)
  if (matchCodigo) {
    const grupo = parseInt(matchCodigo[1])
    if (grupo >= 100 && grupo < 200) return 'receita'
    if (grupo >= 300 && grupo < 400) return 'receita'
    if (grupo >= 200 && grupo < 300) return 'despesa'
    if (grupo >= 400) return 'despesa'
  }
  
  const nomeContaLower = nomeConta.toLowerCase()
  const keywordsReceita = ['receita', 'venda', 'faturamento', 'recebimento', 'rendimento', 'receber']
  const keywordsDespesa = ['despesa', 'custo', 'pagamento', 'pagar', 'salario', 'salário', 'fornecedor', 'compra']
  
  if (keywordsReceita.some(k => nomeContaLower.includes(k)) && !nomeContaLower.includes('cancelad')) {
    return 'receita'
  }
  if (keywordsDespesa.some(k => nomeContaLower.includes(k))) {
    return 'despesa'
  }
  
  return 'despesa'
}

async function main() {
  console.log('🧪 Teste de Classificação F360 com Plano de Contas\n')
  
  await loginF360()
  const planoMap = await loadPlanoDeContas()
  
  const cnpj = '26888098000159'
  const dataInicio = '2025-09-01'
  const dataFim = '2025-09-30'
  
  console.log(`📊 Testando empresa: ${cnpj}`)
  console.log(`📅 Período: ${dataInicio} a ${dataFim}\n`)
  
  // Gerar relatório
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
    console.error('❌ Falha ao gerar relatório')
    return
  }
  
  console.log('📥 Baixando relatório...')
  const entries = await baixarRelatorio(relatorioResp.Result)
  
  // Limitar a 50 entradas para teste
  const testEntries = entries.slice(0, 50)
  console.log(`\n📊 Testando com ${testEntries.length} entradas (primeiras 50)\n`)
  
  const stats = {
    receita: 0,
    despesa: 0,
    receitaByPlano: 0,
    despesaByPlano: 0,
    receitaByCodigo: 0,
    despesaByCodigo: 0,
    receitaByKeyword: 0,
    despesaByKeyword: 0
  }
  
  console.log('=== CLASSIFICAÇÃO DETALHADA (primeiras 10) ===\n')
  
  for (let i = 0; i < Math.min(10, testEntries.length); i++) {
    const entry = testEntries[i]
    const natureza = classificarDRE(entry, planoMap)
    
    const planoId = entry.IdPlanoDeContas || entry.PlanoDeContasId
    const planoInfo = planoId && planoMap.has(planoId) ? planoMap.get(planoId) : null
    const metodo = planoInfo ? `Plano (${planoInfo.tipo})` : 'Fallback'
    
    console.log(`${i + 1}. ${entry.NomePlanoDeContas?.substring(0, 50)}`)
    console.log(`   → ${natureza.toUpperCase()} (método: ${metodo})`)
    console.log(`   → Valor: R$ ${parseFloat(entry.ValorLcto || 0).toLocaleString('pt-BR')}`)
    console.log(`   → IdPlano: ${planoId || 'N/A'}`)
    console.log('')
    
    if (natureza === 'receita') stats.receita++
    if (natureza === 'despesa') stats.despesa++
    if (planoInfo && planoInfo.tipo === 'A receber') stats.receitaByPlano++
    if (planoInfo && planoInfo.tipo === 'A pagar') stats.despesaByPlano++
  }
  
  // Estatísticas gerais
  for (const entry of testEntries) {
    const natureza = classificarDRE(entry, planoMap)
    if (natureza === 'receita') stats.receita++
    if (natureza === 'despesa') stats.despesa++
  }
  
  console.log('\n=== ESTATÍSTICAS ===\n')
  console.log(`Total de entradas testadas: ${testEntries.length}`)
  console.log(`Receitas classificadas: ${stats.receita} (${(stats.receita / testEntries.length * 100).toFixed(1)}%)`)
  console.log(`Despesas classificadas: ${stats.despesa} (${(stats.despesa / testEntries.length * 100).toFixed(1)}%)`)
  
  const totalReceitas = testEntries
    .filter(e => classificarDRE(e, planoMap) === 'receita')
    .reduce((sum, e) => sum + parseFloat(e.ValorLcto || 0), 0)
  const totalDespesas = testEntries
    .filter(e => classificarDRE(e, planoMap) === 'despesa')
    .reduce((sum, e) => sum + parseFloat(e.ValorLcto || 0), 0)
  
  console.log(`\nValores:`)
  console.log(`Receitas: R$ ${totalReceitas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`)
  console.log(`Despesas: R$ ${totalDespesas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`)
  
  console.log(`\n✅ Teste concluído!`)
}

main().catch(console.error)

