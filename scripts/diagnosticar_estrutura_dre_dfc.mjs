#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar estrutura real das tabelas dre_entries e cashflow_entries
 * Compara campos retornados pelo Supabase vs campos esperados pelos componentes
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
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

console.log('🔍 DIAGNÓSTICO DE ESTRUTURA DRE/DFC\n')
console.log('=' .repeat(60))

// ============================================
// 1. DIAGNOSTICAR ESTRUTURA DRE_ENTRIES
// ============================================
console.log('\n📊 1. ESTRUTURA DA TABELA dre_entries\n')

try {
  const { data: dreSample, error: dreError } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('company_cnpj', MATRIZ_CNPJ)
    .limit(5)

  if (dreError) {
    console.error('❌ Erro ao buscar dre_entries:', dreError.message)
  } else if (!dreSample || dreSample.length === 0) {
    console.warn('⚠️ Nenhum registro encontrado em dre_entries para CNPJ', MATRIZ_CNPJ)
  } else {
    console.log(`✅ Encontrados ${dreSample.length} registros de exemplo\n`)
    
    // Mostrar estrutura do primeiro registro
    const firstRecord = dreSample[0]
    console.log('📋 Campos disponíveis no primeiro registro:')
    console.log(Object.keys(firstRecord).map(k => `   - ${k}`).join('\n'))
    
    console.log('\n📄 Exemplo de registro completo:')
    console.log(JSON.stringify(firstRecord, null, 2))
    
    // Verificar campos críticos
    console.log('\n🔍 Verificação de campos críticos:')
    const camposCriticos = {
      'data/date': firstRecord.date || firstRecord.data || firstRecord.periodo || '❌ AUSENTE',
      'conta/account': firstRecord.account || firstRecord.conta || firstRecord.dre_line || '❌ AUSENTE',
      'valor/amount': firstRecord.amount !== undefined ? firstRecord.amount : (firstRecord.valor !== undefined ? firstRecord.valor : '❌ AUSENTE'),
      'natureza/nature': firstRecord.nature || firstRecord.natureza || '❌ AUSENTE',
    }
    
    Object.entries(camposCriticos).forEach(([campo, valor]) => {
      const status = valor === '❌ AUSENTE' ? '❌' : '✅'
      console.log(`   ${status} ${campo}: ${valor}`)
    })
    
    // Contar total de registros
    const { count: totalCount } = await supabase
      .from('dre_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_cnpj', MATRIZ_CNPJ)
    
    console.log(`\n📊 Total de registros DRE para CNPJ ${MATRIZ_CNPJ}: ${totalCount || 0}`)
  }
} catch (e) {
  console.error('❌ Erro ao diagnosticar dre_entries:', e.message)
}

// ============================================
// 2. DIAGNOSTICAR ESTRUTURA CASHFLOW_ENTRIES
// ============================================
console.log('\n' + '='.repeat(60))
console.log('\n💰 2. ESTRUTURA DA TABELA cashflow_entries\n')

try {
  const { data: dfcSample, error: dfcError } = await supabase
    .from('cashflow_entries')
    .select('*')
    .eq('company_cnpj', MATRIZ_CNPJ)
    .limit(5)

  if (dfcError) {
    console.error('❌ Erro ao buscar cashflow_entries:', dfcError.message)
  } else if (!dfcSample || dfcSample.length === 0) {
    console.warn('⚠️ Nenhum registro encontrado em cashflow_entries para CNPJ', MATRIZ_CNPJ)
    
    // Verificar se tabela existe tentando buscar qualquer registro
    const { data: anyRecord } = await supabase
      .from('cashflow_entries')
      .select('*')
      .limit(1)
    
    if (anyRecord && anyRecord.length > 0) {
      console.log('ℹ️ Tabela existe mas não tem dados para este CNPJ')
      console.log('📋 Estrutura de exemplo (outro CNPJ):')
      console.log(JSON.stringify(anyRecord[0], null, 2))
    } else {
      console.warn('⚠️ Tabela cashflow_entries pode estar vazia ou não existir')
    }
  } else {
    console.log(`✅ Encontrados ${dfcSample.length} registros de exemplo\n`)
    
    // Mostrar estrutura do primeiro registro
    const firstRecord = dfcSample[0]
    console.log('📋 Campos disponíveis no primeiro registro:')
    console.log(Object.keys(firstRecord).map(k => `   - ${k}`).join('\n'))
    
    console.log('\n📄 Exemplo de registro completo:')
    console.log(JSON.stringify(firstRecord, null, 2))
    
    // Verificar campos críticos
    console.log('\n🔍 Verificação de campos críticos:')
    const camposCriticos = {
      'data/date': firstRecord.date || firstRecord.data || '❌ AUSENTE',
      'kind': firstRecord.kind || '❌ AUSENTE',
      'category': firstRecord.category || firstRecord.descricao || '❌ AUSENTE',
      'amount': firstRecord.amount !== undefined ? firstRecord.amount : (firstRecord.valor !== undefined ? firstRecord.valor : '❌ AUSENTE'),
      'entrada/saida': (firstRecord.entrada !== undefined || firstRecord.saida !== undefined) ? '✅ Presente' : '❌ AUSENTE',
    }
    
    Object.entries(camposCriticos).forEach(([campo, valor]) => {
      const status = valor === '❌ AUSENTE' ? '❌' : '✅'
      console.log(`   ${status} ${campo}: ${valor}`)
    })
    
    // Contar total de registros
    const { count: totalCount } = await supabase
      .from('cashflow_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_cnpj', MATRIZ_CNPJ)
    
    console.log(`\n📊 Total de registros DFC para CNPJ ${MATRIZ_CNPJ}: ${totalCount || 0}`)
  }
} catch (e) {
  console.error('❌ Erro ao diagnosticar cashflow_entries:', e.message)
}

// ============================================
// 3. COMPARAR COM O QUE OS COMPONENTES ESPERAM
// ============================================
console.log('\n' + '='.repeat(60))
console.log('\n🔍 3. COMPARAÇÃO: SUPABASE vs COMPONENTES\n')

console.log('\n📋 useFinancialData espera (DRE):')
console.log('   - item.data (Date)')
console.log('   - item.natureza ("receita" | "despesa")')
console.log('   - item.valor (number)')

console.log('\n📋 DashboardOverview espera (DFC):')
console.log('   - tx.data (string)')
console.log('   - tx.entrada (number)')
console.log('   - tx.saida (number)')
console.log('   - tx.status (string, opcional)')

console.log('\n📋 getDRE atualmente retorna:')
console.log('   - data: r.date || r.data')
console.log('   - conta: r.account ?? r.conta ?? "Conta"')
console.log('   - natureza: r.nature ?? r.natureza ?? null')
console.log('   - valor: Number(r.amount ?? r.valor ?? 0)')

console.log('\n📋 getDFC atualmente retorna:')
console.log('   - Se já tiver entrada/saida: retorna direto')
console.log('   - Caso contrário: transforma de (date, kind, category, amount)')
console.log('     para (data, descricao, entrada, saida, saldo)')

console.log('\n' + '='.repeat(60))
console.log('\n✅ Diagnóstico concluído!\n')

