import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

// 13 empresas do Grupo Volpe
const VOLPE_CNPJS = [
  '26888098000159', '26888098000230', '26888098000310',
  '26888098000400', '26888098000582', '26888098000663',
  '26888098000744', '26888098000825', '26888098000906',
  '26888098001040', '26888098001120', '26888098001201',
  '26888098001392',
]

/**
 * Teste de importação GROUP
 */
async function testGroupImport() {
  console.log('🧪 Teste de Importação GROUP (Token Volpe)\n')
  console.log('='.repeat(60))

  try {
    // 1. Login
    console.log('1. Fazendo login...')
    const loginResponse = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: VOLPE_TOKEN }),
    })

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`)
    }

    const { Token: jwt } = await loginResponse.json()
    console.log('✅ Login realizado')

    // 2. Listar contas bancárias para descobrir CNPJs
    console.log('\n2. Descobrindo empresas via contas bancárias...')
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

    console.log(`✅ ${cnpjsEncontrados.size} CNPJs encontrados`)
    console.log(`   Esperados: ${VOLPE_CNPJS.length}`)

    // Verificar se encontrou pelo menos alguns CNPJs esperados
    const encontradosEsperados = Array.from(cnpjsEncontrados).filter(cnpj =>
      VOLPE_CNPJS.includes(cnpj)
    )

    console.log(`   CNPJs esperados encontrados: ${encontradosEsperados.length}/${VOLPE_CNPJS.length}`)

    // 3. Gerar relatório para todas empresas (CNPJEmpresas vazio)
    console.log('\n3. Gerando relatório para todas empresas do grupo...')
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
      CNPJEmpresas: [], // Vazio = todas empresas
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

    // 5. Analisar CNPJs no relatório
    console.log('\n5. Analisando CNPJs no relatório...')
    const cnpjsNoRelatorio = new Set()
    if (Array.isArray(relatorioData)) {
      for (const entry of relatorioData) {
        const cnpj = (entry.CNPJEmpresa || '').replace(/\D/g, '')
        if (cnpj && cnpj.length === 14) {
          cnpjsNoRelatorio.add(cnpj)
        }
      }
    }

    console.log(`✅ ${cnpjsNoRelatorio.size} CNPJs únicos encontrados no relatório`)

    // Verificar se todos os CNPJs esperados estão no relatório
    const todosPresentes = VOLPE_CNPJS.every(cnpj => cnpjsNoRelatorio.has(cnpj))
    console.log(`   Todos os CNPJs esperados presentes: ${todosPresentes ? '✅' : '⚠️'}`)

    if (!todosPresentes) {
      const faltantes = VOLPE_CNPJS.filter(cnpj => !cnpjsNoRelatorio.has(cnpj))
      console.log(`   CNPJs faltantes: ${faltantes.length}`)
      faltantes.slice(0, 5).forEach(cnpj => console.log(`     - ${cnpj}`))
    }

    return {
      success: true,
      companiesFound: cnpjsEncontrados.size,
      companiesInReport: cnpjsNoRelatorio.size,
      reportEntries: Array.isArray(relatorioData) ? relatorioData.length : 1,
      allExpectedPresent: todosPresentes,
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    return { success: false, error: error.message }
  }
}

testGroupImport().then(result => {
  console.log('\n' + '='.repeat(60))
  if (result.success) {
    console.log('✅ TESTE GROUP PASSOU')
    console.log(`   Empresas encontradas: ${result.companiesFound}`)
    console.log(`   Empresas no relatório: ${result.companiesInReport}`)
    console.log(`   Entradas no relatório: ${result.reportEntries}`)
    process.exit(0)
  } else {
    console.log('❌ TESTE GROUP FALHOU')
    console.log(`   Erro: ${result.error}`)
    process.exit(1)
  }
})

