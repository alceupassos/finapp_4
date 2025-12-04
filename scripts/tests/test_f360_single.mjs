import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'

/**
 * Teste de importação SINGLE (empresa única)
 * 
 * Nota: Este teste requer um token de empresa única.
 * Se não tiver, o teste será pulado.
 */
async function testSingleImport(token) {
  if (!token) {
    console.log('⚠️  Token não fornecido, pulando teste SINGLE')
    return { success: true, skipped: true }
  }

  console.log('🧪 Teste de Importação SINGLE (Empresa Única)\n')
  console.log('='.repeat(60))

  try {
    // 1. Login
    console.log('1. Fazendo login...')
    const loginResponse = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`)
    }

    const { Token: jwt } = await loginResponse.json()
    console.log('✅ Login realizado')

    // 2. Listar contas bancárias para verificar se é SINGLE
    console.log('\n2. Verificando se é empresa única...')
    const contasResponse = await fetch(`${F360_BASE_URL}/ContaBancariaPublicAPI/ListarContasBancarias`, {
      headers: { 'Authorization': `Bearer ${jwt}` },
    })

    if (!contasResponse.ok) {
      throw new Error(`Falha ao listar contas: ${contasResponse.status}`)
    }

    const contasData = await contasResponse.json()
    const contas = contasData.Result || contasData.data || []

    const cnpjsEncontrados = new Set()
    for (const conta of contas) {
      const cnpj = (conta.CNPJ || conta.cnpj || '').replace(/\D/g, '')
      if (cnpj && cnpj.length === 14) {
        cnpjsEncontrados.add(cnpj)
      }
    }

    console.log(`✅ ${cnpjsEncontrados.size} CNPJ(s) encontrado(s)`)

    if (cnpjsEncontrados.size > 1) {
      console.log('⚠️  Token parece ser de grupo, não de empresa única')
      return { success: true, skipped: true, reason: 'Token é de grupo' }
    }

    const cnpj = Array.from(cnpjsEncontrados)[0] || '00000000000000'
    console.log(`   CNPJ: ${cnpj}`)

    // 3. Gerar relatório para empresa específica
    console.log('\n3. Gerando relatório para empresa única...')
    const hoje = new Date()
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

    const relatorioBody = {
      Data: primeiroDiaMes.toISOString().split('T')[0],
      DataFim: ultimoDiaMes.toISOString().split('T')[0],
      ModeloContabil: 'provisao',
      ModeloRelatorio: 'gerencial',
      ExtensaoDeArquivo: 'json',
      EnviarNotificacaoPorWebhook: false,
      URLNotificacao: '',
      Contas: '',
      CNPJEmpresas: [cnpj], // Específico para empresa única
    }

    const relatorioResponse = await fetch(`${F360_BASE_URL}/PublicRelatorioAPI/GerarRelatorio`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relatorioBody),
    })

    if (!relatorioResponse.ok) {
      throw new Error(`Falha ao gerar relatório: ${relatorioResponse.status}`)
    }

    const { Result: relatorioId } = await relatorioResponse.json()
    console.log(`✅ Relatório gerado: ${relatorioId}`)

    // 4. Aguardar e baixar relatório
    console.log('\n4. Aguardando processamento do relatório...')
    let relatorioData = null
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000))

      try {
        const downloadResponse = await fetch(`${F360_BASE_URL}/PublicRelatorioAPI/Download?id=${relatorioId}`, {
          headers: { 'Authorization': `Bearer ${jwt}` },
        })

        if (downloadResponse.ok) {
          relatorioData = await downloadResponse.json()
          break
        }
      } catch {
        // Continuar tentando
      }

      if (i % 5 === 0 && i > 0) {
        console.log(`   Aguardando... (tentativa ${i}/30)`)
      }
    }

    if (!relatorioData) {
      throw new Error('Relatório não disponível após aguardar')
    }

    console.log(`✅ Relatório baixado: ${Array.isArray(relatorioData) ? relatorioData.length : 1} entradas`)

    // 5. Verificar que todas entradas são da mesma empresa
    console.log('\n5. Verificando que todas entradas são da mesma empresa...')
    if (Array.isArray(relatorioData)) {
      const cnpjsNoRelatorio = new Set()
      for (const entry of relatorioData) {
        const entryCnpj = (entry.CNPJEmpresa || '').replace(/\D/g, '')
        if (entryCnpj && entryCnpj.length === 14) {
          cnpjsNoRelatorio.add(entryCnpj)
        }
      }

      console.log(`✅ ${cnpjsNoRelatorio.size} CNPJ(s) encontrado(s) no relatório`)

      if (cnpjsNoRelatorio.size > 1) {
        console.log('⚠️  Relatório contém múltiplos CNPJs (pode ser grupo)')
      } else {
        const relatorioCnpj = Array.from(cnpjsNoRelatorio)[0]
        if (relatorioCnpj === cnpj) {
          console.log('✅ CNPJ do relatório corresponde ao esperado')
        } else {
          console.log(`⚠️  CNPJ do relatório (${relatorioCnpj}) diferente do esperado (${cnpj})`)
        }
      }
    }

    return {
      success: true,
      cnpj,
      reportEntries: Array.isArray(relatorioData) ? relatorioData.length : 1,
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    return { success: false, error: error.message }
  }
}

// Se tiver token de empresa única, passar como argumento
const singleToken = process.argv[2] || null

testSingleImport(singleToken).then(result => {
  console.log('\n' + '='.repeat(60))
  if (result.success) {
    if (result.skipped) {
      console.log('⚠️  TESTE SINGLE PULADO')
      console.log(`   Motivo: ${result.reason || 'Token não fornecido'}`)
    } else {
      console.log('✅ TESTE SINGLE PASSOU')
      console.log(`   CNPJ: ${result.cnpj}`)
      console.log(`   Entradas: ${result.reportEntries}`)
    }
    process.exit(0)
  } else {
    console.log('❌ TESTE SINGLE FALHOU')
    console.log(`   Erro: ${result.error}`)
    process.exit(1)
  }
})

