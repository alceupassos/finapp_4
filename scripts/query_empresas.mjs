#!/usr/bin/env node
/**
 * Query Direta no Supabase - Verificar todas as empresas
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verificar() {
  console.log('🔍 Consultando empresas no DRE...\n')

  // Query direta com LIMIT maior
  const { data: allData } = await supabase
    .from('dre_entries')
    .select('company_cnpj, company_nome')
    .limit(10000)  // Aumentar limite
    .order('company_cnpj')

  if (allData) {
    // Agregar manualmente
    const empresas = {}
    allData.forEach(row => {
      if (!empresas[row.company_cnpj]) {
        empresas[row.company_cnpj] = {
          cnpj: row.company_cnpj,
          nome: row.company_nome,
          count: 0
        }
      }
      empresas[row.company_cnpj].count++
    })

    console.log(`✅ Total de empresas: ${Object.keys(empresas).length}`)
    console.log(`📊 Registros consultados: ${allData.length}\n`)
    Object.values(empresas).sort((a, b) => a.cnpj.localeCompare(b.cnpj)).forEach(emp => {
      console.log(`   ${emp.cnpj}: ${emp.nome} (${emp.count} registros)`)
    })
  }

  console.log('\n🔍 Consultando empresas no DFC...\n')

  const { data: allDfc } = await supabase
    .from('cashflow_entries')
    .select('company_cnpj, company_nome')
    .limit(10000)
    .order('company_cnpj')

  if (allDfc) {
    const empresas = {}
    allDfc.forEach(row => {
      if (!empresas[row.company_cnpj]) {
        empresas[row.company_cnpj] = {
          cnpj: row.company_cnpj,
          nome: row.company_nome,
          count: 0
        }
      }
      empresas[row.company_cnpj].count++
    })

    console.log(`✅ Total de empresas: ${Object.keys(empresas).length}`)
    console.log(`📊 Registros consultados: ${allDfc.length}\n`)
    Object.values(empresas).sort((a, b) => a.cnpj.localeCompare(b.cnpj)).forEach(emp => {
      console.log(`   ${emp.cnpj}: ${emp.nome} (${emp.count} registros)`)
    })
  }
}

verificar().catch(console.error)
