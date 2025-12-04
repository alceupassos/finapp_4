import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const F360_BASE_URL = 'https://financas.f360.com.br'
const VOLPE_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'

// 13 empresas do Grupo Volpe
const VOLPE_CNPJS = [
  '26888098000159', // VOLPE MATRIZ
  '26888098000230', // VOLPE ZOIAO
  '26888098000310', // VOLPE MAUÁ
  '26888098000400', // VOLPE DIADEMA
  '26888098000582', // VOLPE GRAJAÚ
  '26888098000663', // VOLPE SANTO ANDRÉ
  '26888098000744', // VOLPE CAMPO LIMPO
  '26888098000825', // VOLPE BRASILÂNDIA
  '26888098000906', // VOLPE POÁ
  '26888098001040', // VOLPE ITAIM
  '26888098001120', // VOLPE PRAIA GRANDE
  '26888098001201', // VOLPE ITANHAÉM
  '26888098001392', // VOLPE SÃO MATHEUS
]

/**
 * Login F360 e obter JWT
 */
async function loginF360() {
  try {
    console.log('🔐 Fazendo login na API F360...')
    const response = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: VOLPE_TOKEN }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`F360 Login failed: ${response.status} - ${text}`)
    }

    const data = await response.json()
    const jwt = data.Token || null
    
    if (!jwt) {
      throw new Error('Token JWT não retornado na resposta')
    }
    
    console.log('✅ Login realizado com sucesso')
    return jwt
  } catch (error) {
    console.error('❌ Erro no login F360:', error.message)
    throw error
  }
}

/**
 * Requisição genérica F360
 */
async function f360Request(jwt, endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${F360_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`F360 ${endpoint}: ${response.status} - ${text}`)
  }

  return response.json()
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
 * Baixar relatório gerado
 */
