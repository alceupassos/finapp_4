import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function importChartOfAccounts() {
  console.log('📋 Importando Plano de Contas...\n')
  
  const workbook = XLSX.readFile('avant/integracao/f360/PlanoDeContas.xlsx')
  const sheet = workbook.Sheets['Plano de Contas']
  const rows = XLSX.utils.sheet_to_json(sheet)
  
  // Pular primeira linha (cabeçalho)
  const dataRows = rows.slice(1)
  
  const accounts = []
  
  for (const row of dataRows) {
    const name = row['Plano de Contas (Visualizacao/Edicao)']
    const type = row['__EMPTY'] // Tipo - Visualização
    
    if (!name || name === 'Nome - Visualização') continue
    
    // Extrair código do nome (formato: "102-1 - Receita com...")
    const codeMatch = String(name).match(/^([\d-]+)\s*-\s*(.+)$/)
    if (!codeMatch) continue
    
    const code = codeMatch[1].trim()
    const accountName = codeMatch[2].trim()
    const level = (code.match(/-/g) || []).length + 1
    
    accounts.push({
      code,
      name: accountName,
      account_type: type || 'outro',
      level,
      is_analytical: true
    })
  }
  
  console.log(`📊 Total de contas encontradas: ${accounts.length}`)
  
  // Inserir em lotes de 50
  let inserted = 0
  for (let i = 0; i < accounts.length; i += 50) {
    const batch = accounts.slice(i, i + 50)
    
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .upsert(batch, { onConflict: 'code' })
    
    if (error) {
      console.error(`❌ Erro no lote ${i}:`, error.message)
    } else {
      inserted += batch.length
      console.log(`✅ ${inserted}/${accounts.length} contas importadas`)
    }
  }
  
  console.log(`\n✅ Importação concluída: ${inserted} contas`)
}

importChartOfAccounts().catch(console.error)
