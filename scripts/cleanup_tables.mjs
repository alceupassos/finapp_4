import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const tables = ['cashflow_entries', 'dre_entries', 'app_logs']

async function truncateTable(table) {
  console.log(`🧹 Limpando ${table}...`)
  let { error } = await supabase.from(table).delete().neq('id', -1)
  if (error) {
    if (String(error.message || '').includes('Could not find the table')) {
      console.warn(`⚠️  Tabela ${table} não existe, ignorando`)
      return
    }
    // Tenta fallback usando condição IS NOT NULL caso a coluna não aceite números negativos
    const attempt = await supabase.from(table).delete().not('id', 'is', null)
    error = attempt.error
  }
  if (error) throw new Error(`Erro ao limpar ${table}: ${error.message}`)
}

async function main() {
  for (const table of tables) {
    await truncateTable(table)
  }
  console.log('✅ Tabelas limpas com sucesso')
}

main().catch((err) => {
  console.error('❌ Falha na limpeza:', err)
  process.exit(1)
})
