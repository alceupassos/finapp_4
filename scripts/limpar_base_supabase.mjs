#!/usr/bin/env node
/**
 * Limpeza Total da Base Supabase
 * ================================
 * 
 * Remove TODOS os registros de DRE e DFC para reprocessamento completo.
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function limparTabela(tabela) {
  console.log(`\n🗑️  Limpando tabela ${tabela.toUpperCase()}...`)

  // Contar registros antes
  const { count: antes } = await supabase
    .from(tabela)
    .select('*', { count: 'exact', head: true })

  if (antes === 0) {
    console.log(`   ✅ Tabela já está vazia`)
    return 0
  }

  console.log(`   • Registros encontrados: ${antes}`)

  // Deletar todos
  const { error } = await supabase
    .from(tabela)
    .delete()
    .neq('id', 0) // Deleta todos (condição sempre verdadeira)

  if (error) {
    console.log(`   ❌ Erro ao limpar: ${error.message}`)
    return 0
  }

  // Verificar se limpou
  const { count: depois } = await supabase
    .from(tabela)
    .select('*', { count: 'exact', head: true })

  console.log(`   ✅ Registros removidos: ${antes - depois}`)
  console.log(`   • Registros restantes: ${depois}`)

  return antes - depois
}

async function main() {
  console.log('🧹 LIMPEZA TOTAL DA BASE SUPABASE')
  console.log('=' .repeat(80))
  console.log('\n⚠️  ATENÇÃO: Esta operação irá DELETAR TODOS OS DADOS!')
  console.log('\nTabelas a serem limpas:')
  console.log('   • dre_entries')
  console.log('   • cashflow_entries')

  if (!process.argv.includes('--confirmar')) {
    console.log('\n▶️  Para executar a limpeza, rode:')
    console.log('    node scripts/limpar_base_supabase.mjs --confirmar')
    console.log('\n✅ Análise concluída (modo somente leitura)')
    return
  }

  console.log('\n🚀 INICIANDO LIMPEZA...\n')

  const dreRemovidos = await limparTabela('dre_entries')
  const dfcRemovidos = await limparTabela('cashflow_entries')

  console.log('\n' + '='.repeat(80))
  console.log('📊 RESUMO DA LIMPEZA')
  console.log('='.repeat(80))
  console.log(`   • DRE removidos: ${dreRemovidos}`)
  console.log(`   • DFC removidos: ${dfcRemovidos}`)
  console.log(`   • TOTAL: ${dreRemovidos + dfcRemovidos} registros deletados`)
  console.log('\n✅ Base limpa e pronta para reprocessamento!')
  console.log('\n▶️  Próximo passo:')
  console.log('    node scripts/processar_grupo_volpe.mjs --upload=true')
  console.log('\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
