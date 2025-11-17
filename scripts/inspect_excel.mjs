import XLSX from 'xlsx'

const filePath = process.argv[2]

if (!filePath) {
  console.error('Uso: node inspect_excel.mjs <caminho-do-arquivo>')
  process.exit(1)
}

console.log(`\n📄 Analisando: ${filePath}\n`)

try {
  const workbook = XLSX.readFile(filePath)
  
  console.log(`📋 Abas encontradas (${workbook.SheetNames.length}):`)
  workbook.SheetNames.forEach((name, idx) => {
    console.log(`  ${idx + 1}. ${name}`)
  })
  
  console.log('\n📊 Estrutura de cada aba:\n')
  
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    
    console.log(`\n▶ Aba: "${sheetName}"`)
    console.log(`  Registros: ${data.length}`)
    
    if (data.length > 0) {
      const firstRow = data[0]
      console.log(`  Colunas (${Object.keys(firstRow).length}):`)
      Object.keys(firstRow).forEach(col => {
        const sampleValue = firstRow[col]
        const valueType = typeof sampleValue
        console.log(`    - ${col} (${valueType}): ${String(sampleValue).substring(0, 50)}`)
      })
      
      // Mostrar primeiras 3 linhas
      console.log(`\n  Primeiras 3 linhas:`)
      data.slice(0, 3).forEach((row, idx) => {
        console.log(`    ${idx + 1}. ${JSON.stringify(row).substring(0, 100)}...`)
      })
    }
  })
  
  console.log('\n✅ Análise concluída\n')
  
} catch (error) {
  console.error('❌ Erro ao analisar arquivo:', error.message)
  process.exit(1)
}
