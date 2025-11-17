#!/usr/bin/env node
/**
 * Testar queries de DRE/DFC do Supabase via REST API
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas')
  process.exit(1)
}

async function restGet(path, query = {}) {
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`)
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
  
  const res = await fetch(url.toString(), {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
      Prefer: 'count=exact'
    }
  })
  
  if (!res.ok) {
    throw new Error(`REST GET ${path} failed: ${res.status} ${res.statusText}`)
  }
  
  const count = res.headers.get('content-range')
  const data = await res.json()
  
  return { data, count }
}

async function testarQueries() {
  console.log('🔍 Testando queries DRE/DFC via REST API...\n')

  // Teste 1: Contar registros DRE
  try {
    const { data: dre, count: dreCount } = await restGet('dre_entries', { select: '*', limit: '1' })
    console.log('✅ Total DRE entries:', dreCount || 'N/A')
    console.log('   Amostra:', dre?.length || 0, 'registros retornados')
  } catch (error) {
    console.error('❌ Erro ao buscar DRE:', error.message)
  }

  // Teste 2: Contar registros DFC
  try {
    const { data: dfc, count: dfcCount } = await restGet('cashflow_entries', { select: '*', limit: '1' })
    console.log('✅ Total cashflow entries:', dfcCount || 'N/A')
    console.log('   Amostra:', dfc?.length || 0, 'registros retornados')
  } catch (error) {
    console.error('❌ Erro ao buscar DFC:', error.message)
  }

  // Teste 3: Buscar empresas únicas
  try {
    const { data: empresas } = await restGet('dre_entries', { 
      select: 'company_cnpj,company_nome', 
      limit: '1000' 
    })
    
    const uniqueCompanies = [...new Set(empresas?.map(e => e.company_cnpj) || [])]
    console.log('\n📊 Empresas únicas encontradas:', uniqueCompanies.length)
    uniqueCompanies.slice(0, 13).forEach(cnpj => {
      const empresa = empresas?.find(e => e.company_cnpj === cnpj)
      console.log(`  - ${cnpj}: ${empresa?.company_nome}`)
    })
  } catch (error) {
    console.error('❌ Erro ao buscar empresas:', error.message)
  }

  // Teste 4: Buscar DRE da Matriz
  const cnpjMatriz = '26888098000159'
  console.log(`\n🔍 Buscando DRE para CNPJ: ${cnpjMatriz}`)
  
  try {
    const { data: dreMatriz, count } = await restGet('dre_entries', { 
      company_cnpj: `eq.${cnpjMatriz}`,
      select: '*',
      limit: '10'
    })
    
    console.log(`✅ Encontrados ${count || dreMatriz?.length || 0} registros DRE`)
    if (dreMatriz && dreMatriz.length > 0) {
      console.log('📝 Primeiro registro:')
      console.log(JSON.stringify(dreMatriz[0], null, 2))
    } else {
      console.log('⚠️  Nenhum registro encontrado!')
    }
  } catch (error) {
    console.error('❌ Erro ao buscar DRE da Matriz:', error.message)
  }

  // Teste 5: Buscar DFC da Matriz
  console.log(`\n🔍 Buscando DFC para CNPJ: ${cnpjMatriz}`)
  
  try {
    const { data: dfcMatriz, count } = await restGet('cashflow_entries', { 
      company_cnpj: `eq.${cnpjMatriz}`,
      select: '*',
      limit: '10'
    })
    
    console.log(`✅ Encontrados ${count || dfcMatriz?.length || 0} registros DFC`)
    if (dfcMatriz && dfcMatriz.length > 0) {
      console.log('📝 Primeiro registro:')
      console.log(JSON.stringify(dfcMatriz[0], null, 2))
    } else {
      console.log('⚠️  Nenhum registro encontrado!')
    }
  } catch (error) {
    console.error('❌ Erro ao buscar DFC da Matriz:', error.message)
  }

  // Teste 6: Verificar estrutura das tabelas
  console.log('\n📋 Estrutura das colunas:')
  
  try {
    const { data: dreSample } = await restGet('dre_entries', { select: '*', limit: '1' })
    if (dreSample && dreSample[0]) {
      console.log('DRE colunas:', Object.keys(dreSample[0]).join(', '))
    }
  } catch (error) {
    console.error('Erro ao buscar amostra DRE:', error.message)
  }

  try {
    const { data: dfcSample } = await restGet('cashflow_entries', { select: '*', limit: '1' })
    if (dfcSample && dfcSample[0]) {
      console.log('DFC colunas:', Object.keys(dfcSample[0]).join(', '))
    }
  } catch (error) {
    console.error('Erro ao buscar amostra DFC:', error.message)
  }
}

testarQueries().catch(console.error)
