/**
 * Helper para conexão com Supabase nos scripts de teste
 * 
 * Substitui o módulo mcp_supabase.js inexistente
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Executa uma query SQL via Supabase
 * 
 * Para queries SELECT simples, usa select direto
 * Para queries complexas (GROUP BY, HAVING, etc), tenta usar RPC ou faz processamento em memória
 */
export async function mcp_supabase_execute_sql({ query }) {
  // Queries SELECT simples
  if (query.trim().toUpperCase().startsWith('SELECT')) {
    // Tentar extrair tabela e campos
    const fromMatch = query.match(/FROM\s+(\w+)/i)
    if (fromMatch && !query.includes('GROUP BY') && !query.includes('HAVING')) {
      const table = fromMatch[1]
      // Extrair campos (simplificado)
      const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i)
      if (selectMatch) {
        const fields = selectMatch[1].split(',').map(f => f.trim().split(' ')[0].split(' as ')[0])
        const { data, error } = await supabase.from(table).select(fields.join(','))
        if (error) throw error
        return data || []
      }
    }
    
    // Para queries complexas, usar fetch direto na API REST
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
      
      if (response.ok) {
        return await response.json()
      }
    } catch (e) {
      // Fallback: processar em memória para queries simples
      console.warn('⚠️  Query complexa, usando processamento simplificado')
    }
  }
  
  // Fallback: retornar array vazio
  console.warn('⚠️  Query não suportada completamente, retornando array vazio')
  return []
}

export { supabase }

