#!/usr/bin/env tsx
/**
 * Script para criar dados de teste no banco de dados
 * Insere lançamentos contábeis para 2025 em uma empresa existente
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnvFromSupa } from './load-env-from-supa'
import type { Database } from '../src/types/database.types'

async function seedTestData() {
  console.log('🌱 Inserindo dados de teste...\n')

  // Carregar variáveis de ambiente
  await loadEnvFromSupa()

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  // 1. Obter primeira empresa com plano de contas
  console.log('📊 Buscando empresa com plano de contas...')
  const { data: companies } = await supabase
    .from('companies')
    .select('id, razao_social, cnpj')
    .eq('active', true)
    .limit(1)

  if (!companies || companies.length === 0) {
    console.error('❌ Nenhuma empresa ativa encontrada')
    process.exit(1)
  }

  const company = companies[0]
  console.log(`✓ Empresa selecionada: ${company.razao_social} (${company.cnpj})`)

  // 2. Obter contas do plano
  console.log('\n📋 Buscando contas do plano de contas...')
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, type')
    .eq('company_id', company.id)
    .limit(10)

  if (!accounts || accounts.length === 0) {
    console.error('❌ Nenhuma conta encontrada para esta empresa')
    process.exit(1)
  }

  console.log(`✓ ${accounts.length} contas encontradas`)

  // 3. Criar lançamentos de teste
  console.log('\n💾 Criando lançamentos de teste para 2025...')

  const entries: Array<{
    company_id: string
    entry_date: string
    competence_date: string
    account_code: string
    debit_amount: number
    credit_amount: number
    description: string
    source_erp: 'F360' | 'OMIE'
  }> = []

  // Criar lançamentos para cada mês de 2025
  const baseAmount = 10000
  let entryCount = 0

  for (let month = 1; month <= 12; month++) {
    const date = `2025-${String(month).padStart(2, '0')}-15`

    // Receita
    const revenueAccount = accounts.find(a => a.type === 'RECEITA')
    if (revenueAccount) {
      entries.push({
        company_id: company.id,
        entry_date: date,
        competence_date: date,
        account_code: revenueAccount.code,
        debit_amount: 0,
        credit_amount: baseAmount * (1 + Math.random() * 0.5), // Receita varia
        description: `Receita de teste - Mês ${month}`,
        source_erp: 'F360',
      })
      entryCount++
    }

    // Despesa
    const expenseAccount = accounts.find(a => a.type === 'DESPESA')
    if (expenseAccount) {
      entries.push({
        company_id: company.id,
        entry_date: date,
        competence_date: date,
        account_code: expenseAccount.code,
        debit_amount: baseAmount * 0.6 * (1 + Math.random() * 0.3), // Despesa varia
        credit_amount: 0,
        description: `Despesa de teste - Mês ${month}`,
        source_erp: 'F360',
      })
      entryCount++
    }
  }

  console.log(`✓ ${entryCount} lançamentos preparados para inserção`)

  // 4. Inserir lançamentos em batches
  console.log('\n📥 Inserindo lançamentos no banco...')
  const BATCH_SIZE = 500
  let totalInserted = 0

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)

    const { error } = await supabase
      .from('accounting_entries')
      .upsert(batch, {
        onConflict: 'company_id,source_erp,source_id,entry_date',
      })

    if (error) {
      console.error(`❌ Erro ao inserir batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
    } else {
      totalInserted += batch.length
      console.log(`✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} lançamentos`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ DADOS DE TESTE INSERIDOS COM SUCESSO!')
  console.log('='.repeat(60))
  console.log(`Total de lançamentos inseridos: ${totalInserted}`)
  console.log(`Empresa: ${company.razao_social}`)
  console.log(`Período: 2025-01 a 2025-12`)
}

// Executar se chamado diretamente
if (require.main === module) {
  seedTestData().catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
}

