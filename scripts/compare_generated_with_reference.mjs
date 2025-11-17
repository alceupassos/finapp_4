import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'

const args = process.argv.slice(2).reduce((acc, curr) => {
  const [key, value] = curr.split('=')
  if (key && value) acc[key.replace(/^--/, '')] = value
  return acc
}, {})

const cnpj = args.cnpj || '26888098000159'
const generatedDir = args.generated || 'var/generated'
const referenceFile = args.reference || 'avant/integracao/f360/DRE_DFC_VOLPE.xlsx'
const tolerance = args.tolerance ? Number(args.tolerance) : 1

const monthMap = {
  'janeiro': '01',
  'fevereiro': '02',
  'março': '03',
  'marco': '03',
  'abril': '04',
  'maio': '05',
  'junho': '06',
  'julho': '07',
  'agosto': '08',
  'setembro': '09',
  'outubro': '10',
  'novembro': '11',
  'dezembro': '12'
}

function normalizeKey(account, month) {
  return `${account}|${month}`
}

function parseReferenceSheet(sheet, yearLabel = '2025') {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  let headerRow = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(cell => String(cell).toLowerCase().includes('janeiro'))) {
      headerRow = i
      break
    }
  }
  if (headerRow === -1) throw new Error('Cabeçalho não encontrado na aba de referência')

  const months = rows[headerRow].slice(1, 13)
  const values = new Map()
  let currentGroup = null

  for (let i = headerRow + 1; i < rows.length; i++) {
    const label = String(rows[i][0] || '')
    if (!label.trim()) continue

    const isIndented = /^\s{2,}/.test(label)
    if (!isIndented) {
      currentGroup = label.trim()
      continue
    }

    const accountName = label.trim()
    for (let idx = 0; idx < months.length; idx++) {
      const monthName = months[idx]
      const rawValue = rows[i][idx + 1]
      const amount = Number(rawValue) || 0
      if (!monthName || amount === 0) continue
      const monthNumber = monthMap[String(monthName).toLowerCase()]
      if (!monthNumber) continue
      const monthKey = `${yearLabel}-${monthNumber}`
      values.set(normalizeKey(accountName, monthKey), amount)
    }
  }
  return values
}

function loadGeneratedDRE(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const map = new Map()
  data.forEach(item => {
    const month = item.date.slice(0, 7)
    map.set(normalizeKey(item.account, month), Number(item.amount) || 0)
  })
  return map
}

function parseReferenceDFC(sheet, yearLabel = '2025') {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  let headerRow = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(cell => String(cell).toLowerCase().includes('janeiro'))) {
      headerRow = i
      break
    }
  }
  if (headerRow === -1) throw new Error('Cabeçalho não encontrado na aba DFC')

  const months = rows[headerRow].slice(1, 13)
  const values = new Map()
  let currentGroup = null

  for (let i = headerRow + 1; i < rows.length; i++) {
    const label = String(rows[i][0] || '')
    if (!label.trim()) continue
    const isIndented = /^\s{2,}/.test(label)
    if (!isIndented) {
      currentGroup = label.trim()
      continue
    }
    const accountName = `${currentGroup} - ${label.trim()}`
    for (let idx = 0; idx < months.length; idx++) {
      const monthName = months[idx]
      const rawValue = rows[i][idx + 1]
      const amount = Number(rawValue) || 0
      if (!monthName || amount === 0) continue
      const monthNumber = monthMap[String(monthName).toLowerCase()]
      if (!monthNumber) continue
      const monthKey = `${yearLabel}-${monthNumber}`
      const key = normalizeKey(accountName, monthKey)
      values.set(key, amount)
    }
  }
  return values
}

function loadGeneratedDFC(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const map = new Map()
  data.forEach(item => {
    const month = item.date.slice(0, 7)
    const prefix = item.kind === 'in' ? 'Entrada' : 'Saída'
    const key = normalizeKey(`${prefix} - ${item.category}`, month)
    map.set(key, (map.get(key) || 0) + Number(item.amount || 0))
  })
  return map
}

function compareMaps(reference, generated, label) {
  const keys = new Set([...reference.keys(), ...generated.keys()])
  const diffs = []
  for (const key of keys) {
    const refVal = reference.get(key) || 0
    const genVal = generated.get(key) || 0
    const diff = Math.round((genVal - refVal) * 100) / 100
    if (Math.abs(diff) > tolerance) {
      diffs.push({ key, refVal, genVal, diff })
    }
  }
  console.log(`\n🔍 Comparação ${label}`)
  if (!diffs.length) {
    console.log('   ✅ Todos os valores estão dentro da tolerância')
  } else {
    diffs
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 20)
      .forEach(item => console.log(`   ⚠️ ${item.key}: ref=${item.refVal} | gerado=${item.genVal} | dif=${item.diff}`))
    console.log(`   • Diferenças totais: ${diffs.length}`)
  }
}

try {
  const workbook = XLSX.readFile(referenceFile)
  const referenceDRE = parseReferenceSheet(workbook.Sheets['DRE'])
  const referenceDFC = parseReferenceSheet(workbook.Sheets['DFC'])
  const generatedDRE = loadGeneratedDRE(path.join(generatedDir, `dre_${cnpj}.json`))
  const generatedDFC = loadGeneratedDFC(path.join(generatedDir, `dfc_${cnpj}.json`))

  compareMaps(referenceDRE, generatedDRE, 'DRE')
  compareMaps(referenceDFC, generatedDFC, 'DFC')
} catch (error) {
  console.error('❌ Erro na comparação:', error.message)
  process.exit(1)
}
