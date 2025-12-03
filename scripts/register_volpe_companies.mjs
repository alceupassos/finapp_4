import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VOLPE_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'
const VOLPE_LOGIN = 'volpe.matriz@ifinance.com.br'

// 13 empresas do Grupo Volpe
const VOLPE_COMPANIES = [
  { cnpj: '26888098000159', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE MATRIZ (LOJA 01)' },
  { cnpj: '26888098000230', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE ZOIAO (LOJA 02 - SÃO MATEUS)' },
  { cnpj: '26888098000310', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE MAUÁ (LOJA 03)' },
  { cnpj: '26888098000400', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE DIADEMA (LOJA 04)' },
  { cnpj: '26888098000582', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE GRAJAÚ (LOJA 05)' },
  { cnpj: '26888098000663', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE SANTO ANDRÉ (LOJA 06)' },
  { cnpj: '26888098000744', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE CAMPO LIMPO (LOJA 07)' },
  { cnpj: '26888098000825', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE BRASILÂNDIA (LOJA 08)' },
  { cnpj: '26888098000906', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE POÁ (LOJA 09)' },
  { cnpj: '26888098001040', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE ITAIM (LOJA 10 - JARDIM BARTIRA)' },
  { cnpj: '26888098001120', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE PRAIA GRANDE (LOJA 11)' },
  { cnpj: '26888098001201', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE ITANHAÉM (LOJA 12)' },
  { cnpj: '26888098001392', razao_social: 'VOLPE LTDA', nome_fantasia: 'VOLPE SÃO MATHEUS (LOJA 13)' },
]

async function registerVolpeCompanies() {
  console.log('📊 Cadastrando 13 empresas do Grupo Volpe...\n')
  
  // Primeiro, verificar se existe um cliente para o Grupo Volpe
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('group_name', 'GRUPO VOLPE')
    .limit(1)
  
  if (clientError) {
    console.error('❌ Erro ao buscar cliente:', clientError)
    // Tentar criar mesmo assim
  }
  
  let clientId = clients?.[0]?.id
  
  // Se não existe, criar o cliente
  if (!clientId) {
    const { data: newClients, error: createError } = await supabase
      .from('clients')
      .insert({ group_name: 'GRUPO VOLPE' })
      .select('id')
    
    if (createError) {
      console.error('❌ Erro ao criar cliente:', createError)
      // Continuar sem client_id se necessário
    } else if (newClients && newClients.length > 0) {
      clientId = newClients[0].id
      console.log('✅ Cliente GRUPO VOLPE criado:', clientId)
    }
  } else {
    console.log('✅ Cliente GRUPO VOLPE já existe:', clientId)
  }
  
  // Cadastrar cada empresa
  let successCount = 0
  let errorCount = 0
  
  for (const company of VOLPE_COMPANIES) {
    // Remover formatação do CNPJ (apenas números)
    const cnpjClean = company.cnpj.replace(/\D/g, '')
    
    // Verificar se empresa já existe
    const { data: existing } = await supabase
      .from('companies')
      .select('id, cnpj')
      .eq('cnpj', cnpjClean)
      .single()
    
    if (existing) {
      // Atualizar empresa existente
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          razao_social: company.razao_social,
          nome_fantasia: company.nome_fantasia,
          token_f360: VOLPE_TOKEN,
          erp_type: 'F360',
          client_id: clientId,
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      
      if (updateError) {
        console.error(`❌ Erro ao atualizar ${company.nome_fantasia}:`, updateError.message)
        errorCount++
      } else {
        console.log(`✅ Atualizada: ${company.nome_fantasia} (${cnpjClean})`)
        successCount++
      }
    } else {
      // Criar nova empresa
      const { data: newCompany, error: insertError } = await supabase
        .from('companies')
        .insert({
          cnpj: cnpjClean,
          razao_social: company.razao_social,
          nome_fantasia: company.nome_fantasia,
          token_f360: VOLPE_TOKEN,
          erp_type: 'F360',
          client_id: clientId,
          active: true
        })
        .select('id')
        .single()
      
      if (insertError) {
        console.error(`❌ Erro ao criar ${company.nome_fantasia}:`, insertError.message)
        errorCount++
      } else {
        console.log(`✅ Criada: ${company.nome_fantasia} (${cnpjClean})`)
        successCount++
      }
    }
  }
  
  console.log(`\n📊 Resumo:`)
  console.log(`✅ ${successCount} empresas processadas com sucesso`)
  if (errorCount > 0) {
    console.log(`❌ ${errorCount} empresas com erro`)
  }
  
  // Buscar usuários para vincular empresas
  // Nota: Acesso direto a auth.users pode não funcionar, então vamos pular essa parte
  // As empresas serão vinculadas quando o usuário fizer login ou através de outro processo
  console.log(`\n💡 Empresas cadastradas. Vinculação com usuários será feita via interface ou processo separado.`)
}

registerVolpeCompanies().catch(console.error)

