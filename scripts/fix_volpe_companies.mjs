import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GROUP_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'

const VOLPE_COMPANIES = [
  { cnpj: '26888098000159', nome: 'VOLPE MATRIZ (LOJA 01)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098000230', nome: 'VOLPE ZOIAO (LOJA 02 - SÃO MATEUS)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098000310', nome: 'VOLPE MAUÁ (LOJA 03)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098000400', nome: 'VOLPE DIADEMA (LOJA 04)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098000582', nome: 'VOLPE GRAJAÚ (LOJA 05)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098000663', nome: 'VOLPE SANTO ANDRÉ (LOJA 06)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098000744', nome: 'VOLPE CAMPO LIMPO (LOJA 07)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098000825', nome: 'VOLPE BRASILÂNDIA (LOJA 08)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098000906', nome: 'VOLPE POÁ (LOJA 09)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098001040', nome: 'VOLPE ITAIM (LOJA 10 - JARDIM BARTIRA)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098001120', nome: 'VOLPE PRAIA GRANDE (LOJA 11)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098001201', nome: 'VOLPE ITANHAÉM (LOJA 12)', razao_social: 'VOLPE LTDA' },
  { cnpj: '26888098001392', nome: 'VOLPE SÃO MATHEUS (LOJA 13)', razao_social: 'VOLPE LTDA' },
]

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

/**
 * Obter ou criar cliente "Grupo Volpe"
 */
async function getOrCreateClient() {
  const groupName = 'Grupo Volpe'

  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('group_name', groupName)
    .single()

  if (existing) {
    return existing.id
  }

  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({ group_name: groupName })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Erro ao criar cliente: ${error.message}`)
  }

  return newClient.id
}

/**
 * Corrigir empresa (criar se não existir, atualizar se necessário)
 */
async function fixCompany(clientId, companyInfo) {
  const { cnpj, nome, razao_social } = companyInfo
  const normalizedCnpj = normalizeCnpj(cnpj)

  // Verificar se empresa existe
  const { data: existing } = await supabase
    .from('companies')
    .select('id, cnpj, razao_social, token_f360, client_id')
    .eq('cnpj', normalizedCnpj)
    .single()

  const companyPayload = {
    client_id: clientId,
    cnpj: normalizedCnpj,
    razao_social: razao_social || nome,
    nome_fantasia: nome,
    token_f360: GROUP_TOKEN,
    erp_type: 'F360',
    active: true,
    last_sync: new Date().toISOString(),
  }

  if (existing) {
    // Atualizar empresa existente
    const needsUpdate =
      existing.token_f360 !== GROUP_TOKEN ||
      existing.client_id !== clientId ||
      existing.razao_social !== companyPayload.razao_social

    if (needsUpdate) {
      const { data: updated, error } = await supabase
        .from('companies')
        .update(companyPayload)
        .eq('id', existing.id)
        .select('id')
        .single()

      if (error) {
        throw new Error(`Erro ao atualizar empresa: ${error.message}`)
      }

      return { companyId: updated.id, action: 'updated' }
    }

    return { companyId: existing.id, action: 'ok' }
  } else {
    // Criar nova empresa
    const { data: created, error } = await supabase
      .from('companies')
      .insert(companyPayload)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Erro ao criar empresa: ${error.message}`)
    }

    return { companyId: created.id, action: 'created' }
  }
}

async function main() {
  console.log('🔧 Corrigindo empresas do Grupo Volpe\n')

  // Obter ou criar cliente
  const clientId = await getOrCreateClient()
  console.log(`✅ Cliente "Grupo Volpe" (ID: ${clientId})\n`)

  const results = {
    created: [],
    updated: [],
    ok: [],
    errors: [],
  }

  // Corrigir cada empresa
  for (const company of VOLPE_COMPANIES) {
    try {
      const { companyId, action } = await fixCompany(clientId, company)

      if (action === 'created') {
        results.created.push(company)
        console.log(`✅ ${company.nome}: CRIADA (ID: ${companyId})`)
      } else if (action === 'updated') {
        results.updated.push(company)
        console.log(`🔄 ${company.nome}: ATUALIZADA (ID: ${companyId})`)
      } else {
        results.ok.push(company)
        console.log(`✓ ${company.nome}: OK`)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      results.errors.push({ company, error: error.message })
      console.error(`❌ ${company.nome}: ${error.message}`)
    }
  }

  // Resumo
  console.log(`\n📊 Resumo:`)
  console.log(`  ✅ Empresas criadas: ${results.created.length}`)
  console.log(`  🔄 Empresas atualizadas: ${results.updated.length}`)
  console.log(`  ✓ Empresas OK: ${results.ok.length}`)
  console.log(`  ❌ Erros: ${results.errors.length}`)

  if (results.errors.length > 0) {
    console.log(`\n❌ Erros encontrados:`)
    results.errors.forEach(({ company, error }) => {
      console.log(`   - ${company.nome}: ${error}`)
    })
    process.exit(1)
  } else {
    console.log(`\n✨ Todas as empresas foram corrigidas!`)
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})

