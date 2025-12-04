/**
 * Teste de Consolidação
 * 
 * Verifica se a soma de múltiplas empresas está correta
 */

import { mcp_supabase_execute_sql } from './supabase_helper.mjs'

async function testConsolidation() {
  console.log('\n📊 Testando Consolidação de Múltiplas Empresas...')
  
  // Buscar todas as empresas com dados
  const companiesQuery = `
    SELECT DISTINCT company_cnpj 
    FROM dre_entries 
    ORDER BY company_cnpj
    LIMIT 13
  `
  
  const companies = await mcp_supabase_execute_sql({ query: companiesQuery })
  
  if (companies.length < 2) {
    console.log('  ℹ️  Menos de 2 empresas encontradas, teste de consolidação não aplicável')
    return
  }
  
  console.log(`✅ Testando consolidação de ${companies.length} empresas`)
  
  // Calcular totais individuais
  let individualReceitas = 0
  let individualDespesas = 0
  
  const companyCnpjs = companies.map(c => c.company_cnpj)
  
  for (const cnpj of companyCnpjs) {
    const query = `
      SELECT 
        SUM(CASE WHEN natureza = 'receita' THEN valor ELSE 0 END) as receitas,
        SUM(CASE WHEN natureza = 'despesa' THEN valor ELSE 0 END) as despesas
      FROM dre_entries
      WHERE company_cnpj = '${cnpj}'
    `
    
    const result = await mcp_supabase_execute_sql({ query })
    const receitas = parseFloat(result[0]?.receitas || 0)
    const despesas = parseFloat(result[0]?.despesas || 0)
    
    individualReceitas += receitas
    individualDespesas += despesas
    
    console.log(`  ${cnpj}: Receitas R$ ${receitas.toLocaleString('pt-BR')}, Despesas R$ ${despesas.toLocaleString('pt-BR')}`)
  }
  
  // Calcular total consolidado
  const consolidatedQuery = `
    SELECT 
      SUM(CASE WHEN natureza = 'receita' THEN valor ELSE 0 END) as receitas,
      SUM(CASE WHEN natureza = 'despesa' THEN valor ELSE 0 END) as despesas
    FROM dre_entries
    WHERE company_cnpj IN (${companyCnpjs.map(c => `'${c}'`).join(',')})
  `
  
  const consolidated = await mcp_supabase_execute_sql({ query: consolidatedQuery })
  const consolidatedReceitas = parseFloat(consolidated[0]?.receitas || 0)
  const consolidatedDespesas = parseFloat(consolidated[0]?.despesas || 0)
  
  console.log(`\n📊 Totais Individuais:`)
  console.log(`  Receitas: R$ ${individualReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Despesas: R$ ${individualDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  
  console.log(`\n📊 Total Consolidado:`)
  console.log(`  Receitas: R$ ${consolidatedReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Despesas: R$ ${consolidatedDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  
  // Validar
  const receitasMatch = Math.abs(individualReceitas - consolidatedReceitas) < 0.01
  const despesasMatch = Math.abs(individualDespesas - consolidatedDespesas) < 0.01
  
  if (receitasMatch && despesasMatch) {
    console.log(`\n✅ Consolidação correta: Soma individual = Total consolidado`)
  } else {
    console.warn(`\n⚠️  INCONSISTÊNCIA na consolidação:`)
    if (!receitasMatch) {
      console.warn(`  Receitas: Individual ${individualReceitas} != Consolidado ${consolidatedReceitas}`)
    }
    if (!despesasMatch) {
      console.warn(`  Despesas: Individual ${individualDespesas} != Consolidado ${consolidatedDespesas}`)
    }
  }
}

async function main() {
  console.log('🔍 TESTE DE CONSOLIDAÇÃO')
  console.log('='.repeat(60))
  
  try {
    await testConsolidation()
    
    console.log('\n✅ Teste de consolidação concluído\n')
  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message)
    process.exit(1)
  }
}

main()

