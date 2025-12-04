/**
 * Script de Importação F360 via Fetch direto
 * Usa chamadas diretas à API REST do Supabase
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Configuração')
console.log('=' .repeat(60))
console.log(`   URL: ${SUPABASE_URL}`)
console.log(`   Key: ${SUPABASE_KEY ? SUPABASE_KEY.substring(0, 30) + '...' : 'AUSENTE'}`)

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

let jwtToken = null

/**
 * Supabase REST request
 */
async function supabaseRest(method, endpoint, body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`
  
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=minimal,resolution=merge-duplicates' : 'return=representation',
    },
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  const response = await fetch(url, options)
  
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Supabase ${method} ${endpoint}: ${response.status} - ${text}`)
  }
  
  if (response.status === 204 || method === 'POST') return null
  return response.json()
}

/**
 * Supabase RPC call
 */
async function supabaseRpc(functionName, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`RPC ${functionName}: ${response.status} - ${text}`)
  }
  
  return response.json()
}

/**
 * Login F360
 */
async function loginF360() {
  if (jwtToken) return jwtToken

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
 * Baixar relatório
 */
async function baixarRelatorio(relatorioId, maxTentativas = 30) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const response = await f360Request(`/PublicRelatorioAPI/Download?id=${relatorioId}`)
      if (Array.isArray(response)) return response
      if (typeof response === 'object') return [response]
      throw new Error('Formato inesperado')
    } catch (error) {
      if (error.message?.includes('Aguardando') || error.message?.includes('Processando')) {
        console.log(`  ⏳ Aguardando relatório... (${tentativa}/${maxTentativas})`)
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

/**
 * Buscar company_id via select direto
 */
async function getCompanyId(cnpj) {
  const normalizedCnpj = normalizeCnpj(cnpj)
  
  // Usar select com filtro
  const url = `${SUPABASE_URL}/rest/v1/companies?cnpj=eq.${normalizedCnpj}&select=id`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.warn(`⚠️  Erro ao buscar empresa ${cnpj}: ${response.status} - ${text}`)
    return null
  }

  const data = await response.json()
  if (Array.isArray(data) && data.length > 0) {
    return data[0].id
  }
  
  console.warn(`⚠️  Empresa não encontrada: ${cnpj}`)
  return null
}

/**
 * Importar dados
 */
async function importarEmpresa(company, companyId, dataInicio, dataFim) {
  const { cnpj, nome } = company
  
  console.log(`\n📊 Importando ${nome} (${cnpj})`)
  
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

      const natureza = determinarNatureza(entry)
      const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'

      dreEntries.push({
        company_id: companyId,
        company_cnpj: entryCnpj,
        date: competenciaDate.split('T')[0],
        account: account,
        account_code: entry.IdPlanoDeContas || null,
        natureza: natureza,
        valor: Math.abs(valor),
        description: (entry.ComplemHistorico || entry.NumeroTitulo || '').substring(0, 500),
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
    console.log(`   📊 ${receitasCount} receitas, ${despesasCount} despesas`)

    // Inserir DRE
    if (dreEntries.length > 0) {
      console.log(`   💾 Inserindo ${dreEntries.length} DRE...`)
      const batchSize = 100
      for (let i = 0; i < dreEntries.length; i += batchSize) {
        const batch = dreEntries.slice(i, i + batchSize)
        try {
          const url = `${SUPABASE_URL}/rest/v1/dre_entries`
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(batch),
          })
          if (!resp.ok) {
            const text = await resp.text()
            if (!text.includes('duplicate')) {
              console.warn(`   ⚠️  Batch DRE: ${resp.status}`)
            }
          }
        } catch (err) {
          console.warn(`   ⚠️  Erro batch: ${err.message}`)
        }
      }
    }

    // Inserir DFC
    if (dfcEntries.length > 0) {
      console.log(`   💾 Inserindo ${dfcEntries.length} DFC...`)
      const batchSize = 100
      for (let i = 0; i < dfcEntries.length; i += batchSize) {
        const batch = dfcEntries.slice(i, i + batchSize)
        try {
          const url = `${SUPABASE_URL}/rest/v1/dfc_entries`
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(batch),
          })
          if (!resp.ok) {
            const text = await resp.text()
            if (!text.includes('duplicate')) {
              console.warn(`   ⚠️  Batch DFC: ${resp.status}`)
            }
          }
        } catch (err) {
          console.warn(`   ⚠️  Erro batch DFC: ${err.message}`)
        }
      }
    }

    console.log(`   ✅ OK: ${dreEntries.length} DRE, ${dfcEntries.length} DFC`)
    return { dre: dreEntries.length, dfc: dfcEntries.length }
  } catch (error) {
    console.error(`   ❌ ${error.message}`)
    return { dre: 0, dfc: 0 }
  }
}

async function main() {
  console.log('\n🚀 Importação F360 via Fetch\n')

  // Login F360
  await loginF360()

  // Período
  const hoje = new Date()
  const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1)
  const dataInicio = tresMesesAtras.toISOString().split('T')[0]
  const dataFim = hoje.toISOString().split('T')[0]

  console.log(`📅 Período: ${dataInicio} a ${dataFim}`)

  const stats = { empresas: 0, dre: 0, dfc: 0 }

  for (const company of VOLPE_CNPJS) {
    const companyId = await getCompanyId(company.cnpj)
    if (!companyId) {
      console.log(`\n⚠️  ${company.nome} não encontrada`)
      continue
    }

    const result = await importarEmpresa(company, companyId, dataInicio, dataFim)
    stats.empresas++
    stats.dre += result.dre
    stats.dfc += result.dfc

    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO')
  console.log(`✅ Empresas: ${stats.empresas}`)
  console.log(`✅ DRE: ${stats.dre}`)
  console.log(`✅ DFC: ${stats.dfc}`)
  console.log('\n✅ Importação concluída!')
}

main().catch(console.error)

