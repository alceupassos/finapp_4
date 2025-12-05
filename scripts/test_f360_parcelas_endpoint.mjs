/**
 * Teste rápido do endpoint de parcelas F360
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

async function testEndpoint() {
  console.log('🔍 Testando endpoint de parcelas F360\n')
  
  // Login
  console.log('1️⃣ Fazendo login...')
  const loginRes = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: VOLPE_TOKEN }),
  })
  const loginData = await loginRes.json()
  const jwt = loginData.Token
  console.log('✅ Login OK\n')
  
  // Testar endpoint de receitas
  const cnpj = '26888098000159'
  const dataInicio = '2025-10-01'
  const dataFim = '2025-10-31'
  
  console.log('2️⃣ Testando endpoint de receitas...')
  const receitasUrl = `${F360_BASE_URL}/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos?cnpj=${cnpj}&dataInicio=${dataInicio}&dataFim=${dataFim}&tipo=Receita&tipoDatas=Competência&pagina=1`
  const receitasRes = await fetch(receitasUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    }
  })
  
  if (!receitasRes.ok) {
    const text = await receitasRes.text()
    console.error(`❌ Erro: ${receitasRes.status} - ${text}`)
    return
  }
  
  const receitasData = await receitasRes.json()
  console.log(`✅ Receitas: ${receitasData.Result?.length || 0} registros`)
  if (receitasData.Result && receitasData.Result.length > 0) {
    console.log('   Primeiro registro:', {
      TipoTitulo: receitasData.Result[0].TipoTitulo,
      Valor: receitasData.Result[0].Valor,
      PlanoDeContas: receitasData.Result[0].PlanoDeContas?.substring(0, 40),
      Competencia: receitasData.Result[0].Competencia
    })
  }
  
  console.log('\n3️⃣ Testando endpoint de despesas...')
  const despesasUrl = `${F360_BASE_URL}/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos?cnpj=${cnpj}&dataInicio=${dataInicio}&dataFim=${dataFim}&tipo=Despesa&tipoDatas=Competência&pagina=1`
  const despesasRes = await fetch(despesasUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    }
  })
  
  if (!despesasRes.ok) {
    const text = await despesasRes.text()
    console.error(`❌ Erro: ${despesasRes.status} - ${text}`)
    return
  }
  
  const despesasData = await despesasRes.json()
  console.log(`✅ Despesas: ${despesasData.Result?.length || 0} registros`)
  if (despesasData.Result && despesasData.Result.length > 0) {
    console.log('   Primeiro registro:', {
      TipoTitulo: despesasData.Result[0].TipoTitulo,
      Valor: despesasData.Result[0].Valor,
      PlanoDeContas: despesasData.Result[0].PlanoDeContas?.substring(0, 40),
      Competencia: despesasData.Result[0].Competencia
    })
  }
  
  console.log('\n✅ Teste concluído')
}

testEndpoint().catch(console.error)

