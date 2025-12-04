import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = 'eb0e1ef3-516c-4e4a-a043-5b1e45794f42'

/**
 * Login F360 e obter JWT
 */
async function loginF360(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔐 Fazendo login na API F360... (tentativa ${attempt}/${maxRetries})`)
      
      const response = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'FinApp/1.0',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ token: VOLPE_TOKEN }),
      })

      if (!response.ok) {
        const text = await response.text()
        const errorMsg = `F360 Login failed: ${response.status} - ${text}`
        
        if (attempt < maxRetries) {
          console.log(`   ⚠️  ${errorMsg}, tentando novamente...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
        
        throw new Error(errorMsg)
      }

      const data = await response.json()
      const jwt = data.Token || null
      
      if (!jwt) {
        throw new Error('Token JWT não retornado na resposta')
      }
      
      console.log('✅ Login realizado com sucesso')
      console.log(`   JWT: ${jwt.substring(0, 50)}...`)
      return jwt
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('❌ Erro no login F360 após todas as tentativas:', error.message)
        throw error
      }
    }
  }
}

/**
 * Requisição genérica F360
 */
async function f360Request(jwt, endpoint, options = {}, maxRetries = 3) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${F360_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FinApp/1.0',
          'Accept': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        const errorMsg = `F360 ${endpoint}: ${response.status} - ${text}`
        
        // Retry em caso de erro 429 (rate limit) ou 500+
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000) // Exponential backoff, max 10s
          console.log(`   ⚠️  ${errorMsg}, aguardando ${delay}ms antes de tentar novamente...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        throw new Error(errorMsg)
      }

      return response.json()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
    }
  }
}

/**
 * Baixar Plano de Contas
 */
async function baixarPlanoContas(jwt) {
  try {
    console.log(`\n📋 Baixando plano de contas...`)
    
    const response = await f360Request(jwt, '/PlanoDeContasPublicAPI/ListarPlanosContas')
    const planos = response.Result || response.data || []
    
    if (planos.length === 0) {
      console.log('⚠️  Nenhum plano de contas encontrado')
      return []
    }
    
    console.log(`✅ ${planos.length} contas encontradas no plano de contas`)
    console.log(`   Exemplo: ${planos[0]?.Nome || 'N/A'}`)
    return planos
  } catch (error) {
    console.error('❌ Erro ao baixar plano de contas:', error.message)
    throw error
  }
}

/**
 * Gerar relatório contábil geral
 */
async function gerarRelatorio(jwt, dataInicio, dataFim, cnpjEmpresas = []) {
  try {
    console.log(`\n📊 Gerando relatório contábil...`)
    console.log(`   Período: ${dataInicio} a ${dataFim}`)
    console.log(`   Empresas: ${cnpjEmpresas.length > 0 ? cnpjEmpresas.join(', ') : 'Todas'}`)
    
    const body = {
      Data: dataInicio,
      DataFim: dataFim,
      ModeloContabil: 'provisao',
      ModeloRelatorio: 'gerencial',
      ExtensaoDeArquivo: 'json',
      EnviarNotificacaoPorWebhook: false,
      URLNotificacao: '',
      Contas: '',
      CNPJEmpresas: cnpjEmpresas,
    }

    const response = await f360Request(jwt, '/PublicRelatorioAPI/GerarRelatorio', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!response.Ok || !response.Result) {
      throw new Error(`Falha ao gerar relatório: ${JSON.stringify(response)}`)
    }

    console.log(`✅ Relatório gerado com ID: ${response.Result}`)
    return response.Result
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error.message)
    throw error
  }
}

/**
 * Verificar status do relatório
 */
async function verificarStatusRelatorio(jwt, relatorioId) {
  try {
    // Tentar baixar - se der 404 com mensagem de status, extrair status
    try {
      await f360Request(jwt, `/PublicRelatorioAPI/Download?id=${relatorioId}`)
      return 'Finalizado'
    } catch (error) {
      if (error.message.includes("status 'Aguardando'")) {
        return 'Aguardando'
      }
      if (error.message.includes("status 'Processando'")) {
        return 'Processando'
      }
      if (error.message.includes("status 'Erro'")) {
        return 'Erro'
      }
      throw error
    }
  } catch (error) {
    return 'Desconhecido'
  }
}

/**
 * Baixar relatório gerado
 */
async function baixarRelatorio(jwt, relatorioId, maxTentativas = 30) {
  try {
    console.log(`\n⬇️  Aguardando processamento do relatório (ID: ${relatorioId})...`)
    
    // Aguardar processamento (pode levar vários segundos para grupos grandes)
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        const status = await verificarStatusRelatorio(jwt, relatorioId)
        
        if (status === 'Finalizado') {
          console.log(`   ✅ Relatório finalizado, baixando...`)
          const response = await f360Request(jwt, `/PublicRelatorioAPI/Download?id=${relatorioId}`)
          
          // Se retornou dados, sucesso
          if (response && (Array.isArray(response) || typeof response === 'object')) {
            console.log(`✅ Relatório baixado com sucesso (após ${tentativa} tentativas)`)
            return response
          }
        } else if (status === 'Aguardando' || status === 'Processando') {
          if (tentativa % 5 === 0) {
            console.log(`   ⏳ Status: ${status} (tentativa ${tentativa}/${maxTentativas})...`)
          }
          await new Promise(resolve => setTimeout(resolve, 5000)) // 5 segundos
          continue
        } else if (status === 'Erro') {
          throw new Error('Relatório falhou no processamento')
        } else {
          // Tentar baixar mesmo assim
          const response = await f360Request(jwt, `/PublicRelatorioAPI/Download?id=${relatorioId}`)
          if (response && (Array.isArray(response) || typeof response === 'object')) {
            console.log(`✅ Relatório baixado com sucesso`)
            return response
          }
        }
      } catch (error) {
        if (error.message.includes('status') && tentativa < maxTentativas) {
          // Erro de status, continuar aguardando
          if (tentativa % 5 === 0) {
            console.log(`   ⏳ Aguardando processamento (tentativa ${tentativa}/${maxTentativas})...`)
          }
          await new Promise(resolve => setTimeout(resolve, 5000))
          continue
        }
        
        if (tentativa < maxTentativas) {
          console.log(`   ⚠️  Tentativa ${tentativa}/${maxTentativas} - aguardando...`)
          await new Promise(resolve => setTimeout(resolve, 5000))
        } else {
          throw error
        }
      }
    }
    
    throw new Error('Relatório não disponível após todas as tentativas')
  } catch (error) {
    console.error('❌ Erro ao baixar relatório:', error.message)
    throw error
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log('🚀 Teste de API F360 - Grupo Volpe\n')
    console.log('=' .repeat(60))
    
    // 1. Login F360
    const jwt = await loginF360()
    
    // 2. Baixar Plano de Contas
    const planos = await baixarPlanoContas(jwt)
    
    if (planos.length > 0) {
      console.log(`\n📝 Primeiras 3 contas do plano:`)
      planos.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.Nome} (${p.Tipo})`)
      })
    }
    
    // 3. Gerar relatório (último mês como teste)
    const hoje = new Date()
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    
    const dataInicio = primeiroDiaMes.toISOString().split('T')[0]
    const dataFim = ultimoDiaMes.toISOString().split('T')[0]
    
    // Gerar relatório para todas as empresas (CNPJEmpresas vazio = todas)
    console.log(`\n📅 Período do relatório: ${dataInicio} a ${dataFim}`)
    const relatorioId = await gerarRelatorio(jwt, dataInicio, dataFim, [])
    
    // 4. Baixar relatório
    const relatorioData = await baixarRelatorio(jwt, relatorioId)
    
    // 5. Analisar relatório
    console.log(`\n📊 Análise do relatório:`)
    if (Array.isArray(relatorioData)) {
      console.log(`   ✅ Relatório é um array com ${relatorioData.length} entradas`)
      
      if (relatorioData.length > 0) {
        console.log(`\n📝 Primeira entrada (exemplo):`)
        console.log(JSON.stringify(relatorioData[0], null, 2))
        
        // Analisar CNPJs presentes (para identificar se é GROUP)
        const cnpjs = new Set()
        relatorioData.forEach(entry => {
          const cnpj = entry.CNPJ || entry.cnpj || entry.CNPJEmpresa || entry.cnpjEmpresa
          if (cnpj) cnpjs.add(cnpj)
        })
        
        console.log(`\n🏢 CNPJs encontrados no relatório: ${cnpjs.size}`)
        if (cnpjs.size > 0) {
          Array.from(cnpjs).slice(0, 5).forEach(cnpj => {
            console.log(`   - ${cnpj}`)
          })
          if (cnpjs.size > 5) {
            console.log(`   ... e mais ${cnpjs.size - 5} CNPJs`)
          }
        }
        
        // Contar por tipo
        const tipos = {}
        relatorioData.forEach(entry => {
          const tipo = entry.TipoTitulo || entry.tipoTitulo || 'Desconhecido'
          tipos[tipo] = (tipos[tipo] || 0) + 1
        })
        
        console.log(`\n📈 Distribuição por tipo:`)
        Object.entries(tipos).forEach(([tipo, count]) => {
          console.log(`   ${tipo}: ${count}`)
        })
      }
    } else if (typeof relatorioData === 'object') {
      console.log(`   ✅ Relatório é um objeto`)
      console.log(`   Chaves: ${Object.keys(relatorioData).join(', ')}`)
      console.log(`\n📝 Conteúdo (primeiros 500 chars):`)
      console.log(JSON.stringify(relatorioData, null, 2).substring(0, 500))
    } else {
      console.log(`   ⚠️  Formato inesperado: ${typeof relatorioData}`)
    }
    
    // 6. Resumo final
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!')
    console.log(`   ✅ Login: OK`)
    console.log(`   ✅ Plano de contas: ${planos.length} contas`)
    console.log(`   ✅ Relatório gerado: ID ${relatorioId}`)
    console.log(`   ✅ Relatório baixado: ${Array.isArray(relatorioData) ? relatorioData.length + ' entradas' : 'OK'}`)
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()

