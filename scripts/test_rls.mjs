#!/usr/bin/env node
/**
 * Verifica RLS e Policies do Supabase
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verificarRLS() {
  console.log('🔍 Verificando configuração RLS...\n')

  // Tentar inserir um registro de teste
  const testRecord = {
    company_cnpj: '99999999999999',
    company_nome: 'TESTE',
    date: '2025-01-01',
    account: 'TESTE',
    nature: 'receita',
    amount: 100
  }

  console.log('📝 Tentando inserir registro de teste...')
  const { data: insertData, error: insertError } = await supabase
    .from('dre_entries')
    .insert([testRecord])
    .select()

  if (insertError) {
    console.log('❌ Erro ao inserir:', insertError.message)
  } else {
    console.log('✅ Inserido com sucesso:', insertData?.length || 0, 'registros')
  }

  // Tentar ler o registro
  console.log('\n📖 Tentando ler registro de teste...')
  const { data: selectData, error: selectError } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('company_cnpj', '99999999999999')

  if (selectError) {
    console.log('❌ Erro ao ler:', selectError.message)
  } else {
    console.log('✅ Lidos:', selectData?.length || 0, 'registros')
  }

  // Limpar
  console.log('\n🗑️  Limpando registro de teste...')
  const { error: deleteError } = await supabase
    .from('dre_entries')
    .delete()
    .eq('company_cnpj', '99999999999999')

  if (deleteError) {
    console.log('❌ Erro ao deletar:', deleteError.message)
  } else {
    console.log('✅ Deletado com sucesso')
  }

  // Verificar total de registros
  console.log('\n📊 Total de registros no banco...')
  const { count, error: countError } = await supabase
    .from('dre_entries')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.log('❌ Erro ao contar:', countError.message)
  } else {
    console.log('✅ Total:', count, 'registros')
  }

  // Listar CNPJs únicos
  console.log('\n🏢 CNPJs únicos no banco...')
  const { data: allData } = await supabase
    .from('dre_entries')
    .select('company_cnpj')

  if (allData) {
    const cnpjs = [...new Set(allData.map(r => r.company_cnpj))]
    console.log('CNPJs:', cnpjs)
  }
}

verificarRLS().catch(console.error)
