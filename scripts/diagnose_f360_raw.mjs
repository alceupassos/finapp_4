/**
 * Script de Diagnóstico F360 - Inspeciona estrutura do JSON bruto
 * 
 * Este script:
 * 1. Faz login na API F360
 * 2. Gera relatório para 1 empresa
 * 3. Analisa estrutura dos campos retornados
 * 4. Mostra estatísticas de classificação
 */

import dotenv from 'dotenv'

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

async function diagnosticarJSON(cnpj = '26888098000159') {
  console.log(`\n📊 Diagnóstico F360 - Empresa: ${cnpj}\n`)
  
  const dataInicio = '2025-09-01'
  const dataFim = '2025-09-30'
  
  console.log(`📅 Período: ${dataInicio} a ${dataFim}`)
  
  // Gerar relatório
  console.log('📥 Gerando relatório...')
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
  
  console.log(`✅ Relatório gerado: ${relatorioResp.Result}`)
  console.log('📥 Baixando relatório...')
  
  const entries = await baixarRelatorio(relatorioResp.Result)
  
  console.log(`\n✅ ${entries.length} entradas recebidas\n`)
  
  if (entries.length === 0) {
    console.log('⚠️  Nenhuma entrada encontrada')
    return
  }
  
  // AMOSTRA DE 10 ENTRADAS
  console.log('=== AMOSTRA DE CAMPOS (10 primeiras) ===\n')
  entries.slice(0, 10).forEach((e, i) => {
    console.log(`Entry ${i + 1}:`)
    console.log('  Tipo:', e.Tipo, `(${typeof e.Tipo})`)
    console.log('  TipoPlanoDeContas:', e.TipoPlanoDeContas)
    console.log('  TipoLcto:', e.TipoLcto)
    console.log('  TipoTitulo:', e.TipoTitulo)
    console.log('  IdPlanoDeContas:', e.IdPlanoDeContas)
    console.log('  PlanoDeContasId:', e.PlanoDeContasId)
    console.log('  NomePlanoDeContas:', e.NomePlanoDeContas?.substring(0, 60))
    console.log('  ContaADebito:', e.ContaADebito?.substring(0, 40))
    console.log('  ContaACredito:', e.ContaACredito?.substring(0, 40))
    console.log('  ValorLcto:', e.ValorLcto)
    console.log('  CNPJEmpresa:', e.CNPJEmpresa)
    console.log('')
  })
  
  // ESTATÍSTICAS
  console.log('=== ESTATÍSTICAS GERAIS ===\n')
  
  const stats = {
    total: entries.length,
    tipoTrue: entries.filter(e => e.Tipo === true).length,
    tipoFalse: entries.filter(e => e.Tipo === false).length,
    tipoUndefined: entries.filter(e => e.Tipo === undefined || e.Tipo === null).length,
    tipoPlanoAReceber: entries.filter(e => {
      const tipo = String(e.TipoPlanoDeContas || '').toLowerCase()
      return tipo.includes('receber') || tipo === 'a receber'
    }).length,
    tipoPlanoAPagar: entries.filter(e => {
      const tipo = String(e.TipoPlanoDeContas || '').toLowerCase()
      return tipo.includes('pagar') || tipo === 'a pagar'
    }).length,
    tipoPlanoUndefined: entries.filter(e => !e.TipoPlanoDeContas || e.TipoPlanoDeContas === '').length,
    idPlanoPresente: entries.filter(e => e.IdPlanoDeContas || e.PlanoDeContasId).length,
    idPlanoAusente: entries.filter(e => !e.IdPlanoDeContas && !e.PlanoDeContasId).length,
    valorPositivo: entries.filter(e => parseFloat(e.ValorLcto || 0) > 0).length,
    valorNegativo: entries.filter(e => parseFloat(e.ValorLcto || 0) < 0).length,
    valorZero: entries.filter(e => parseFloat(e.ValorLcto || 0) === 0).length,
  }
  
  console.log(`Total de entradas: ${stats.total}`)
  console.log(`\nCampo Tipo (boolean):`)
  console.log(`  - true: ${stats.tipoTrue} (${(stats.tipoTrue / stats.total * 100).toFixed(1)}%)`)
  console.log(`  - false: ${stats.tipoFalse} (${(stats.tipoFalse / stats.total * 100).toFixed(1)}%)`)
  console.log(`  - undefined/null: ${stats.tipoUndefined} (${(stats.tipoUndefined / stats.total * 100).toFixed(1)}%)`)
  
  console.log(`\nCampo TipoPlanoDeContas (string):`)
  console.log(`  - "A receber": ${stats.tipoPlanoAReceber} (${(stats.tipoPlanoAReceber / stats.total * 100).toFixed(1)}%)`)
  console.log(`  - "A pagar": ${stats.tipoPlanoAPagar} (${(stats.tipoPlanoAPagar / stats.total * 100).toFixed(1)}%)`)
  console.log(`  - undefined/vazio: ${stats.tipoPlanoUndefined} (${(stats.tipoPlanoUndefined / stats.total * 100).toFixed(1)}%)`)
  
  console.log(`\nCampo IdPlanoDeContas:`)
  console.log(`  - Presente: ${stats.idPlanoPresente} (${(stats.idPlanoPresente / stats.total * 100).toFixed(1)}%)`)
  console.log(`  - Ausente: ${stats.idPlanoAusente} (${(stats.idPlanoAusente / stats.total * 100).toFixed(1)}%)`)
  
  console.log(`\nValorLcto (sinal):`)
  console.log(`  - Positivo: ${stats.valorPositivo} (${(stats.valorPositivo / stats.total * 100).toFixed(1)}%)`)
  console.log(`  - Negativo: ${stats.valorNegativo} (${(stats.valorNegativo / stats.total * 100).toFixed(1)}%)`)
  console.log(`  - Zero: ${stats.valorZero} (${(stats.valorZero / stats.total * 100).toFixed(1)}%)`)
  
  // AMOSTRA DE TODOS OS VALORES ÚNICOS DE TipoPlanoDeContas
  console.log(`\n=== VALORES ÚNICOS DE TipoPlanoDeContas ===\n`)
  const tiposUnicos = new Set()
  entries.forEach(e => {
    if (e.TipoPlanoDeContas) tiposUnicos.add(e.TipoPlanoDeContas)
  })
  console.log(Array.from(tiposUnicos).slice(0, 20).join(', '))
  if (tiposUnicos.size > 20) {
    console.log(`... e mais ${tiposUnicos.size - 20} valores únicos`)
  }
  
  // AMOSTRA DE CÓDIGOS DE CONTA (primeiros caracteres)
  console.log(`\n=== CÓDIGOS DE CONTA (amostra) ===\n`)
  const codigosConta = new Set()
  entries.slice(0, 50).forEach(e => {
    const nome = e.NomePlanoDeContas || e.ContaADebito || e.ContaACredito || ''
    const match = nome.match(/^(\d{3}-\d)/)
    if (match) codigosConta.add(match[1])
  })
  console.log(Array.from(codigosConta).slice(0, 30).sort().join(', '))
}

async function main() {
  try {
    await loginF360()
    await diagnosticarJSON()
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

main()

