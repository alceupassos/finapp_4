import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'

const REFERENCE_FILE = process.argv[2] || 'avant/integracao/f360/DRE_DFC_VOLPE.xlsx'
const PLAN_FILE = process.argv[3] || 'avant/integracao/f360/PlanoDeContas.xlsx'
const OUTPUT_FILE = process.argv[4] || 'public/dados/mappings/account_group_mapping.json'

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function normalizeCode(value) {
  if (!value) return null
  const raw = String(value).trim()
  const match = raw.match(/^(\d{2,}(?:-\d+)*)/)
  return match ? match[1].replace(/\s+/g, '') : null
}

function normalizeLabel(value) {
  if (!value) return null
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase()
}

function parseStructure(sheet, field) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const mapping = {}
  let currentGroup = null

  for (const row of rows) {
    if (!row.length) continue
    const raw = String(row[0] ?? '')
    const trimmed = raw.trim()
    if (!trimmed) continue

    if (/Demonstrativo/i.test(trimmed) || /Nome da Empresa/i.test(trimmed)) continue
    if (/^%/.test(trimmed)) continue

    const isIndented = /^\s{2,}/.test(raw)
    if (!isIndented) {
      currentGroup = trimmed
      continue
    }

    const code = normalizeCode(trimmed)
    const labelKey = normalizeLabel(trimmed)
    if (!labelKey) continue

    if (!mapping[labelKey]) mapping[labelKey] = { code, label: trimmed }
    mapping[labelKey][field] = currentGroup
  }

  return mapping
}

function mergeMappings(target, source) {
  Object.entries(source).forEach(([labelKey, data]) => {
    if (!target[labelKey]) target[labelKey] = { ...data }
    else {
      target[labelKey] = { ...target[labelKey], ...data }
    }
  })
  return target
}

function enrichWithPlan(mapping, planSheet) {
  const rows = XLSX.utils.sheet_to_json(planSheet, { defval: '' })
  for (const row of rows.slice(1)) {
    const name = row['Plano de Contas (Visualizacao/Edicao)']
    if (!name) continue
    const labelKey = normalizeLabel(name)
    const code = normalizeCode(name)
    const accountType = row['__EMPTY']
    if (!mapping[labelKey]) mapping[labelKey] = { code, label: String(name).trim() }
    mapping[labelKey].planName = String(name || '').trim()
    if (accountType) mapping[labelKey].planType = String(accountType).trim()
  }
  return mapping
}

try {
  console.log('📄 Lendo arquivos de referência...')
  const workbook = XLSX.readFile(REFERENCE_FILE)
  const planWorkbook = XLSX.readFile(PLAN_FILE)

  console.log('📑 Extraindo estrutura DRE/DFC...')
  const dreMapping = parseStructure(workbook.Sheets['DRE'], 'dreGroup')
  const dfcMapping = parseStructure(workbook.Sheets['DFC'], 'dfcGroup')

  console.log(`   • DRE: ${Object.keys(dreMapping).length} códigos mapeados`)
  console.log(`   • DFC: ${Object.keys(dfcMapping).length} códigos mapeados`)

  let combined = {}
  combined = mergeMappings(combined, dreMapping)
  combined = mergeMappings(combined, dfcMapping)
  combined = enrichWithPlan(combined, planWorkbook.Sheets['Plano de Contas'])

  const codeIndex = {}
  Object.entries(combined).forEach(([labelKey, item]) => {
    if (!item.code) return
    if (!codeIndex[item.code]) codeIndex[item.code] = []
    codeIndex[item.code].push(labelKey)
  })

  const payload = {
    generated_at: new Date().toISOString(),
    reference_file: path.basename(REFERENCE_FILE),
    plan_file: path.basename(PLAN_FILE),
    items: combined,
    codeIndex
  }

  ensureDir(OUTPUT_FILE)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf-8')
  console.log(`✅ Mapeamento salvo em ${OUTPUT_FILE}`)
  console.log(`   Total de códigos: ${Object.keys(combined).length}`)
} catch (error) {
  console.error('❌ Erro ao gerar mapeamento:', error.message)
  process.exit(1)
}
