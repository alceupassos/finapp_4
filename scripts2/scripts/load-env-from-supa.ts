/**
 * Carrega variáveis de ambiente do arquivo supabase/supa.txt
 * Usado por scripts que precisam das credenciais do Supabase
 */

import fs from 'fs/promises'
import path from 'path'

export async function loadEnvFromSupa(): Promise<void> {
  const supaPath = path.join(process.cwd(), 'supabase', 'supa.txt')
  
  try {
    const content = await fs.readFile(supaPath, 'utf-8')
    const lines = content.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('URL=')) {
        const url = line.split('=')[1]?.trim()
        if (url) {
          process.env.NEXT_PUBLIC_SUPABASE_URL = url
          process.env.SUPABASE_URL = url
        }
      } else if (line.startsWith('anon public=')) {
        const key = line.split('=').slice(1).join('=').trim()
        if (key) {
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key
        }
      } else if (line.startsWith('service_role=')) {
        const key = line.split('=').slice(1).join('=').trim()
        if (key) {
          process.env.SUPABASE_SERVICE_ROLE_KEY = key
        }
      }
    }
    
    console.log('✅ Variáveis de ambiente carregadas de supabase/supa.txt')
  } catch (error) {
    console.warn('⚠️  Não foi possível carregar supabase/supa.txt:', error)
    console.warn('   Certifique-se de que o arquivo existe ou configure .env.local')
  }
}

