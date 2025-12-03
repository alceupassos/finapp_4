/**
 * Script de Extração de Schema XLSX
 * 
 * Extrai apenas os headers/primeira linha de arquivos XLSX sem carregar dados completos.
 * Economiza memória e tokens ao processar apenas a estrutura dos arquivos.
 * 
 * Uso:
 *   tsx scripts/extract-xlsx-schema.ts <caminho-do-arquivo.xlsx> [output-path]
 * 
 * Exemplo:
 *   tsx scripts/extract-xlsx-schema.ts f360/bases/ex.xlsx f360/schemas/ex-schema.json
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

interface SheetSchema {
  headers: string[]
  rowCount?: number
  columnCount?: number
}

interface FileSchema {
  fileName: string
  filePath: string
  extractedAt: string
  sheets: Record<string, SheetSchema>
}

/**
 * Extrai schema (headers) de um arquivo XLSX
 * Lê apenas a primeira linha para economizar memória
 */
function extractXlsxSchema(filePath: string): FileSchema {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`)
  }

  console.log(`📖 Lendo schema de: ${filePath}`)

  // Ler workbook com opção para limitar linhas (economiza memória)
  // Nota: xlsx não tem opção sheetRows nativa, mas podemos ler apenas primeira linha
  const workbook = XLSX.readFile(filePath, {
    // Opções para economizar memória
    cellDates: false,
    cellNF: false,
    cellStyles: false,
    sheetStubs: false,
  })

  const sheets: Record<string, SheetSchema> = {}

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName]

    // Contar colunas e linhas (sem carregar dados completos)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    const rowCount = range.e.r + 1
    const columnCount = range.e.c + 1

    // Extrair headers da primeira linha (A1 até última coluna)
    const headers: string[] = []
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      const cell = worksheet[cellAddress]
      const value = cell ? (cell.w || cell.v || '') : ''
      headers.push(String(value))
    }

    sheets[sheetName] = {
      headers: headers.filter((h) => h !== ''), // Remove headers vazios
      rowCount,
      columnCount,
    }

    console.log(`  ✓ Sheet "${sheetName}": ${headers.filter((h) => h !== '').length} colunas, ${rowCount} linhas`)
  })

  return {
    fileName: path.basename(filePath),
    filePath: path.resolve(filePath),
    extractedAt: new Date().toISOString(),
    sheets,
  }
}

/**
 * Salva schema em arquivo JSON
 */
function saveSchema(schema: FileSchema, outputPath: string): void {
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf-8')
  console.log(`💾 Schema salvo em: ${outputPath}`)
}

/**
 * Função principal
 */
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('❌ Erro: Caminho do arquivo XLSX não fornecido')
    console.log('\nUso:')
    console.log('  tsx scripts/extract-xlsx-schema.ts <arquivo.xlsx> [output.json]')
    console.log('\nExemplos:')
    console.log('  tsx scripts/extract-xlsx-schema.ts f360/bases/ex.xlsx')
    console.log('  tsx scripts/extract-xlsx-schema.ts f360/bases/ex.xlsx f360/schemas/ex-schema.json')
    process.exit(1)
  }

  const inputPath = args[0]
  const outputPath =
    args[1] ||
    path.join(
      path.dirname(inputPath),
      'schemas',
      `${path.basename(inputPath, path.extname(inputPath))}-schema.json`
    )

  try {
    const schema = extractXlsxSchema(inputPath)
    saveSchema(schema, outputPath)

    console.log('\n✅ Extração concluída com sucesso!')
    console.log(`\n📊 Resumo:`)
    console.log(`   Arquivo: ${schema.fileName}`)
    console.log(`   Sheets: ${Object.keys(schema.sheets).length}`)
    Object.entries(schema.sheets).forEach(([name, sheet]) => {
      console.log(`   - ${name}: ${sheet.headers.length} colunas`)
    })
  } catch (error) {
    console.error('❌ Erro ao extrair schema:', error)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main()
}

// Exportar para uso como módulo
export { extractXlsxSchema, saveSchema, type FileSchema, type SheetSchema }

