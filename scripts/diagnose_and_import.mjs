/**
 * Script de Diagnóstico e Importação F360 
 * 
 * Este script:
 * 1. Verifica a conexão com Supabase
 * 2. Verifica se as empresas VOLPE existem
 * 3. Importa dados financeiros corretamente
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Diagnóstico de Conexão Supabase')
console.log('=' .repeat(60))
console.log(`   URL: ${SUPABASE_URL ? '✅ Configurada' : '❌ Ausente'}`)
console.log(`   Service Role Key: ${SUPABASE_KEY ? '✅ Configurada (' + SUPABASE_KEY.substring(0, 20) + '...)' : '❌ Ausente'}`)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌ Variáveis de ambiente não configuradas!')
  process.exit(1)
}

// Cliente Supabase com service_role
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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

let jwtToken = null
let jwtExpiry = 0

/**
 * Login F360
 */
async function loginF360() {
  if (jwtToken && Date.now() < jwtExpiry - 5 * 60 * 1000) {
    return jwtToken
  }

  console.log('\n🔐 Fazendo login na API F360...')
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
  jwtExpiry = Date.now() + 3600 * 1000 // 1 hora
  console.log('✅ Login F360 OK')
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
 * Normalizar CNPJ
 */
function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

/**
 * Determinar natureza (receita/despesa) 
 */
function determinarNatureza(entry) {
  // Estratégia 1: TipoPlanoDeContas (mais confiável)
  const tipoPlano = String(entry.TipoPlanoDeContas || '').toLowerCase()
  if (tipoPlano.includes('receber') || tipoPlano.includes('receita')) {
    return 'receita'
  }
  if (tipoPlano.includes('pagar') || tipoPlano.includes('despesa')) {
    return 'despesa'
  }

  // Estratégia 2: Campo Tipo (true = receita, false = despesa)
  if (entry.Tipo === true || entry.Tipo === 'true') {
    return 'receita'
  }
  if (entry.Tipo === false || entry.Tipo === 'false') {
    return 'despesa'
  }

  // Estratégia 3: ContaACredito vs ContaADebito
  if (entry.ContaACredito && !entry.ContaADebito) {
    return 'receita'
  }
  if (entry.ContaADebito && !entry.ContaACredito) {
    return 'despesa'
  }

  // Estratégia 4: Nome da conta (heurística)
  const nomeConta = String(entry.NomePlanoDeContas || '').toLowerCase()
  if (nomeConta.includes('receita') || nomeConta.includes('venda') || nomeConta.includes('faturamento')) {
    return 'receita'
  }

  // Por padrão, assumir despesa
  return 'despesa'
}

/**
 * Verificar conexão com Supabase e empresas
 */
async function verificarConexao() {
  console.log('\n🔍 Verificando conexão com Supabase...')
  
  // Testar select simples
  const { data, error } = await supabase
    .from('companies')
    .select('id, cnpj, razao_social')
    .limit(3)
  
  if (error) {
    console.error('❌ Erro ao conectar:', error.message)
    console.error('   Código:', error.code)
    console.error('   Detalhes:', error.details)
    console.error('   Hint:', error.hint)
    return false
  }
  
  console.log(`✅ Conexão OK - ${data?.length || 0} empresas retornadas (amostra)`)
  
  // Verificar empresas VOLPE
  console.log('\n🔍 Verificando empresas VOLPE no banco...')
  const { data: volpeData, error: volpeError } = await supabase
    .from('companies')
    .select('id, cnpj, razao_social')
    .like('cnpj', '26888098%')
  
  if (volpeError) {
    console.error('❌ Erro ao buscar VOLPE:', volpeError.message)
    return false
  }
  
  console.log(`✅ ${volpeData?.length || 0} empresas VOLPE encontradas`)
  if (volpeData && volpeData.length > 0) {
    volpeData.forEach(c => console.log(`   - ${c.cnpj}: ${c.razao_social}`))
  }
  
  return volpeData || []
}

/**
 * Importar dados de uma empresa
 */
async function importarEmpresa(company, companyId, dataInicio, dataFim) {
  const { cnpj, nome } = company
  
  console.log(`\n📊 Importando ${nome} (${cnpj})`)
  console.log(`   Período: ${dataInicio} a ${dataFim}`)
  
  try {
    // Gerar relatório
    const relatorioId = await f360Request('/PublicRelatorioAPI/GerarRelatorio', {
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

    if (!relatorioId.Result) {
      throw new Error('Relatório não gerado')
    }

    console.log(`   📥 Baixando relatório ${relatorioId.Result}...`)
    const entries = await baixarRelatorio(relatorioId.Result)
    
    if (!Array.isArray(entries) || entries.length === 0) {
      console.log(`   ℹ️  Nenhuma entrada encontrada`)
      return { dre: 0, dfc: 0 }
    }

    console.log(`   📊 ${entries.length} entradas brutas recebidas`)

    const dreEntries = []
    const dfcEntries = []
    let receitasCount = 0
    let despesasCount = 0

    for (const entry of entries) {
      const entryCnpj = normalizeCnpj(entry.CNPJEmpresa || cnpj)
      if (entryCnpj !== normalizeCnpj(cnpj)) continue

      const valor = parseFloat(String(entry.ValorLcto || 0))
      if (valor === 0) continue

      const competenciaDate = entry.DataCompetencia || entry.DataDoLcto
      if (!competenciaDate) continue

      const natureza = determinarNatureza(entry)
      if (natureza === 'receita') receitasCount++
      else despesasCount++

      const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'

      // DRE Entry
      dreEntries.push({
        company_id: companyId,
        company_cnpj: entryCnpj,
        date: competenciaDate.split('T')[0],
        account: account,
        account_code: entry.IdPlanoDeContas || null,
        natureza: natureza,
        valor: Math.abs(valor),
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
          amount: Math.abs(valor),
          bank_account: '',
          description: entry.ComplemHistorico || entry.NumeroTitulo || '',
          source_erp: 'F360',
          source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
        })
      }
    }

    console.log(`   📊 Processados: ${receitasCount} receitas, ${despesasCount} despesas`)

    // Inserir DRE
    if (dreEntries.length > 0) {
      console.log(`   💾 Inserindo ${dreEntries.length} entradas DRE...`)
      const batchSize = 500
      for (let i = 0; i < dreEntries.length; i += batchSize) {
        const batch = dreEntries.slice(i, i + batchSize)
        const { error } = await supabase
          .from('dre_entries')
          .upsert(batch, { 
            onConflict: 'company_cnpj,date,account,natureza',
            ignoreDuplicates: false 
          })
        
        if (error) {
          console.warn(`   ⚠️  Erro batch DRE: ${error.message}`)
        }
      }
    }

    // Inserir DFC
    if (dfcEntries.length > 0) {
      console.log(`   💾 Inserindo ${dfcEntries.length} entradas DFC...`)
      const batchSize = 500
      for (let i = 0; i < dfcEntries.length; i += batchSize) {
        const batch = dfcEntries.slice(i, i + batchSize)
        const { error } = await supabase
          .from('dfc_entries')
          .upsert(batch, { 
            onConflict: 'company_cnpj,date,kind,category,bank_account',
            ignoreDuplicates: false 
          })
        
        if (error) {
          console.warn(`   ⚠️  Erro batch DFC: ${error.message}`)
        }
      }
    }

    console.log(`   ✅ DRE: ${dreEntries.length} | DFC: ${dfcEntries.length}`)
    return { dre: dreEntries.length, dfc: dfcEntries.length }
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}`)
    return { dre: 0, dfc: 0 }
  }
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Diagnóstico e Importação F360\n')
  
  // 1. Verificar conexão
  const volpeEmpresas = await verificarConexao()
  if (!volpeEmpresas || volpeEmpresas.length === 0) {
    console.error('\n❌ Nenhuma empresa VOLPE encontrada no banco!')
    console.error('   Verifique se as empresas estão cadastradas na tabela companies')
    return
  }

  // Criar mapa de CNPJ -> ID
  const cnpjToId = new Map()
  volpeEmpresas.forEach(e => cnpjToId.set(normalizeCnpj(e.cnpj), e.id))

  // 2. Login F360
  await loginF360()

  // 3. Definir período (últimos 3 meses)
  const hoje = new Date()
  const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1)
  const dataInicio = tresMesesAtras.toISOString().split('T')[0]
  const dataFim = hoje.toISOString().split('T')[0]

  console.log(`\n📅 Período de importação: ${dataInicio} a ${dataFim}`)

  // 4. Importar cada empresa
  const stats = {
    empresas: 0,
    dre: 0,
    dfc: 0
  }

  for (const volpeCompany of VOLPE_CNPJS) {
    const companyId = cnpjToId.get(normalizeCnpj(volpeCompany.cnpj))
    if (!companyId) {
      console.log(`\n⚠️  ${volpeCompany.nome} não encontrada no banco, pulando...`)
      continue
    }

    const result = await importarEmpresa(volpeCompany, companyId, dataInicio, dataFim)
    stats.empresas++
    stats.dre += result.dre
    stats.dfc += result.dfc

    // Delay entre empresas
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  // 5. Resumo
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA IMPORTAÇÃO')
  console.log('='.repeat(60))
  console.log(`✅ Empresas processadas: ${stats.empresas}`)
  console.log(`✅ DRE entries: ${stats.dre}`)
  console.log(`✅ DFC entries: ${stats.dfc}`)

  // 6. Validar
  console.log('\n🔍 Validando dados importados...')
  const { data: dreStats } = await supabase
    .from('dre_entries')
    .select('natureza')
    .like('company_cnpj', '26888098%')
  
  if (dreStats) {
    const receitas = dreStats.filter(r => r.natureza === 'receita').length
    const despesas = dreStats.filter(r => r.natureza === 'despesa').length
    console.log(`   DRE: ${dreStats.length} total (${receitas} receitas, ${despesas} despesas)`)
  }

  const { count: dfcCount } = await supabase
    .from('dfc_entries')
    .select('*', { count: 'exact', head: true })
    .like('company_cnpj', '26888098%')
  
  console.log(`   DFC: ${dfcCount || 0} registros`)

  console.log('\n✅ Importação concluída!')
}

main().catch(console.error)

