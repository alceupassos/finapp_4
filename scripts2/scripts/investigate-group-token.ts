/**
 * Script de Investigação da API de Grupos F360
 * 
 * Investiga como acessar CNPJs de empresas dentro de grupos usando tokens de grupo.
 * Lê apenas tokens do arquivo grupo.xlsx sem carregar dados completos.
 * 
 * Uso:
 *   tsx scripts/investigate-group-token.ts
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { F360Client } from '../src/lib/f360/client-definitivo'

interface InvestigationResult {
  token: string
  timestamp: string
  endpoints: Record<string, {
    success: boolean
    data?: unknown
    error?: string
    cnpjsFound?: string[]
  }>
  summary: {
    totalEndpoints: number
    successful: number
    failed: number
    uniqueCnpjs: number
  }
}

/**
 * Extrai apenas tokens do arquivo grupo.xlsx
 * Lê apenas a primeira coluna de tokens (economiza memória)
 */
function extractTokensOnly(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`)
  }

  console.log(`📖 Extraindo tokens de: ${filePath}`)

  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
    cellNF: false,
    cellStyles: false,
    sheetStubs: false,
  })

  const tokens: string[] = []
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  if (!worksheet['!ref']) {
    throw new Error('Planilha vazia ou inválida')
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'])

  // Assumir que tokens estão na coluna B (índice 1)
  // Pular primeira linha (header)
  for (let row = 1; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 })
    const cell = worksheet[cellAddress]
    if (cell && cell.v) {
      const token = String(cell.v).trim()
      if (token && token.length > 10) {
        // Validar que parece um token (UUID ou similar)
        tokens.push(token)
      }
    }
  }

  console.log(`  ✓ Encontrados ${tokens.length} tokens`)
  return tokens
}

/**
 * Extrai CNPJs de um objeto de dados
 */
function extractCnpjs(data: unknown): string[] {
  const cnpjs = new Set<string>()

  const extractFromObject = (obj: any, depth = 0): void => {
    if (depth > 5) return // Limitar profundidade para evitar loops

    if (Array.isArray(obj)) {
      obj.forEach(item => extractFromObject(item, depth + 1))
    } else if (obj && typeof obj === 'object') {
      for (const key in obj) {
        const value = obj[key]
        
        // Procurar por campos que possam conter CNPJ
        if (typeof value === 'string') {
          // Padrão CNPJ: XX.XXX.XXX/XXXX-XX ou apenas números
          const cnpjMatch = value.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/)
          if (cnpjMatch) {
            // Normalizar CNPJ (remover formatação)
            const cnpj = cnpjMatch[0].replace(/[.\/-]/g, '')
            if (cnpj.length === 14) {
              cnpjs.add(cnpj)
            }
          }
        } else {
          extractFromObject(value, depth + 1)
        }
      }
    }
  }

  extractFromObject(data)
  return Array.from(cnpjs)
}

/**
 * Investiga endpoints F360 para descobrir CNPJs
 */
async function investigateGroupAPI(token: string): Promise<InvestigationResult> {
  console.log(`\n🔍 Investigando token: ${token.substring(0, 20)}...`)

  const client = new F360Client(token)
  const results: InvestigationResult['endpoints'] = {}
  const allCnpjs = new Set<string>()

  // Endpoint 1: Listar Contas Bancárias (pode conter CNPJs)
  // Nota: Este endpoint não está no cliente definitivo, vamos usar fetch direto
  try {
    console.log('  Testando ListarContasBancarias...')
    // Autenticar primeiro
    const authResponse = await fetch('https://financas.f360.com.br/PublicLoginAPI/DoLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const authData = await authResponse.json()
    const jwt = authData.Token

    // Fazer requisição para listar contas bancárias
    const response = await fetch(
      'https://financas.f360.com.br/ContaBancariaPublicAPI/ListarContasBancarias',
      {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const data = await response.json()

    const cnpjs = extractCnpjs(data)
    cnpjs.forEach(cnpj => allCnpjs.add(cnpj))

    results.listar_contas_bancarias = {
      success: true,
      data: Array.isArray(data) ? data.slice(0, 3) : (data.Result ? data.Result.slice(0, 3) : data),
      cnpjsFound: cnpjs,
    }
    console.log(`    ✓ Encontrados ${cnpjs.length} CNPJs`)
  } catch (error) {
    results.listar_contas_bancarias = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    console.log(`    ✗ Erro: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  // Endpoint 2: Listar Pessoas (pode conter CNPJs de empresas)
  try {
    console.log('  Testando ListarPessoas...')
    const pessoas = await client.listarPessoas(1, 'ambos')
    const cnpjs = extractCnpjs(pessoas)
    cnpjs.forEach(cnpj => allCnpjs.add(cnpj))

    results.listar_pessoas = {
      success: true,
      data: Array.isArray(pessoas) ? pessoas.slice(0, 3) : pessoas,
      cnpjsFound: cnpjs,
    }
    console.log(`    ✓ Encontrados ${cnpjs.length} CNPJs`)
  } catch (error) {
    results.listar_pessoas = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    console.log(`    ✗ Erro: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  // Endpoint 3: Gerar Relatório Contábil (pode conter CNPJs)
  try {
    console.log('  Testando GerarRelatorioContabil...')
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]

    const relatorio = await client.gerarRelatorioContabil({
      Data: inicioMes,
      DataFim: fimMes,
      ModeloContabil: 'provisao',
      ModeloRelatorio: 'gerencial',
      ExtensaoDeArquivo: 'json',
      CNPJEmpresas: [],
      Pagina: 1,
      RegistrosPorPagina: 100,
    })

    const cnpjs = extractCnpjs(relatorio)
    cnpjs.forEach(cnpj => allCnpjs.add(cnpj))

    results.gerar_relatorio_contabil = {
      success: true,
      data: relatorio,
      cnpjsFound: cnpjs,
    }
    console.log(`    ✓ Encontrados ${cnpjs.length} CNPJs`)
  } catch (error) {
    results.gerar_relatorio_contabil = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    console.log(`    ✗ Erro: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  const successful = Object.values(results).filter(r => r.success).length
  const failed = Object.values(results).filter(r => !r.success).length

  return {
    token: token.substring(0, 20) + '...', // Não expor token completo
    timestamp: new Date().toISOString(),
    endpoints: results,
    summary: {
      totalEndpoints: Object.keys(results).length,
      successful,
      failed,
      uniqueCnpjs: allCnpjs.size,
    },
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    const grupoFilePath = path.resolve(__dirname, '../f360/clientes/grupo.xlsx')
    
    console.log('🚀 Iniciando investigação da API de Grupos F360\n')

    // Extrair tokens
    const tokens = extractTokensOnly(grupoFilePath)
    
    if (tokens.length === 0) {
      console.error('❌ Nenhum token encontrado no arquivo')
      process.exit(1)
    }

    // Testar com os primeiros 3 tokens (para não demorar muito)
    const testTokens = tokens.slice(0, 3)
    console.log(`\n📊 Testando com ${testTokens.length} tokens (de ${tokens.length} disponíveis)\n`)

    const allResults: InvestigationResult[] = []

    for (const token of testTokens) {
      try {
        const result = await investigateGroupAPI(token)
        allResults.push(result)
      } catch (error) {
        console.error(`❌ Erro ao investigar token: ${error}`)
      }
    }

    // Gerar relatório consolidado
    const report = {
      investigationDate: new Date().toISOString(),
      tokensTested: testTokens.length,
      results: allResults,
      summary: {
        totalCnpjsFound: new Set(
          allResults.flatMap(r => 
            Object.values(r.endpoints)
              .flatMap(e => e.cnpjsFound || [])
          )
        ).size,
        mostSuccessfulEndpoint: Object.entries(
          allResults.reduce((acc, r) => {
            Object.keys(r.endpoints).forEach(endpoint => {
              if (!acc[endpoint]) acc[endpoint] = { success: 0, failed: 0 }
              const ep = r.endpoints[endpoint]
              if (ep.success) acc[endpoint].success++
              else acc[endpoint].failed++
            })
            return acc
          }, {} as Record<string, { success: number; failed: number }>)
        ).sort((a, b) => b[1].success - a[1].success)[0]?.[0] || 'N/A',
      },
    }

    // Salvar relatório
    const reportPath = path.resolve(__dirname, '../f360/docs/grupo-api-discovery.md')
    const reportContent = `# F360 Group API Investigation Results

**Data:** ${new Date().toLocaleString('pt-BR')}
**Tokens Testados:** ${testTokens.length} de ${tokens.length} disponíveis

## Resumo Executivo

- **Total de CNPJs encontrados:** ${report.summary.totalCnpjsFound}
- **Endpoint mais bem-sucedido:** ${report.summary.mostSuccessfulEndpoint}

## Resultados por Token

${allResults.map((result, idx) => `
### Token ${idx + 1}

- **Endpoints testados:** ${result.summary.totalEndpoints}
- **Sucessos:** ${result.summary.successful}
- **Falhas:** ${result.summary.failed}
- **CNPJs únicos encontrados:** ${result.summary.uniqueCnpjs}

#### Detalhes dos Endpoints:

${Object.entries(result.endpoints).map(([name, ep]) => `
**${name}:**
- Status: ${ep.success ? '✅ Sucesso' : '❌ Falha'}
${ep.success ? `- CNPJs encontrados: ${ep.cnpjsFound?.length || 0}` : ''}
${ep.error ? `- Erro: ${ep.error}` : ''}
`).join('\n')}
`).join('\n')}

## Recomendações

${report.summary.totalCnpjsFound > 0 
  ? `✅ **CNPJs podem ser extraídos dos endpoints testados.**

**Abordagem recomendada:**
1. Usar o endpoint **${report.summary.mostSuccessfulEndpoint}** como método principal
2. Extrair CNPJs dos dados retornados
3. Criar empresas no banco de dados com os CNPJs encontrados
4. Associar empresas filhas ao grupo pai usando \`parent_company_id\`
`
  : `⚠️ **Nenhum CNPJ foi encontrado nos endpoints testados.**

**Próximos passos:**
1. Testar endpoints adicionais da API F360
2. Verificar documentação oficial da API
3. Contatar suporte F360 para esclarecimentos sobre acesso a empresas de grupo
`}

## Dados Brutos

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`
`

    fs.writeFileSync(reportPath, reportContent, 'utf-8')
    console.log(`\n✅ Relatório salvo em: ${reportPath}`)
    console.log(`\n📊 Resumo:`)
    console.log(`   CNPJs encontrados: ${report.summary.totalCnpjsFound}`)
    console.log(`   Endpoint mais bem-sucedido: ${report.summary.mostSuccessfulEndpoint}`)

  } catch (error) {
    console.error('❌ Erro na investigação:', error)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

export { investigateGroupAPI, extractTokensOnly, extractCnpjs }