async function baixarRelatorio(jwt, relatorioId, maxTentativas = 10) {
  try {
    console.log(`\n⬇️  Baixando relatório (ID: ${relatorioId})...`)
    
    // Aguardar processamento (pode levar alguns segundos)
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        const response = await f360Request(jwt, `/PublicRelatorioAPI/Download?id=${relatorioId}`)
        
        // Se retornou dados, sucesso
        if (response && (Array.isArray(response) || typeof response === 'object')) {
          console.log(`✅ Relatório baixado com sucesso (tentativa ${tentativa})`)
          return response
        }
      } catch (error) {
        if (tentativa < maxTentativas) {
          console.log(`   Tentativa ${tentativa}/${maxTentativas} - aguardando processamento...`)
          await new Promise(resolve => setTimeout(resolve, 3000)) // 3 segundos
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
    return planos
  } catch (error) {
    console.error('❌ Erro ao baixar plano de contas:', error.message)
    throw error
  }
}

/**
 * Buscar empresas do Grupo Volpe no banco
 */
async function buscarEmpresasVolpe() {
  try {
    // Usar RPC ou query SQL direta para evitar problemas de cache
    const cnpjsStr = VOLPE_CNPJS.map(c => `'${c}'`).join(',')
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT id, cnpj, razao_social 
        FROM companies 
        WHERE cnpj IN (${cnpjsStr}) 
          AND active = true
      `
    }).catch(async () => {
      // Fallback: tentar query normal
      return await supabase
        .from('companies')
        .select('id, cnpj, razao_social')
        .in('cnpj', VOLPE_CNPJS)
        .eq('active', true)
    })
    
    if (error) {
      // Se ainda falhar, tentar buscar qualquer empresa com o token
      console.log('   ⚠️  Tentando busca alternativa...')
      const { data: altData, error: altError } = await supabase
        .from('companies')
        .select('id, cnpj, razao_social')
        .eq('token_f360', VOLPE_TOKEN)
        .limit(5)
      
      if (altError) throw altError
      return altData || []
    }
    
    return data || []
  } catch (error) {
    console.error('❌ Erro ao buscar empresas:', error.message)
    // Último recurso: retornar lista vazia e deixar o script continuar com fallback
    return []
  }
}

/**
 * Salvar plano de contas no banco
 */
async function salvarPlanoContas(planos, companyId, cnpj) {
  try {
    if (planos.length === 0) return 0
    
    const inserts = planos.map((plano) => ({
      company_id: companyId,
      code: plano.PlanoDeContasId || plano.id || '',
      name: plano.Nome || plano.name || '',
      type: plano.Tipo === 'A receber' ? 'RECEITA' : 'DESPESA',
      parent_code: null,
      level: 1,
      accepts_entries: true,
    }))

    const { error } = await supabase
      .from('chart_of_accounts')
      .upsert(inserts, { onConflict: 'company_id,code' })

    if (error) {
      console.error(`  ❌ Erro ao salvar plano de contas:`, error.message)
      return 0
    }

    return inserts.length
  } catch (error) {
    console.error(`  ❌ Erro ao salvar plano de contas:`, error.message)
    return 0
  }
}

/**
 * Processar e salvar relatório no banco
 */
async function processarRelatorio(relatorioData, empresas) {
  try {
    console.log(`\n💾 Processando relatório e salvando no banco...`)
    
    if (!Array.isArray(relatorioData)) {
      console.log('⚠️  Relatório não é um array, tentando processar como objeto único')
      relatorioData = [relatorioData]
    }
    
    console.log(`   Total de entradas no relatório: ${relatorioData.length}`)
    
    // Criar mapa de CNPJ -> company_id
    const cnpjMap = new Map()
    empresas.forEach(emp => {
      cnpjMap.set(emp.cnpj, emp.id)
    })
    
    // Processar entradas do relatório
    const dreEntries = []
    const dfcEntries = []
    let processadas = 0
    
    for (const entry of relatorioData) {
      // Tentar identificar CNPJ da entrada
      const cnpj = entry.CNPJ || entry.cnpj || entry.CNPJEmpresa || entry.cnpjEmpresa
      
      // Se não tiver CNPJ, usar primeira empresa (consolidado)
      const targetCnpj = cnpj && cnpjMap.has(cnpj) ? cnpj : empresas[0]?.cnpj
      const companyId = cnpjMap.get(targetCnpj)
      
      if (!companyId) {
        console.log(`  ⚠️  CNPJ ${targetCnpj} não encontrado no banco, pulando...`)
        continue
      }
      
      // Processar como DRE (se tiver campos relevantes)
      if (entry.Data || entry.data || entry.DataEmissao || entry.dataEmissao) {
        const date = entry.Data || entry.data || entry.DataEmissao || entry.dataEmissao
        const valor = parseFloat(entry.Valor || entry.valor || entry.ValorLiquido || entry.valorLiquido || 0)
        const account = entry.PlanoDeContas || entry.planoDeContas || entry.Conta || entry.conta || 'Outros'
        const natureza = entry.TipoTitulo === 'Receita' || entry.tipo === 'receita' ? 'receita' : 'despesa'
        
        if (valor !== 0) {
          dreEntries.push({
            company_id: companyId,
            company_cnpj: targetCnpj,
            date: new Date(date).toISOString().split('T')[0],
            account: account,
            account_code: entry.PlanoDeContasId || entry.planoDeContasId || null,
            natureza: natureza,
            valor: valor,
            description: entry.Descricao || entry.descricao || entry.ClienteFornecedor || entry.clienteFornecedor || '',
            source_erp: 'F360',
            source_id: entry.ParcelaId || entry.parcelaId || entry.TituloId || entry.tituloId || entry.id || null,
          })
        }
      }
      
      // Processar como DFC (se tiver data de liquidação)
      if (entry.DataLiquidacao || entry.dataLiquidacao) {
        const date = entry.DataLiquidacao || entry.dataLiquidacao
        const valor = parseFloat(entry.Valor || entry.valor || entry.ValorLiquido || entry.valorLiquido || 0)
        const kind = entry.TipoTitulo === 'Receita' || entry.tipo === 'receita' ? 'in' : 'out'
        const category = entry.PlanoDeContas || entry.planoDeContas || entry.Categoria || entry.categoria || 'Outros'
        
        if (valor !== 0) {
          dfcEntries.push({
            company_id: companyId,
            company_cnpj: targetCnpj,
            date: new Date(date).toISOString().split('T')[0],
            kind: kind,
            category: category,
            amount: valor,
            bank_account: entry.ContaBancaria || entry.contaBancaria || null,
            description: entry.Descricao || entry.descricao || entry.ClienteFornecedor || entry.clienteFornecedor || '',
            source_erp: 'F360',
            source_id: entry.ParcelaId || entry.parcelaId || entry.TituloId || entry.tituloId || entry.id || null,
          })
        }
      }
      
      processadas++
    }
    
    console.log(`   Entradas processadas: ${processadas}`)
    console.log(`   DRE entries preparadas: ${dreEntries.length}`)
    console.log(`   DFC entries preparadas: ${dfcEntries.length}`)
    
    // Salvar DRE entries
    let dreCount = 0
    if (dreEntries.length > 0) {
      const { error: dreError } = await supabase
        .from('dre_entries')
        .upsert(dreEntries, { onConflict: 'company_cnpj,date,account,natureza' })
      
      if (dreError) {
        console.error(`  ❌ Erro ao salvar DRE:`, dreError.message)
      } else {
        dreCount = dreEntries.length
        console.log(`  ✅ ${dreCount} entradas DRE salvas`)
      }
    }
    
    // Salvar DFC entries
    let dfcCount = 0
    if (dfcEntries.length > 0) {
      const { error: dfcError } = await supabase
        .from('dfc_entries')
        .upsert(dfcEntries, { onConflict: 'company_cnpj,date,kind,category,bank_account' })
      
      if (dfcError) {
        console.error(`  ❌ Erro ao salvar DFC:`, dfcError.message)
      } else {
        dfcCount = dfcEntries.length
        console.log(`  ✅ ${dfcCount} entradas DFC salvas`)
      }
    }
    
    return { dre: dreCount, dfc: dfcCount, processadas }
  } catch (error) {
    console.error('❌ Erro ao processar relatório:', error.message)
    throw error
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando teste de importação F360 - Grupo Volpe\n')
    console.log('=' .repeat(60))
    
    // Verificar variáveis de ambiente
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Variáveis de ambiente não configuradas!')
      console.error('   Verifique se .env.local contém:')
      console.error('   - VITE_SUPABASE_URL')
      console.error('   - SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }
    
    // 1. Buscar empresas do Grupo Volpe no banco
    console.log('\n📋 Buscando empresas do Grupo Volpe no banco...')
    console.log(`   Supabase URL: ${process.env.VITE_SUPABASE_URL?.substring(0, 30)}...`)
    
    const empresas = await buscarEmpresasVolpe()
    
    if (empresas.length === 0) {
      console.log('⚠️  Nenhuma empresa do Grupo Volpe encontrada no banco')
      console.log('   Tentando buscar qualquer empresa com token F360...')
      
      // Buscar qualquer empresa com token F360 como fallback
      const { data: fallback } = await supabase
        .from('companies')
        .select('id, cnpj, razao_social')
        .eq('token_f360', VOLPE_TOKEN)
        .eq('active', true)
        .limit(1)
      
      if (fallback && fallback.length > 0) {
        console.log(`   ✅ Usando empresa: ${fallback[0].cnpj} - ${fallback[0].razao_social}`)
        empresas.push(...fallback)
      } else {
        console.log('❌ Nenhuma empresa encontrada. Execute primeiro o script de cadastro de empresas')
        process.exit(1)
      }
    }
    
    console.log(`✅ ${empresas.length} empresas encontradas:`)
    empresas.forEach(emp => {
      console.log(`   - ${emp.cnpj}: ${emp.razao_social}`)
    })
    
    // 2. Login F360
    const jwt = await loginF360()
    
    // 3. Baixar Plano de Contas
    const planos = await baixarPlanoContas(jwt)
    
    // Salvar plano de contas para primeira empresa (como exemplo)
    if (planos.length > 0 && empresas.length > 0) {
      console.log(`\n💾 Salvando plano de contas para ${empresas[0].razao_social}...`)
      const saved = await salvarPlanoContas(planos, empresas[0].id, empresas[0].cnpj)
      console.log(`✅ ${saved} contas salvas`)
    }
    
    // 4. Gerar relatório (último mês como teste)
    const hoje = new Date()
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    
    const dataInicio = primeiroDiaMes.toISOString().split('T')[0]
    const dataFim = ultimoDiaMes.toISOString().split('T')[0]
    
    // Gerar relatório para todas as empresas (CNPJEmpresas vazio = todas)
    const relatorioId = await gerarRelatorio(jwt, dataInicio, dataFim, [])
    
    // 5. Baixar relatório
    const relatorioData = await baixarRelatorio(jwt, relatorioId)
    
    // 6. Processar e salvar no banco
    const resultado = await processarRelatorio(relatorioData, empresas)
    
    // 7. Resumo final
    console.log('\n' + '='.repeat(60))
    console.log('\n📊 RESUMO DA IMPORTAÇÃO:')
    console.log(`   ✅ Empresas processadas: ${empresas.length}`)
    console.log(`   ✅ Plano de contas: ${planos.length} contas`)
    console.log(`   ✅ Entradas DRE salvas: ${resultado.dre}`)
    console.log(`   ✅ Entradas DFC salvas: ${resultado.dfc}`)
    console.log(`   ✅ Total processado: ${resultado.processadas}`)
    console.log('\n✅ Teste concluído com sucesso!')
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()

