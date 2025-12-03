import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VOLPE_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'

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
  console.log('📊 Cadastrando 13 empresas do Grupo Volpe via SQL...\n')
  
  let successCount = 0
  let errorCount = 0
  
  for (const company of VOLPE_COMPANIES) {
    // Remover formatação do CNPJ (apenas números)
    const cnpjClean = company.cnpj.replace(/\D/g, '')
    
    // Usar SQL direto para inserir/atualizar
    const sql = `
      INSERT INTO companies (cnpj, razao_social, nome_fantasia, token_f360, erp_type, active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (cnpj) 
      DO UPDATE SET
        razao_social = EXCLUDED.razao_social,
        nome_fantasia = EXCLUDED.nome_fantasia,
        token_f360 = EXCLUDED.token_f360,
        erp_type = EXCLUDED.erp_type,
        active = EXCLUDED.active,
        updated_at = NOW()
      RETURNING id, cnpj, nome_fantasia;
    `
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: sql,
        params: [cnpjClean, company.razao_social, company.nome_fantasia, VOLPE_TOKEN, 'F360', true]
      })
      
      if (error) {
        // Tentar método alternativo usando REST API
        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .eq('cnpj', cnpjClean)
          .maybeSingle()
        
        if (existing) {
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              razao_social: company.razao_social,
              nome_fantasia: company.nome_fantasia,
              token_f360: VOLPE_TOKEN,
              erp_type: 'F360',
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
          const { error: insertError } = await supabase
            .from('companies')
            .insert({
              cnpj: cnpjClean,
              razao_social: company.razao_social,
              nome_fantasia: company.nome_fantasia,
              token_f360: VOLPE_TOKEN,
              erp_type: 'F360',
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
      } else {
        console.log(`✅ Processada: ${company.nome_fantasia} (${cnpjClean})`)
        successCount++
      }
    } catch (err) {
      console.error(`❌ Erro ao processar ${company.nome_fantasia}:`, err.message)
      errorCount++
    }
  }
  
  console.log(`\n📊 Resumo:`)
  console.log(`✅ ${successCount} empresas processadas com sucesso`)
  if (errorCount > 0) {
    console.log(`❌ ${errorCount} empresas com erro`)
  }
}

registerVolpeCompanies().catch(console.error)

