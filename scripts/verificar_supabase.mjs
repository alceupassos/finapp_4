#!/usr/bin/env node
/**
 * Verificador de Dados no Supabase
 * Verifica se os dados das 13 empresas estão salvos corretamente
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verificar() {
  console.log('🔍 Verificando dados no Supabase...\n')

  // Verificar DRE
  const { data: dreData, error: dreError } = await supabase
    .from('dre_entries')
    .select('company_cnpj, company_nome')
    .limit(1)

  if (dreError) {
    console.log('❌ Erro ao consultar dre_entries:', dreError.message)
  } else {
    console.log('✅ Tabela dre_entries acessível')
    
    // Contar total de registros
    const { count: dreCount } = await supabase
      .from('dre_entries')
      .select('*', { count: 'exact', head: true })
    
    console.log(`   📊 Total de registros DRE: ${dreCount || 0}`)

    // Contar por empresa
    const { data: dreByCompany } = await supabase
      .from('dre_entries')
      .select('company_cnpj, company_nome')
    
    if (dreByCompany) {
      const empresas = new Map()
      dreByCompany.forEach(row => {
        const key = row.company_cnpj
        empresas.set(key, row.company_nome)
      })
      console.log(`   🏢 Empresas com dados DRE: ${empresas.size}`)
      empresas.forEach((nome, cnpj) => {
        const count = dreByCompany.filter(r => r.company_cnpj === cnpj).length
        console.log(`      - ${cnpj}: ${nome} (${count} registros)`)
      })
    }
  }

  console.log()

  // Verificar DFC
  const { data: dfcData, error: dfcError } = await supabase
    .from('cashflow_entries')
    .select('company_cnpj, company_nome')
    .limit(1)

  if (dfcError) {
    console.log('❌ Erro ao consultar cashflow_entries:', dfcError.message)
  } else {
    console.log('✅ Tabela cashflow_entries acessível')
    
    // Contar total de registros
    const { count: dfcCount } = await supabase
      .from('cashflow_entries')
      .select('*', { count: 'exact', head: true })
    
    console.log(`   📊 Total de registros DFC: ${dfcCount || 0}`)

    // Contar por empresa
    const { data: dfcByCompany } = await supabase
      .from('cashflow_entries')
      .select('company_cnpj, company_nome')
    
    if (dfcByCompany) {
      const empresas = new Map()
      dfcByCompany.forEach(row => {
        const key = row.company_cnpj
        empresas.set(key, row.company_nome)
      })
      console.log(`   🏢 Empresas com dados DFC: ${empresas.size}`)
      empresas.forEach((nome, cnpj) => {
        const count = dfcByCompany.filter(r => r.company_cnpj === cnpj).length
        console.log(`      - ${cnpj}: ${nome} (${count} registros)`)
      })
    }
  }

  console.log()

  // Verificar integration_f360
  const { data: f360Data, error: f360Error } = await supabase
    .from('integration_f360')
    .select('*')

  if (f360Error) {
    console.log('❌ Erro ao consultar integration_f360:', f360Error.message)
  } else {
    console.log('✅ Tabela integration_f360 acessível')
    console.log(`   🏢 Empresas cadastradas: ${f360Data?.length || 0}`)
    if (f360Data && f360Data.length > 0) {
      console.log('   Colunas disponíveis:', Object.keys(f360Data[0]).join(', '))
      f360Data?.slice(0, 5).forEach(emp => {
        console.log(`      - Registro:`, JSON.stringify(emp).substring(0, 100))
      })
    }
  }

  console.log('\n✨ Verificação concluída!')
}

verificar().catch(console.error)
