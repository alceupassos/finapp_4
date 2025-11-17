#!/usr/bin/env node
/**
 * Análise de Status na Base de Dados
 * ====================================
 * 
 * Verifica quantos registros têm status que devem ser filtrados
 * conforme as novas regras de processamento.
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analisarStatus() {
  console.log('\n📊 ANALISANDO STATUS DOS REGISTROS...\n')

  // Status inválidos conforme REGRAS_PROCESSAMENTO_DADOS.md
  const statusInvalidos = ['baixado', 'baixados', 'renegociado', 'renegociados']

  // Buscar todas as transações (se existir tabela de origem)
  // Como não temos tabela de transações brutas, vamos verificar DRE e DFC
  
  console.log('🔍 Verificando tabelas atuais no Supabase...\n')

  // DRE
  const { count: dreTotal } = await supabase
    .from('dre_entries')
    .select('*', { count: 'exact', head: true })

  console.log(`DRE_ENTRIES: ${dreTotal} registros`)

  // DFC
  const { count: dfcTotal } = await supabase
    .from('cashflow_entries')
    .select('*', { count: 'exact', head: true })

  console.log(`CASHFLOW_ENTRIES: ${dfcTotal} registros`)

  console.log('\n📋 RESUMO:')
  console.log('   • DRE: Não armazena status (dados já agregados)')
  console.log('   • DFC: Não armazena status (dados já agregados)')
  console.log('\n💡 Para aplicar as novas regras, é necessário REPROCESSAR os dados do zero.')
  console.log('\n🎯 PLANO DE HIGIENIZAÇÃO:\n')
  console.log('   1. Deletar todos os dados de DRE e DFC no Supabase')
  console.log('   2. Reprocessar Excel com novas regras:')
  console.log('      • Filtrar status: baixado, baixados, renegociado, renegociados')
  console.log('      • DFC: apenas status = "conciliado"')
  console.log('      • Valores: sempre positivos (Math.abs)')
  console.log('   3. Upload dos dados limpos para Supabase')
  console.log('\n▶️  COMANDOS:\n')
  console.log('   # 1. Limpar base atual')
  console.log('   node scripts/limpar_base_supabase.mjs --confirmar')
  console.log('\n   # 2. Reprocessar com novas regras')
  console.log('   node scripts/processar_grupo_volpe.mjs --upload=true')
  console.log('\n')
}

analisarStatus().catch(err => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
