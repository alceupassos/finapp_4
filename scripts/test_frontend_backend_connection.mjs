/**
 * Script de Teste de Conexão Frontend-Backend
 * 
 * Verifica:
 * 1. Conexão Supabase
 * 2. Fluxo de dados DRE/DFC
 * 3. user_companies
 * 4. Estrutura de dados retornados
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente ausentes')
  console.error('   VITE_SUPABASE_URL:', !!SUPABASE_URL)
  console.error('   VITE_SUPABASE_ANON_KEY:', !!SUPABASE_ANON_KEY)
  process.exit(1)
}

async function testConnection() {
  console.log('🔍 Testando Conexão Frontend-Backend\n')
  
  // Teste 1: Verificar endpoint Supabase
  console.log('1️⃣ Testando endpoint Supabase...')
  try {
    const healthCheck = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    })
    console.log(`   ✅ Endpoint acessível: ${healthCheck.status}`)
  } catch (error) {
    console.error(`   ❌ Erro ao acessar endpoint: ${error.message}`)
    return false
  }
  
  // Teste 2: Verificar user_companies
  console.log('\n2️⃣ Testando user_companies...')
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/user_companies?select=*&limit=5`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
      }
    })
    const data = await response.json()
    if (Array.isArray(data)) {
      console.log(`   ✅ user_companies: ${data.length} registros encontrados`)
      if (data.length > 0) {
        console.log(`   📋 Primeiro registro:`, {
          user_id: data[0].user_id?.substring(0, 8) + '...',
          company_cnpj: data[0].company_cnpj
        })
      }
    } else {
      console.warn(`   ⚠️ Resposta não é array:`, data)
    }
  } catch (error) {
    console.error(`   ❌ Erro ao buscar user_companies: ${error.message}`)
  }
  
  // Teste 3: Verificar DRE entries
  console.log('\n3️⃣ Testando DRE entries...')
  try {
    const cnpj = '26888098000159' // VOLPE MATRIZ
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/dre_entries?company_cnpj=eq.${cnpj}&select=*&limit=10`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
      }
    })
    const data = await response.json()
    if (Array.isArray(data)) {
      console.log(`   ✅ DRE entries: ${data.length} registros encontrados para ${cnpj}`)
      if (data.length > 0) {
        const receitas = data.filter(r => r.natureza === 'receita').length
        const despesas = data.filter(r => r.natureza === 'despesa').length
        console.log(`   📊 Natureza: ${receitas} receitas, ${despesas} despesas`)
        console.log(`   📋 Primeiro registro:`, {
          date: data[0].date,
          account: data[0].account?.substring(0, 30),
          natureza: data[0].natureza,
          valor: data[0].valor
        })
      }
    } else {
      console.warn(`   ⚠️ Resposta não é array:`, data)
    }
  } catch (error) {
    console.error(`   ❌ Erro ao buscar DRE: ${error.message}`)
  }
  
  // Teste 4: Verificar DFC entries
  console.log('\n4️⃣ Testando DFC entries...')
  try {
    const cnpj = '26888098000159' // VOLPE MATRIZ
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/dfc_entries?company_cnpj=eq.${cnpj}&select=*&limit=10`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
      }
    })
    const data = await response.json()
    if (Array.isArray(data)) {
      console.log(`   ✅ DFC entries: ${data.length} registros encontrados para ${cnpj}`)
      if (data.length > 0) {
        const entradas = data.filter(r => r.kind === 'in').length
        const saidas = data.filter(r => r.kind === 'out').length
        console.log(`   📊 Kind: ${entradas} entradas, ${saidas} saídas`)
        console.log(`   📋 Primeiro registro:`, {
          date: data[0].date,
          kind: data[0].kind,
          category: data[0].category?.substring(0, 30),
          amount: data[0].amount
        })
      }
    } else {
      console.warn(`   ⚠️ Resposta não é array:`, data)
    }
  } catch (error) {
    console.error(`   ❌ Erro ao buscar DFC: ${error.message}`)
  }
  
  // Teste 5: Verificar companies
  console.log('\n5️⃣ Testando companies...')
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/companies?cnpj=like.26888098%&select=cnpj,nome_fantasia,razao_social&limit=5`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
      }
    })
    const data = await response.json()
    if (Array.isArray(data)) {
      console.log(`   ✅ Companies: ${data.length} empresas Volpe encontradas`)
      if (data.length > 0) {
        console.log(`   📋 Primeiras empresas:`, data.slice(0, 3).map(c => ({
          cnpj: c.cnpj,
          nome: c.nome_fantasia || c.razao_social
        })))
      }
    } else {
      console.warn(`   ⚠️ Resposta não é array:`, data)
    }
  } catch (error) {
    console.error(`   ❌ Erro ao buscar companies: ${error.message}`)
  }
  
  console.log('\n✅ Testes de conexão concluídos\n')
}

testConnection().catch(console.error)

