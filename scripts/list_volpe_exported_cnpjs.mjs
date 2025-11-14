import fs from 'fs'
import path from 'path'

const root = process.cwd()
const folder = path.join(root, 'avant', 'exportado')

if (!fs.existsSync(folder)) {
  console.error(`Pasta ${folder} não encontrada. Copie as exportações antes de rodar este helper.`)
  process.exit(1)
}

const files = fs.readdirSync(folder).filter(file => file.match(/\.(xlsx|csv|json)$/i) && !file.startsWith('~$'))
const digits = new Set()

files.forEach(file => {
  const matches = file.match(/\d{14}/g) || []
  const fallback = file.replace(/\D/g, '')
  if (matches.length) {
    matches.forEach(value => digits.add(value))
  } else if (fallback.length >= 14) {
    digits.add(fallback.slice(0, 14))
  }
})

if (!digits.size) {
  console.log('Nenhum CNPJ detectado nas exportações. Verifique os nomes dos arquivos.')
  process.exit(0)
}

const sorted = Array.from(digits).sort()
console.log(sorted.join('\n'))
console.log(`\nTotal: ${sorted.length} CNPJs`)