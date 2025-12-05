/**
 * Script temporário para aplicar batch DRE 1
 * Lê o arquivo completo e aplica via migration
 */
import fs from 'fs'

const content = fs.readFileSync('import_dre_batch_1.sql', 'utf-8')
console.log(`Arquivo lido: ${content.length} bytes, ${content.split('\n').length} linhas`)
console.log(`Primeira linha: ${content.split('\n')[0]}`)
console.log(`Última linha: ${content.split('\n').slice(-1)[0]}`)

