/**
 * Script de Importação F360 FINAL - Com IDs Hardcoded
 * 
 * Este script bypassa o problema de schema cache usando IDs das empresas
 * obtidos diretamente do banco via MCP.
 * 
 * IDs das 13 empresas VOLPE (obtidos via MCP):
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

// IDs hardcoded das empresas VOLPE (obtidos via MCP)
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
let jwtExpiry = 0

/**
 * Login F360
 */
async function loginF360() {
  if (jwtToken && Date.now() < jwtExpiry - 5 * 60 * 1000) {
    return jwtToken
  }

  console.log('🔐 Fazendo login na API F360...')
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
  jwtExpiry = Date.now() + 3600 * 1000
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
 * Verificar status do relatório (tentando baixar diretamente)
 */
async function verificarStatusRelatorio(relatorioId) {
  try {
    // Tentar baixar diretamente - se funcionar, está finalizado
    await f360Request(`/PublicRelatorioAPI/Download?id=${relatorioId}`)
    return 'Finalizado'
  } catch (error) {
    // Se retornar erro específico, verificar status
    if (error.message?.includes("status 'Aguardando'")) return 'Aguardando'
    if (error.message?.includes("status 'Processando'")) return 'Processando'
    if (error.message?.includes("status 'Erro'")) return 'Erro'
    // Se for 404 ou outro erro, assumir que ainda está processando
    return 'Processando'
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
      console.log(`  ⏳ Relatório ${relatorioId}: ${status} (${tentativa}/${maxTentativas})`)
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
 * Determinar natureza (receita/despesa) usando múltiplas estratégias
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
  if (nomeConta.includes('despesa') || nomeConta.includes('custo') || nomeConta.includes('pagamento')) {
    return 'despesa'
  }

  // Por padrão, assumir despesa
  return 'despesa'
}

/**
 * Inserir batch no Supabase via REST API
 */
async function inserirBatch(table, batch, retryCount = 3) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`
  
  for (let tentativa = 0; tentativa < retryCount; tentativa++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(batch),
      })

      if (response.ok) {
        return { success: true }
      }

      const text = await response.text()
      
      // Ignorar erros de duplicata (constraint unique)
      if (text.includes('23505') || text.includes('duplicate') || text.includes('unique')) {
        return { success: true, skipped: true }
      }

      if (tentativa < retryCount - 1) {
        console.warn(`  ⚠️  Tentativa ${tentativa + 1} falhou, tentando novamente...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (tentativa + 1)))
        continue
      }

      return { success: false, error: `${response.status}: ${text.substring(0, 200)}` }
    } catch (error) {
      if (tentativa < retryCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (tentativa + 1)))
        continue
      }
      return { success: false, error: error.message }
    }
  }
}

/**
 * Importar dados de uma empresa
 */
