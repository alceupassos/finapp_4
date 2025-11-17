import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const COMPANIES_DIR = 'avant/integracao/f360'

// Mapeamento de nomes das empresas
const COMPANY_NAMES = {
  '26888098000159': 'LOJA 01 - VOLPE MATRIZ',
  '26888098000230': 'LOJA 02 - VOLPE',
  '26888098000310': 'LOJA 03 - VOLPE',
  '26888098000400': 'LOJA 04 - VOLPE',
  '26888098000582': 'LOJA 05 - VOLPE',
  '26888098000663': 'LOJA 06 - VOLPE',
  '26888098000744': 'LOJA 07 - VOLPE',
  '26888098000825': 'LOJA 08 - VOLPE',
  '26888098000906': 'LOJA 09 - VOLPE',
  '26888098001040': 'LOJA 10 - VOLPE',
  '26888098001120': 'LOJA 11 - VOLPE',
  '26888098001201': 'LOJA 12 - VOLPE',
  '26888098001392': 'LOJA 13 - VOLPE'
}

async function importAllTransactions() {
  const files = fs.readdirSync(COMPANIES_DIR)
  let totalEntries = 0
  
  for (const file of files) {
    const match = file.match(/^(\d{14})/)
    if (!match) continue
    
    const cnpj = match[1]
    const filePath = path.join(COMPANIES_DIR, file)
    
    console.log(`\n💳 Processando ${cnpj} - ${COMPANY_NAMES[cnpj] || 'Volpe'}...`)
    
    try {
      const workbook = XLSX.readFile(filePath)
      const sheetName = 'Relatório Unificado'
      
      if (!workbook.SheetNames.includes(sheetName)) {
        console.warn(`⚠️  Aba "${sheetName}" não encontrada`)
        continue
      }
      
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
      
      // Pular primeira linha (cabeçalho)
      const dataRows = rows.slice(1)
      
      const entries = []
      
      for (const row of dataRows) {
        const tipo = row['__EMPTY'] // Tipo (A Pagar, A Receber)
        const emissao = row['__EMPTY_3'] // Emissão
        const vencimento = row['__EMPTY_4'] // Vencimento
        const liquidacao = row['__EMPTY_5'] // Liquidação
        const valorBruto = parseFloat(row['__EMPTY_6']) || 0
        const valorLiquido = parseFloat(row['__EMPTY_8']) || 0
        const planoConta = row['__EMPTY_12'] // Plano de Contas
        const competencia = row['__EMPTY_11'] // Competência
        const fornecedor = row['__EMPTY_13'] // Cliente / Fornecedor
        const status = row['__EMPTY_14'] // Status
        
        // Pular linhas inválidas
        if (!tipo || !vencimento || valorLiquido === 0) continue
        
        const date = parseDate(liquidacao || vencimento || competencia)
        if (!date) continue
        
        // Determinar se é entrada ou saída
        const kind = tipo.includes('Receber') ? 'in' : 'out'
        const amount = Math.abs(valorLiquido)
        
        entries.push({
          company_cnpj: cnpj,
          company_nome: COMPANY_NAMES[cnpj] || `VOLPE ${cnpj}`,
          date,
          kind,
          category: planoConta || fornecedor || 'Outros',
          amount: amount.toString(),
          created_at: new Date().toISOString()
        })
      }
      
      if (entries.length === 0) {
        console.log('  ⚠️  Nenhum registro válido encontrado')
        continue
      }
      
      // Inserir em lotes de 500
      let inserted = 0
      for (let i = 0; i < entries.length; i += 500) {
        const batch = entries.slice(i, i + 500)
        
        const { error } = await supabase
          .from('cashflow_entries')
          .insert(batch)
        
        if (error) {
          console.error(`  ❌ Erro no lote ${i}:`, error.message)
        } else {
          inserted += batch.length
          process.stdout.write(`\r  ✅ ${inserted}/${entries.length} registros inseridos`)
        }
      }
      
      console.log(`\n  ✅ Total: ${inserted} transações`)
      totalEntries += inserted
      
    } catch (err) {
      console.error(`  ❌ Erro ao processar:`, err.message)
    }
  }
  
  console.log(`\n\n🎉 Importação completa: ${totalEntries} transações totais`)
}

function parseDate(dateValue) {
  if (!dateValue) return null
  
  // Se for número (Excel serial date)
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  
  // Se for string
  const str = String(dateValue)
  
  // DD/MM/YYYY
  const match1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match1) {
    const [, day, month, year] = match1
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  // YYYY-MM-DD
  const match2 = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match2) return str
  
  return null
}

importAllTransactions().catch(console.error)
