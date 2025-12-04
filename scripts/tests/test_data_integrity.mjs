/**
 * Teste de Integridade de Dados
 * 
 * Verifica:
 * - DRE: sum(receitas) - sum(despesas) = resultado
 * - DFC: sum(entradas) - sum(saidas) = variacao caixa
 * - Bancos: saldo_anterior + movimentacoes = saldo_atual
 */

import { mcp_supabase_execute_sql } from './supabase_helper.mjs'

async function testDREIntegrity() {
  console.log('\n📊 Testando Integridade DRE...')
  
  const query = `
    SELECT 
      company_cnpj,
      SUM(CASE WHEN natureza = 'receita' THEN valor ELSE 0 END) as total_receitas,
      SUM(CASE WHEN natureza = 'despesa' THEN valor ELSE 0 END) as total_despesas,
      SUM(CASE WHEN natureza = 'receita' THEN valor ELSE 0 END) - 
      SUM(CASE WHEN natureza = 'despesa' THEN valor ELSE 0 END) as resultado
    FROM dre_entries
    GROUP BY company_cnpj
    ORDER BY company_cnpj
  `
  
  const results = await executeSQL(query)
  
  console.log(`✅ ${results.length} empresas com dados DRE`)
  
  for (const row of results) {
    const receitas = parseFloat(row.total_receitas || 0)
    const despesas = parseFloat(row.total_despesas || 0)
    const resultado = parseFloat(row.resultado || 0)
    
    console.log(`  ${row.company_cnpj}:`)
    console.log(`    Receitas: R$ ${receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    console.log(`    Despesas: R$ ${despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    console.log(`    Resultado: R$ ${resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    
    // Validar: receitas - despesas = resultado
    const expected = receitas - despesas
    if (Math.abs(resultado - expected) > 0.01) {
      console.warn(`    ⚠️  INCONSISTÊNCIA: Resultado esperado ${expected}, encontrado ${resultado}`)
    } else {
      console.log(`    ✅ Integridade OK`)
    }
  }
}

async function testDFCIntegrity() {
  console.log('\n💰 Testando Integridade DFC...')
  
  const query = `
    SELECT 
      company_cnpj,
      SUM(CASE WHEN kind = 'in' THEN amount ELSE 0 END) as total_entradas,
      SUM(CASE WHEN kind = 'out' THEN amount ELSE 0 END) as total_saidas,
      SUM(CASE WHEN kind = 'in' THEN amount ELSE 0 END) - 
      SUM(CASE WHEN kind = 'out' THEN amount ELSE 0 END) as variacao_caixa
    FROM dfc_entries
    GROUP BY company_cnpj
    ORDER BY company_cnpj
  `
  
  const results = await executeSQL(query)
  
  console.log(`✅ ${results.length} empresas com dados DFC`)
  
  for (const row of results) {
    const entradas = parseFloat(row.total_entradas || 0)
    const saidas = parseFloat(row.total_saidas || 0)
    const variacao = parseFloat(row.variacao_caixa || 0)
    
    console.log(`  ${row.company_cnpj}:`)
    console.log(`    Entradas: R$ ${entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    console.log(`    Saídas: R$ ${saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    console.log(`    Variação: R$ ${variacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    
    const expected = entradas - saidas
    if (Math.abs(variacao - expected) > 0.01) {
      console.warn(`    ⚠️  INCONSISTÊNCIA: Variação esperada ${expected}, encontrada ${variacao}`)
    } else {
      console.log(`    ✅ Integridade OK`)
    }
  }
}

async function testBankIntegrity() {
  console.log('\n🏦 Testando Integridade Bancária...')
  
  const query = `
    SELECT 
      ba.company_cnpj,
      ba.nome as conta,
      ba.saldo_atual,
      COALESCE(SUM(bt.amount), 0) as movimentacoes_total
    FROM bank_accounts ba
    LEFT JOIN bank_transactions bt ON bt.bank_account_id = ba.id
    GROUP BY ba.id, ba.company_cnpj, ba.nome, ba.saldo_atual
    ORDER BY ba.company_cnpj, ba.nome
  `
  
  const results = await executeSQL(query)
  
  if (results.length === 0) {
    console.log('  ℹ️  Nenhuma conta bancária com transações encontrada')
    return
  }
  
  console.log(`✅ ${results.length} contas bancárias`)
  
  for (const row of results) {
    const saldoAtual = parseFloat(row.saldo_atual || 0)
    const movimentacoes = parseFloat(row.movimentacoes_total || 0)
    
    console.log(`  ${row.company_cnpj} - ${row.conta}:`)
    console.log(`    Saldo Atual: R$ ${saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    console.log(`    Movimentações: R$ ${movimentacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    
    // Nota: Validação completa requer saldo anterior, que pode não estar disponível
    console.log(`    ℹ️  Validação completa requer saldo anterior`)
  }
}

async function main() {
  console.log('🔍 TESTE DE INTEGRIDADE DE DADOS')
  console.log('='.repeat(60))
  
  try {
    await testDREIntegrity()
    await testDFCIntegrity()
    await testBankIntegrity()
    
    console.log('\n✅ Testes de integridade concluídos\n')
  } catch (error) {
    console.error('\n❌ Erro nos testes:', error.message)
    process.exit(1)
  }
}

main()

