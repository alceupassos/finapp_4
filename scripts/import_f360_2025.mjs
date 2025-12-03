import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 13 empresas do Grupo Volpe
const VOLPE_CNPJS = [
  '26888098000159',
  '26888098000230',
  '26888098000310',
  '26888098000400',
  '26888098000582',
  '26888098000663',
  '26888098000744',
  '26888098000825',
  '26888098000906',
  '26888098001040',
  '26888098001120',
  '26888098001201',
  '26888098001392'
]

const F360_BASE_URL = 'https://financas.f360.com.br'
const F360_LOGIN_TOKEN = process.env.F360_LOGIN_TOKEN

// Cache de JWT (válido por 1 hora)
let jwtCache = { token: null, expiresAt: 0 }

async function loginF360() {
  if (jwtCache.token && Date.now() < jwtCache.expiresAt) {
    return jwtCache.token
  }

  if (!F360_LOGIN_TOKEN) {
    throw new Error('F360_LOGIN_TOKEN não configurado no .env.local')
  }

  const res = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: F360_LOGIN_TOKEN })
  })

  if (!res.ok) {
    throw new Error(`F360 login failed: ${res.status}`)
  }

  const data = await res.json()
  const token = data.Token || data.token

  if (!token) {
    throw new Error('F360 login não retornou token')
  }

  // Cache por 55 minutos (antes de expirar)
  jwtCache = {
    token,
    expiresAt: Date.now() + 55 * 60 * 1000
  }

  return token
}

async function fetchF360(endpoint, params = {}) {
  const jwt = await loginF360()
  const url = new URL(`${F360_BASE_URL}/${endpoint.replace(/^\//, '')}`)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${jwt}` }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${endpoint} ${res.status}: ${text}`)
  }

  const data = await res.json()
  return Array.isArray(data) ? data : (data.Result || data.data || [])
}

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '').padStart(14, '0')
}

function transformToDRE(parcelas, cnpj) {
  const dreMap = new Map()
  
  for (const parcela of parcelas) {
    const date = parcela.DataEmissao || parcela.Data || parcela.data
    if (!date) continue

    const account = parcela.PlanoDeContas || parcela.planoDeContas || parcela.account || 'Outros'
    const natureza = parcela.Tipo === 'Receita' || parcela.tipo === 'receber' ? 'receita' : 'despesa'
    const valor = Number(parcela.Valor || parcela.valor || 0)

    const key = `${date}_${account}_${natureza}`
    const existing = dreMap.get(key)
    
    if (existing) {
      existing.valor += valor
    } else {
      dreMap.set(key, {
        company_cnpj: normalizeCnpj(cnpj),
        date: date.split('T')[0], // YYYY-MM-DD
        account: String(account),
        nature: natureza,
        natureza: natureza,
        amount: valor,
        valor: valor
      })
    }
  }

  return Array.from(dreMap.values())
}

function transformToDFC(parcelas, cnpj) {
  const dfcMap = new Map()
  
  for (const parcela of parcelas) {
    const date = parcela.DataLiquidacao || parcela.Data || parcela.data
    if (!date) continue

    const category = parcela.Categoria || parcela.categoria || 'Operacional'
    const kind = parcela.Tipo === 'Receita' || parcela.tipo === 'receber' ? 'in' : 'out'
    const amount = Number(parcela.Valor || parcela.valor || 0)
    const bankAccount = parcela.ContaBancaria || parcela.contaBancaria || null

    const key = `${date}_${category}_${kind}`
    const existing = dfcMap.get(key)
    
    if (existing) {
      existing.amount += amount
    } else {
      dfcMap.set(key, {
        company_cnpj: normalizeCnpj(cnpj),
        date: date.split('T')[0],
        kind: kind,
        category: String(category),
        amount: amount,
        bank_account: bankAccount
      })
    }
  }

  return Array.from(dfcMap.values())
}

