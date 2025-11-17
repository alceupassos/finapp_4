import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MATRIZ_CNPJ = '26888098000159'
const MATRIZ_NAME = 'GRUPO VOLPE - MATRIZ'

async function importConsolidatedReports() {
  console.log('📊 Importando DRE e DFC consolidados...\n')
  
  const workbook = XLSX.readFile('avant/integracao/f360/DRE-202511141757__.xlsx')
  
  // Importar DRE
  await importDRE(workbook)
  
  // Importar DFC
  await importDFC(workbook)
  
  console.log('\n✅ Importação de relatórios consolidados concluída')
}

async function importDRE(workbook) {
  console.log('\n📈 Processando DRE...')
  
  const sheet = workbook.Sheets['DRE']
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  
  // Encontrar linha de cabeçalho (meses)
  let headerRow = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes('Janeiro') || rows[i].includes('Demonstrativo de Resultados')) {
      headerRow = i
      break
    }
  }
  
  if (headerRow === -1) {
    console.error('❌ Cabeçalho não encontrado na aba DRE')
    return
  }
  
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  
  const entries = []
  
  // Processar linhas de dados
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    const accountName = row[0]
    
    if (!accountName || accountName.trim() === '') continue
    
    // Para cada mês
    months.forEach((month, monthIdx) => {
      const colIdx = monthIdx + 1 // Assumindo que janeiro está na coluna 1
      const value = parseFloat(row[colIdx]) || 0
      
      if (value === 0) return
      
      const date = `2025-${String(monthIdx + 1).padStart(2, '0')}-01`
      const nature = value >= 0 ? 'receita' : 'despesa'
      
      entries.push({
        company_cnpj: MATRIZ_CNPJ,
        company_nome: MATRIZ_NAME,
        date,
        account: String(accountName).trim(),
        nature,
        amount: Math.abs(value).toString(),
        created_at: new Date().toISOString()
      })
    })
  }
  
  console.log(`  📊 Total de registros DRE: ${entries.length}`)
  
  // Inserir em lotes
  let inserted = 0
  for (let i = 0; i < entries.length; i += 100) {
    const batch = entries.slice(i, i + 100)
    
    const { error } = await supabase
      .from('dre_entries')
      .insert(batch)
    
    if (error) {
      console.error(`  ❌ Erro no lote ${i}:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`\r  ✅ ${inserted}/${entries.length} registros DRE inseridos`)
    }
  }
  
  console.log(`\n  ✅ DRE: ${inserted} registros importados`)
}

async function importDFC(workbook) {
  console.log('\n💰 Processando DFC...')
  
  const sheet = workbook.Sheets['DFC']
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  
  // Encontrar linha de cabeçalho (meses)
  let headerRow = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes('Janeiro') || rows[i].includes('Demonstrativo de Fluxo')) {
      headerRow = i
      break
    }
  }
  
  if (headerRow === -1) {
    console.error('❌ Cabeçalho não encontrado na aba DFC')
    return
  }
  
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  
  const entries = []
  
  // Processar linhas de dados
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    const category = row[0]
    
    if (!category || category.trim() === '') continue
    
    // Para cada mês
    months.forEach((month, monthIdx) => {
      const colIdx = monthIdx + 1
      const value = parseFloat(row[colIdx]) || 0
      
      if (value === 0) return
      
      const date = `2025-${String(monthIdx + 1).padStart(2, '0')}-01`
      const kind = value >= 0 ? 'in' : 'out'
      
      entries.push({
        company_cnpj: MATRIZ_CNPJ,
        company_nome: MATRIZ_NAME,
        date,
        kind,
        category: String(category).trim(),
        amount: Math.abs(value).toString(),
        created_at: new Date().toISOString()
      })
    })
  }
  
  console.log(`  💰 Total de registros DFC: ${entries.length}`)
  
  // Inserir em lotes
  let inserted = 0
  for (let i = 0; i < entries.length; i += 100) {
    const batch = entries.slice(i, i + 100)
    
    const { error } = await supabase
      .from('cashflow_entries')
      .insert(batch)
    
    if (error) {
      console.error(`  ❌ Erro no lote ${i}:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`\r  ✅ ${inserted}/${entries.length} registros DFC inseridos`)
    }
  }
  
  console.log(`\n  ✅ DFC: ${inserted} registros importados`)
}

importConsolidatedReports().catch(console.error)
