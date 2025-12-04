/**
 * Script para consolidar dados F360 e importar via MCP Supabase
 * Agrupa registros duplicados e soma valores antes de inserir
 */

import fs from 'fs'

function parseSQLValues(sqlContent) {
  const lines = sqlContent.split('\n')
  const values = []
  let inValues = false
  
  for (const line of lines) {
    if (line.includes('INSERT INTO')) {
      inValues = true
      continue
    }
    if (line.includes('ON CONFLICT') || line.trim() === '') {
      inValues = false
      continue
    }
    if (inValues && line.trim().startsWith('(')) {
      // Extrair valores da linha
      const match = line.match(/\((.+)\)/)
      if (match) {
        const parts = match[1].split(',').map(p => p.trim())
        if (parts.length >= 10) {
          values.push({
            company_id: parts[0].replace(/'/g, ''),
            company_cnpj: parts[1].replace(/'/g, ''),
            date: parts[2].replace(/'/g, ''),
            account: parts[3].replace(/'/g, ''),
            account_code: parts[4] === 'NULL' ? null : parts[4].replace(/'/g, ''),
            natureza: parts[5].replace(/'/g, ''),
            valor: parseFloat(parts[6]),
            description: parts[7].replace(/'/g, ''),
            source_erp: parts[8].replace(/'/g, ''),
            source_id: parts[9] === 'NULL' ? null : parts[9].replace(/'/g, ''),
          })
        }
      }
    }
  }
  
  return values
}

function consolidateDRE(entries) {
  const map = new Map()
  
  for (const entry of entries) {
    const key = `${entry.company_cnpj}|${entry.date}|${entry.account}|${entry.natureza}`
    const existing = map.get(key)
    
    if (existing) {
      // Soma valores duplicados
      existing.valor += entry.valor
      // Mantém a primeira descrição ou concatena
      if (existing.description !== entry.description) {
        existing.description = `${existing.description}; ${entry.description}`
      }
    } else {
      map.set(key, { ...entry })
    }
  }
  
  return Array.from(map.values())
}

function generateSQL(table, entries, conflictColumns) {
  if (entries.length === 0) return ''
  
  const columns = Object.keys(entries[0])
  const values = entries.map(e => {
    return '(' + columns.map(col => {
      const val = e[col]
      if (val === null || val === undefined) return 'NULL'
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
      if (typeof val === 'number') return val
      return `'${String(val)}'`
    }).join(', ') + ')'
  }).join(',\n    ')

  const conflictClause = conflictColumns 
    ? `ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET
      ${columns.filter(c => !conflictColumns.includes(c) && c !== 'created_at').map(c => `${c} = EXCLUDED.${c}`).join(',\n      ')},
      updated_at = NOW()`
    : ''

  return `
INSERT INTO ${table} (${columns.join(', ')})
VALUES
    ${values}
${conflictClause};
`
}

async function main() {
  console.log('🔄 Consolidando dados F360 para importação...\n')
  
  // Ler arquivos SQL
  const dreSQL = fs.readFileSync('f360_import_october_dre_only.sql', 'utf-8')
  const dfcSQL = fs.readFileSync('f360_import_october_dfc_only.sql', 'utf-8')
  const accountingSQL = fs.readFileSync('f360_import_october_accounting_only.sql', 'utf-8')
  
  // Parse e consolidar DRE
  console.log('📊 Processando DRE...')
  const dreEntries = parseSQLValues(dreSQL)
  console.log(`   Encontrados: ${dreEntries.length} registros`)
  const consolidatedDRE = consolidateDRE(dreEntries)
  console.log(`   Após consolidação: ${consolidatedDRE.length} registros únicos`)
  
  // Parse DFC (sem consolidação por enquanto)
  console.log('\n💰 Processando DFC...')
  const dfcEntries = parseSQLValues(dfcSQL)
  console.log(`   Encontrados: ${dfcEntries.length} registros`)
  
  // Parse Accounting
  console.log('\n📝 Processando Accounting...')
  const accountingEntries = parseSQLValues(accountingSQL)
  console.log(`   Encontrados: ${accountingEntries.length} registros`)
  
  // Gerar SQL consolidado
  const sqlDre = generateSQL('dre_entries', consolidatedDRE, ['company_cnpj', 'date', 'account', 'natureza'])
  const sqlDfc = generateSQL('dfc_entries', dfcEntries, ['company_cnpj', 'date', 'kind', 'category', 'bank_account'])
  const sqlAccounting = generateSQL('accounting_entries', accountingEntries, null)
  
  // Salvar SQL consolidado
  const fullSQL = `-- Importação F360 2025 - VOLPE MATRIZ - Outubro (CONSOLIDADO)\n\n${sqlDre}\n${sqlDfc}\n${sqlAccounting}`
  fs.writeFileSync('f360_import_october_consolidated.sql', fullSQL)
  
  console.log('\n✅ SQL consolidado salvo em f360_import_october_consolidated.sql')
  console.log(`\n📊 Resumo:`)
  console.log(`   DRE: ${consolidatedDRE.length} registros únicos (${dreEntries.length - consolidatedDRE.length} duplicatas removidas)`)
  console.log(`   DFC: ${dfcEntries.length} registros`)
  console.log(`   Accounting: ${accountingEntries.length} registros`)
}

main().catch(console.error)