async function importMonth(cnpj, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  console.log(`📥 Importando ${cnpj} - ${startDate} a ${endDate}`)

  try {
    // Buscar parcelas de títulos
    const parcelas = await fetchF360('ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos', {
      cnpj: cnpj,
      tipo: 'Ambos',
      tipoDatas: 'Emissão',
      inicio: startDate,
      fim: endDate,
      pagina: 1
    })

    if (!Array.isArray(parcelas) || parcelas.length === 0) {
      console.log(`⚠️  Nenhuma parcela encontrada para ${cnpj} em ${startDate}`)
      return { dre: 0, dfc: 0 }
    }

    // Transformar para DRE e DFC
    const dreRows = transformToDRE(parcelas, cnpj)
    const dfcRows = transformToDFC(parcelas, cnpj)

    // Inserir DRE
    if (dreRows.length > 0) {
      const { error: dreError } = await supabase
        .from('dre_entries')
        .upsert(dreRows, { onConflict: 'company_cnpj,date,account' })
      
      if (dreError) {
        console.error(`❌ Erro ao inserir DRE para ${cnpj}:`, dreError)
      } else {
        console.log(`✅ ${dreRows.length} registros DRE inseridos`)
      }
    }

    // Inserir DFC
    if (dfcRows.length > 0) {
      const { error: dfcError } = await supabase
        .from('cashflow_entries')
        .upsert(dfcRows, { onConflict: 'company_cnpj,date,kind,category' })
      
      if (dfcError) {
        console.error(`❌ Erro ao inserir DFC para ${cnpj}:`, dfcError)
      } else {
        console.log(`✅ ${dfcRows.length} registros DFC inseridos`)
      }
    }

    // Popular tabela consolidada dre_dfc_summaries
    if (dreRows.length > 0 || dfcRows.length > 0) {
      const summaries = []
      const summaryMap = new Map()

      // Processar DRE
      for (const entry of dreRows) {
        const date = new Date(entry.date)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const key = `${entry.company_cnpj}_${year}_${month}_${entry.account}_${entry.natureza}`

        if (summaryMap.has(key)) {
          summaryMap.get(key).dre_value += Number(entry.valor || 0)
        } else {
          summaryMap.set(key, {
            company_cnpj: entry.company_cnpj,
            period_year: year,
            period_month: month,
            account: entry.account,
            category: entry.natureza,
            dre_value: Number(entry.valor || 0),
            dfc_in: 0,
            dfc_out: 0,
            bank_account: null
          })
        }
      }

      // Processar DFC
      for (const entry of dfcRows) {
        const date = new Date(entry.date)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const key = `${entry.company_cnpj}_${year}_${month}_${entry.category}_${entry.kind}_${entry.bank_account || ''}`

        if (summaryMap.has(key)) {
          const existing = summaryMap.get(key)
          if (entry.kind === 'in') {
            existing.dfc_in += Number(entry.amount || 0)
          } else {
            existing.dfc_out += Number(entry.amount || 0)
          }
        } else {
          summaryMap.set(key, {
            company_cnpj: entry.company_cnpj,
            period_year: year,
            period_month: month,
            account: entry.category,
            category: entry.kind,
            dre_value: 0,
            dfc_in: entry.kind === 'in' ? Number(entry.amount || 0) : 0,
            dfc_out: entry.kind === 'out' ? Number(entry.amount || 0) : 0,
            bank_account: entry.bank_account || null
          })
        }
      }

      const summariesArray = Array.from(summaryMap.values())
      if (summariesArray.length > 0) {
        const { error: summaryError } = await supabase
          .from('dre_dfc_summaries')
          .upsert(summariesArray, { onConflict: 'company_cnpj,period_year,period_month,account,category,bank_account' })

        if (summaryError) {
          console.error(`❌ Erro ao inserir summaries para ${cnpj}:`, summaryError)
        } else {
          console.log(`✅ ${summariesArray.length} registros consolidados inseridos`)
        }
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))

    return { dre: dreRows.length, dfc: dfcRows.length }
  } catch (error) {
    console.error(`❌ Erro ao importar ${cnpj} - ${startDate}:`, error.message)
    return { dre: 0, dfc: 0 }
  }
}

async function importPlanoContas(cnpj) {
  try {
    const planos = await fetchF360('PlanoDeContasPublicAPI/ListarPlanosContas')
    
    if (Array.isArray(planos) && planos.length > 0) {
      const planosData = planos.map(p => ({
        company_cnpj: normalizeCnpj(cnpj),
        plano_id: p.PlanoDeContasId || p.id,
        nome: p.Nome || p.nome,
        codigo: p.CodigoObrigacaoContabil || p.codigo,
        tipo: p.Tipo || p.tipo
      }))

      const { error } = await supabase
        .from('f360_plano_contas')
        .upsert(planosData, { onConflict: 'company_cnpj,plano_id' })

      if (error) {
        console.error(`❌ Erro ao inserir plano de contas para ${cnpj}:`, error)
      } else {
        console.log(`✅ ${planosData.length} planos de contas inseridos`)
      }
    }
  } catch (error) {
    console.error(`⚠️  Erro ao buscar plano de contas para ${cnpj}:`, error.message)
  }
}

async function importContasBancarias(cnpj) {
  try {
    const contas = await fetchF360('ContaBancariaPublicAPI/ListarContasBancarias')
    
    if (Array.isArray(contas) && contas.length > 0) {
      const contasData = contas.map(c => ({
        company_cnpj: normalizeCnpj(cnpj),
        conta_id: c.Id || c.id,
        nome: c.Nome || c.nome,
        tipo: c.TipoDeConta || c.tipo,
        banco: c.NumeroBanco || c.banco,
        agencia: c.Agencia || c.agencia,
        conta: c.Conta || c.conta
      }))

      const { error } = await supabase
        .from('f360_contas_bancarias')
        .upsert(contasData, { onConflict: 'company_cnpj,conta_id' })

      if (error) {
        console.error(`❌ Erro ao inserir contas bancárias para ${cnpj}:`, error)
      } else {
        console.log(`✅ ${contasData.length} contas bancárias inseridas`)
      }
    }
  } catch (error) {
    console.error(`⚠️  Erro ao buscar contas bancárias para ${cnpj}:`, error.message)
  }
}

async function main() {
  console.log('🚀 Iniciando importação F360 para 2025...\n')

  const year = 2025
  let totalDre = 0
  let totalDfc = 0

  for (const cnpj of VOLPE_CNPJS) {
    console.log(`\n📊 Processando empresa: ${cnpj}`)
    
    // Importar plano de contas e contas bancárias (uma vez por empresa)
    await importPlanoContas(cnpj)
    await importContasBancarias(cnpj)
    await new Promise(resolve => setTimeout(resolve, 200))

    // Importar cada mês de 2025
    for (let month = 1; month <= 12; month++) {
      const result = await importMonth(cnpj, year, month)
      totalDre += result.dre
      totalDfc += result.dfc
    }
  }

  console.log(`\n✅ Importação concluída!`)
  console.log(`📈 Total DRE: ${totalDre} registros`)
  console.log(`📈 Total DFC: ${totalDfc} registros`)
}

main().catch(console.error)