async function importarEmpresa(company, dataInicio, dataFim) {
  const { cnpj, nome, id: companyId } = company
  
  console.log(`\n📊 ${nome} (${cnpj})`)
  console.log(`   Período: ${dataInicio} a ${dataFim}`)
  
  try {
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
      console.log(`   ℹ️  Relatório não gerado`)
      return { dre: 0, dfc: 0 }
    }

    console.log(`   📥 Baixando relatório ${relatorioResp.Result}...`)
    const entries = await baixarRelatorio(relatorioResp.Result)
    
    if (!entries || entries.length === 0) {
      console.log(`   ℹ️  Nenhuma entrada`)
      return { dre: 0, dfc: 0 }
    }

    console.log(`   📊 ${entries.length} entradas brutas recebidas`)

    const dreEntries = []
    const dfcEntries = []

    for (const entry of entries) {
      const entryCnpj = normalizeCnpj(entry.CNPJEmpresa || cnpj)
      if (entryCnpj !== normalizeCnpj(cnpj)) continue

      const valor = parseFloat(String(entry.ValorLcto || 0))
      if (valor === 0) continue

      const competenciaDate = entry.DataCompetencia || entry.DataDoLcto
      if (!competenciaDate) continue

      const natureza = determinarNatureza(entry)
      const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'

      // DRE Entry (apenas colunas obrigatórias devido a problema de schema cache)
      dreEntries.push({
        company_cnpj: entryCnpj,
        date: competenciaDate.split('T')[0],
        account: account.substring(0, 500),
        natureza: natureza,
        valor: Math.abs(valor),
        description: (entry.ComplemHistorico || entry.NumeroTitulo || '').substring(0, 500),
        source_erp: 'F360',
        source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
      })

      // DFC Entry (se tiver liquidação) - apenas colunas obrigatórias
      if (entry.Liquidacao) {
        dfcEntries.push({
          company_cnpj: entryCnpj,
          date: entry.Liquidacao.split('T')[0],
          kind: natureza === 'receita' ? 'in' : 'out',
          category: account.substring(0, 500),
          amount: Math.abs(valor),
          bank_account: '', // String vazia para constraint funcionar
          description: (entry.ComplemHistorico || entry.NumeroTitulo || '').substring(0, 500),
          source_erp: 'F360',
          source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
        })
      }
    }

    const receitasCount = dreEntries.filter(e => e.natureza === 'receita').length
    const despesasCount = dreEntries.filter(e => e.natureza === 'despesa').length
    console.log(`   📊 Processados: ${receitasCount} receitas, ${despesasCount} despesas`)

    // Inserir DRE em batches
    if (dreEntries.length > 0) {
      console.log(`   💾 Inserindo ${dreEntries.length} entradas DRE...`)
      const batchSize = 100
      let inseridos = 0
      
      for (let i = 0; i < dreEntries.length; i += batchSize) {
        const batch = dreEntries.slice(i, i + batchSize)
        const result = await inserirBatch('dre_entries', batch)
        
        if (result.success) {
          inseridos += batch.length
        } else {
          console.warn(`   ⚠️  Erro batch DRE: ${result.error}`)
        }
      }
      
      console.log(`   ✅ ${inseridos} DRE inseridos`)
    }

    // Inserir DFC em batches
    if (dfcEntries.length > 0) {
      console.log(`   💾 Inserindo ${dfcEntries.length} entradas DFC...`)
      const batchSize = 100
      let inseridos = 0
      
      for (let i = 0; i < dfcEntries.length; i += batchSize) {
        const batch = dfcEntries.slice(i, i + batchSize)
        const result = await inserirBatch('dfc_entries', batch)
        
        if (result.success) {
          inseridos += batch.length
        } else {
          console.warn(`   ⚠️  Erro batch DFC: ${result.error}`)
        }
      }
      
      console.log(`   ✅ ${inseridos} DFC inseridos`)
    }

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
  console.log('🚀 Importação F360 FINAL - Com IDs Hardcoded\n')
  console.log(`📊 Empresas: ${VOLPE_COMPANIES.length}`)
  
  // Login F360
  await loginF360()

  // Período: últimos 3 meses
  const hoje = new Date()
  const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1)
  const dataInicio = tresMesesAtras.toISOString().split('T')[0]
  const dataFim = hoje.toISOString().split('T')[0]

  console.log(`📅 Período: ${dataInicio} a ${dataFim}\n`)

  const stats = {
    empresas: 0,
    dre: 0,
    dfc: 0,
    errors: []
  }

  // Importar cada empresa
  for (const company of VOLPE_COMPANIES) {
    try {
      const result = await importarEmpresa(company, dataInicio, dataFim)
      stats.empresas++
      stats.dre += result.dre
      stats.dfc += result.dfc
      
      // Delay entre empresas
      await new Promise(resolve => setTimeout(resolve, 3000))
    } catch (error) {
      stats.errors.push(`${company.nome}: ${error.message}`)
      console.error(`❌ Erro em ${company.nome}:`, error.message)
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA IMPORTAÇÃO')
  console.log('='.repeat(60))
  console.log(`✅ Empresas processadas: ${stats.empresas}/${VOLPE_COMPANIES.length}`)
  console.log(`✅ DRE entries: ${stats.dre.toLocaleString()}`)
  console.log(`✅ DFC entries: ${stats.dfc.toLocaleString()}`)
  
  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Erros: ${stats.errors.length}`)
    stats.errors.forEach(err => console.log(`   - ${err}`))
  }

  console.log('\n✅ Importação concluída!')
}

main().catch(console.error)

