import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GROUP_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'

const COMPANIES = [
  { cnpj: '00026888098000159', cliente_nome: 'LOJA 01 - VOLPE MATRIZ', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098000230', cliente_nome: 'LOJA 02 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098000310', cliente_nome: 'LOJA 03 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098000400', cliente_nome: 'LOJA 04 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098000582', cliente_nome: 'LOJA 05 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098000663', cliente_nome: 'LOJA 06 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098000744', cliente_nome: 'LOJA 07 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098000825', cliente_nome: 'LOJA 08 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098000906', cliente_nome: 'LOJA 09 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098001040', cliente_nome: 'LOJA 10 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098001120', cliente_nome: 'LOJA 11 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098001201', cliente_nome: 'LOJA 12 - VOLPE', token_enc: GROUP_TOKEN },
  { cnpj: '00026888098001392', cliente_nome: 'LOJA 13 - VOLPE', token_enc: GROUP_TOKEN },
]

async function importCompanies() {
  console.log('📊 Importando empresas do Grupo Volpe (integration_f360)...\n')
  
  for (const company of COMPANIES) {
    const { data, error } = await supabase
      .from('integration_f360')
      .upsert(company, { onConflict: 'cnpj' })
    
    if (error) {
      console.error(`❌ Erro ao importar ${company.cnpj}:`, error.message)
    } else {
      console.log(`✅ ${company.cnpj}: ${company.cliente_nome}`)
    }
  }
  
  console.log(`\n✅ ${COMPANIES.length} empresas processadas`)
}

importCompanies()
