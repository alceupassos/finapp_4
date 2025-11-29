#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar valores incorretos no Dashboard
 * Executa queries SQL para identificar duplicatas, somas e distribuição
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
const envPath = join(__dirname, '..', '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  const envVars = {}
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      envVars[match[1].trim()] = match[2].trim()
    }
  })
  process.env.VITE_SUPABASE_URL = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  process.env.VITE_SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
} catch (e) {
  console.warn('⚠️ Não foi possível carregar .env.local, usando variáveis do sistema')
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const MATRIZ_CNPJ = '26888098000159'

console.log('🔍 DIAGNÓSTICO DE VALORES DRE\n')
console.log('='.repeat(60))

// ============================================
// QUERY 1: Estrutura e totais
// ============================================
console.log('\n📊 1. ESTRUTURA E TOTAIS\n')

try {
  const { data: stats, error } = await supabase
    .from('dre_entries')
    .select('*', { count: 'exact' })
    .eq('company_cnpj', MATRIZ_CNPJ)

  if (error) {
    console.error('❌ Erro:', error.message)
  } else {
    const total = stats?.length || 0
    
    // Calcular totais manualmente
    const ids = new Set()
    let somaTotal = 0
    let dataMin = null
    let dataMax = null
    
    stats?.forEach((row) => {
      ids.add(row.id)
      const amount = Number(row.amount || 0)
      somaTotal += amount
      
      if (row.date) {
        const date = new Date(row.date)
        if (!dataMin || date < dataMin) dataMin = date
        if (!dataMax || date > dataMax) dataMax = date
      }
    })
    
    console.log(`Total de registros: ${total}`)
    console.log(`Registros distintos (por ID): ${ids.size}`)
    console.log(`Soma total de amount: R$ ${somaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`Data mínima: ${dataMin ? dataMin.toISOString().split('T')[0] : 'N/A'}`)
    console.log(`Data máxima: ${dataMax ? dataMax.toISOString().split('T')[0] : 'N/A'}`)
    
    if (total !== ids.size) {
      console.warn(`⚠️ ATENÇÃO: ${total - ids.size} registros duplicados detectados!`)
    }
  }
} catch (e) {
  console.error('❌ Erro ao executar query 1:', e.message)
}

// ============================================
// QUERY 2: Verificar duplicatas
// ============================================
console.log('\n' + '='.repeat(60))
console.log('\n🔍 2. VERIFICAR DUPLICATAS\n')

try {
  const { data: allRows, error } = await supabase
    .from('dre_entries')
    .select('date, account, amount, id')
    .eq('company_cnpj', MATRIZ_CNPJ)

  if (error) {
    console.error('❌ Erro:', error.message)
  } else {
    // Agrupar por date, account, amount
    const groups = new Map()
    
    allRows?.forEach((row) => {
      const key = `${row.date}|${row.account}|${row.amount}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key).push(row)
    })
    
    // Encontrar duplicatas
    const duplicatas = Array.from(groups.entries())
      .filter(([key, rows]) => rows.length > 1)
      .slice(0, 10) // Mostrar apenas as 10 primeiras
    
    if (duplicatas.length > 0) {
      console.warn(`⚠️ Encontradas ${duplicatas.length} combinações duplicadas (mostrando primeiras 10):\n`)
      duplicatas.forEach(([key, rows]) => {
        const [date, account, amount] = key.split('|')
        console.log(`   Data: ${date}, Conta: ${account}, Valor: ${amount}`)
        console.log(`   Quantidade: ${rows.length} registros`)
        console.log(`   IDs: ${rows.map((r) => r.id).join(', ')}\n`)
      })
    } else {
      console.log('✅ Nenhuma duplicata encontrada (mesma data + conta + valor)')
    }
  }
} catch (e) {
  console.error('❌ Erro ao executar query 2:', e.message)
}

// ============================================
// QUERY 3: Distribuição por natureza
// ============================================
console.log('\n' + '='.repeat(60))
console.log('\n📊 3. DISTRIBUIÇÃO POR NATUREZA\n')

try {
  const { data: allRows, error } = await supabase
    .from('dre_entries')
    .select('nature, amount')
    .eq('company_cnpj', MATRIZ_CNPJ)

  if (error) {
    console.error('❌ Erro:', error.message)
  } else {
    const porNatureza = new Map()
    
    allRows?.forEach((row) => {
      const nature = row.nature || 'null'
      const amount = Number(row.amount || 0)
      
      if (!porNatureza.has(nature)) {
        porNatureza.set(nature, { count: 0, total: 0 })
      }
      
      const stats = porNatureza.get(nature)
      stats.count++
      stats.total += amount
    })
    
    console.log('Distribuição:\n')
    Array.from(porNatureza.entries()).forEach(([nature, stats]) => {
      console.log(`   ${nature || '(null)'}:`)
      console.log(`     Quantidade: ${stats.count} registros`)
      console.log(`     Total: R$ ${stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      console.log(`     Média: R$ ${(stats.total / stats.count).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`)
    })
    
    // Verificar se valores estão em centavos
    const receitas = porNatureza.get('receita')?.total || 0
    const despesas = porNatureza.get('despesa')?.total || 0
    
    if (receitas > 1000000 || despesas > 1000000) {
      console.log('⚠️ ATENÇÃO: Valores muito altos detectados!')
      console.log(`   Receitas: R$ ${receitas.toLocaleString('pt-BR')}`)
      console.log(`   Despesas: R$ ${despesas.toLocaleString('pt-BR')}`)
      console.log(`   Se estiverem em centavos, dividir por 100:`)
      console.log(`   Receitas: R$ ${(receitas / 100).toLocaleString('pt-BR')}`)
      console.log(`   Despesas: R$ ${(despesas / 100).toLocaleString('pt-BR')}`)
    }
  }
} catch (e) {
  console.error('❌ Erro ao executar query 3:', e.message)
}

// ============================================
// QUERY 4: Verificar por mês
// ============================================
console.log('\n' + '='.repeat(60))
console.log('\n📅 4. DISTRIBUIÇÃO POR MÊS\n')

try {
  const { data: allRows, error } = await supabase
    .from('dre_entries')
    .select('date, nature, amount')
    .eq('company_cnpj', MATRIZ_CNPJ)

  if (error) {
    console.error('❌ Erro:', error.message)
  } else {
    const porMes = new Map()
    
    allRows?.forEach((row) => {
      if (!row.date) return
      
      const date = new Date(row.date)
      const mesKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const nature = row.nature || 'null'
      const amount = Number(row.amount || 0)
      
      if (!porMes.has(mesKey)) {
        porMes.set(mesKey, { receita: 0, despesa: 0, count: 0 })
      }
      
      const stats = porMes.get(mesKey)
      stats.count++
      
      if (nature === 'receita') {
        stats.receita += amount
      } else if (nature === 'despesa') {
        stats.despesa += amount
      }
    })
    
    console.log('Totais por mês:\n')
    Array.from(porMes.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([mes, stats]) => {
        const lucro = stats.receita - stats.despesa
        console.log(`   ${mes}:`)
        console.log(`     Receitas: R$ ${stats.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        console.log(`     Despesas: R$ ${stats.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        console.log(`     Lucro: R$ ${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        console.log(`     Registros: ${stats.count}\n`)
      })
  }
} catch (e) {
  console.error('❌ Erro ao executar query 4:', e.message)
}

console.log('\n' + '='.repeat(60))
console.log('\n✅ Diagnóstico concluído!\n')

