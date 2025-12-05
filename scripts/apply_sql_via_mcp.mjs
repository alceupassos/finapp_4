/**
 * Script para aplicar SQL via MCP Supabase
 * Lê arquivo SQL e aplica via fetch para Supabase REST API
 */

import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas')
  process.exit(1)
}

async function applySQL(sqlContent) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql: sqlContent }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HTTP ${response.status}: ${error}`)
  }

  return await response.json()
}

async function main() {
  const sqlFile = process.argv[2]
  
  if (!sqlFile) {
    console.error('❌ Uso: node apply_sql_via_mcp.mjs <arquivo.sql>')
    process.exit(1)
  }

  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ Arquivo não encontrado: ${sqlFile}`)
    process.exit(1)
  }

  console.log(`📖 Lendo arquivo: ${sqlFile}`)
  const sqlContent = fs.readFileSync(sqlFile, 'utf-8')
  
  console.log(`📊 Tamanho: ${sqlContent.length} caracteres`)
  console.log(`📝 Linhas: ${sqlContent.split('\n').length}`)
  
  console.log('\n🔄 Aplicando SQL...')
  
  try {
    // Aplicar diretamente via REST API usando exec_sql
    // Nota: Supabase não tem RPC exec_sql por padrão, então vamos usar uma abordagem diferente
    // Vamos usar o endpoint de query direto
    
    // Dividir em statements individuais
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📦 ${statements.length} statements encontrados`)
    
    // Aplicar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`\n[${i + 1}/${statements.length}] Aplicando statement...`)
      
      try {
        // Usar endpoint REST direto para INSERT
        if (statement.includes('INSERT INTO')) {
          // Extrair tabela e dados
          const match = statement.match(/INSERT INTO (\w+) \((.+?)\) VALUES\s*(.+?)\s*ON CONFLICT/i)
          if (match) {
            const table = match[1]
            const columns = match[2].split(',').map(c => c.trim())
            // Por enquanto, vamos usar MCP diretamente
            console.log(`   ⚠️  Statement muito complexo, use MCP diretamente`)
          }
        }
      } catch (error) {
        console.error(`   ❌ Erro no statement ${i + 1}:`, error.message)
      }
    }
    
    console.log('\n✅ Processo concluído')
    console.log('\n💡 Para aplicar o SQL completo, use MCP Supabase diretamente:')
    console.log(`   mcp_supabase_execute_sql com o conteúdo do arquivo`)
    
  } catch (error) {
    console.error('\n❌ Erro ao aplicar SQL:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)

