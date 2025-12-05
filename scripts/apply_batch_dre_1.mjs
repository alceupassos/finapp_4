/**
 * Script para aplicar batch DRE 1 via Supabase client
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const content = fs.readFileSync('import_dre_batch_1.sql', 'utf-8')
console.log(`📥 Aplicando batch DRE 1: ${content.length} bytes, ${content.split('\n').length} linhas`)

// Executar SQL diretamente
const { data, error } = await supabase.rpc('exec_sql', { sql_query: content })

if (error) {
  console.error('❌ Erro:', error.message)
  console.log('💡 Aplicar manualmente via mcp_supabase_apply_migration')
} else {
  console.log('✅ Batch DRE 1 aplicado com sucesso!')
}

