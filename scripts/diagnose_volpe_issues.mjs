import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GROUP_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'

const VOLPE_COMPANIES = [
  { cnpj: '26888098000159', nome: 'VOLPE MATRIZ (LOJA 01)' },
  { cnpj: '26888098000230', nome: 'VOLPE ZOIAO (LOJA 02 - SÃO MATEUS)' },
  { cnpj: '26888098000310', nome: 'VOLPE MAUÁ (LOJA 03)' },
  { cnpj: '26888098000400', nome: 'VOLPE DIADEMA (LOJA 04)' },
  { cnpj: '26888098000582', nome: 'VOLPE GRAJAÚ (LOJA 05)' },
  { cnpj: '26888098000663', nome: 'VOLPE SANTO ANDRÉ (LOJA 06)' },
  { cnpj: '26888098000744', nome: 'VOLPE CAMPO LIMPO (LOJA 07)' },
  { cnpj: '26888098000825', nome: 'VOLPE BRASILÂNDIA (LOJA 08)' },
  { cnpj: '26888098000906', nome: 'VOLPE POÁ (LOJA 09)' },
  { cnpj: '26888098001040', nome: 'VOLPE ITAIM (LOJA 10 - JARDIM BARTIRA)' },
  { cnpj: '26888098001120', nome: 'VOLPE PRAIA GRANDE (LOJA 11)' },
  { cnpj: '26888098001201', nome: 'VOLPE ITANHAÉM (LOJA 12)' },
  { cnpj: '26888098001392', nome: 'VOLPE SÃO MATHEUS (LOJA 13)' },
]

function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

async function diagnoseCompany(cnpj, nome) {
  const normalizedCnpj = normalizeCnpj(cnpj)
  const issues = []

  // 1. Verificar se empresa existe
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, cnpj, razao_social, token_f360, client_id, active')
    .eq('cnpj', normalizedCnpj)
    .single()

  if (companyError || !company) {
    issues.push({
      type: 'missing',
      severity: 'high',
      message: 'Empresa não encontrada no Supabase',
      fix: `Criar empresa com CNPJ ${normalizedCnpj}`,
    })
    return { cnpj: normalizedCnpj, nome, issues, company: null }
  }

  // 2. Verificar token_f360
  if (!company.token_f360) {
    issues.push({
      type: 'no_token',
      severity: 'high',
      message: 'Empresa sem token_f360 configurado',
      fix: `Atualizar token_f360 para "${GROUP_TOKEN}"`,
    })
  } else if (company.token_f360 !== GROUP_TOKEN) {
    issues.push({
      type: 'wrong_token',
      severity: 'medium',
      message: `Token F360 incorreto (atual: ${company.token_f360.substring(0, 20)}...)`,
      fix: `Atualizar token_f360 para "${GROUP_TOKEN}"`,
    })
  }

  // 3. Verificar cliente
  const { data: client } = await supabase
    .from('clients')
    .select('id, group_name')
    .eq('group_name', 'Grupo Volpe')
    .single()

  if (client && company.client_id !== client.id) {
    issues.push({
      type: 'wrong_client',
      severity: 'medium',
      message: `Empresa associada ao cliente errado (ID: ${company.client_id})`,
      fix: `Atualizar client_id para ${client.id}`,
    })
  }

  // 4. Verificar dados DRE
  const { count: dreCount } = await supabase
    .from('dre_entries')
    .select('*', { count: 'exact', head: true })
    .eq('company_cnpj', normalizedCnpj)

  if (dreCount === 0) {
    issues.push({
      type: 'no_dre',
      severity: 'low',
      message: 'Nenhuma entrada DRE encontrada',
      fix: 'Importar dados DRE do Excel ou API F360',
    })
  }

  // 5. Verificar dados DFC
  const { count: dfcCount } = await supabase
    .from('dfc_entries')
    .select('*', { count: 'exact', head: true })
    .eq('company_cnpj', normalizedCnpj)

  if (dfcCount === 0) {
    issues.push({
      type: 'no_dfc',
      severity: 'low',
      message: 'Nenhuma entrada DFC encontrada',
      fix: 'Importar dados DFC do Excel ou API F360',
    })
  }

  // 6. Verificar contas bancárias
  const { count: bankCount } = await supabase
    .from('bank_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('company_cnpj', normalizedCnpj)

  if (bankCount === 0) {
    issues.push({
      type: 'no_banks',
      severity: 'low',
      message: 'Nenhuma conta bancária encontrada',
      fix: 'Importar contas bancárias do Excel ou API F360',
    })
  }

  // 7. Verificar plano de contas
  const { count: planoCount } = await supabase
    .from('chart_of_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('company_cnpj', normalizedCnpj)

  if (planoCount === 0) {
    issues.push({
      type: 'no_plano',
      severity: 'low',
      message: 'Nenhuma conta no plano de contas encontrada',
      fix: 'Importar plano de contas do Excel ou API F360',
    })
  }

  return {
    cnpj: normalizedCnpj,
    nome,
    company,
    issues,
    stats: {
      dre: dreCount || 0,
      dfc: dfcCount || 0,
      banks: bankCount || 0,
      plano: planoCount || 0,
    },
  }
}

async function main() {
  console.log('🔍 Diagnosticando problemas do Grupo Volpe\n')

  const results = []
  let totalIssues = 0
  let highSeverityIssues = 0

  for (const company of VOLPE_COMPANIES) {
    const result = await diagnoseCompany(company.cnpj, company.nome)
    results.push(result)
    totalIssues += result.issues.length
    highSeverityIssues += result.issues.filter((i) => i.severity === 'high').length

    // Delay
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // Relatório
  console.log('\n' + '='.repeat(60))
  console.log('📊 RELATÓRIO DE DIAGNÓSTICO')
  console.log('='.repeat(60))

  for (const result of results) {
    if (result.issues.length === 0) {
      console.log(`\n✅ ${result.nome} (${result.cnpj})`)
      console.log(`   DRE: ${result.stats.dre} | DFC: ${result.stats.dfc} | Bancos: ${result.stats.banks} | Plano: ${result.stats.plano}`)
    } else {
      console.log(`\n⚠️  ${result.nome} (${result.cnpj})`)
      result.issues.forEach((issue) => {
        const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢'
        console.log(`   ${icon} ${issue.message}`)
        console.log(`      Fix: ${issue.fix}`)
      })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`📊 Resumo:`)
  console.log(`   Total de problemas: ${totalIssues}`)
  console.log(`   Problemas críticos: ${highSeverityIssues}`)
  console.log(`   Empresas sem problemas: ${results.filter((r) => r.issues.length === 0).length}/13`)
  console.log('='.repeat(60))

  if (highSeverityIssues > 0) {
    console.log(`\n💡 Execute scripts/fix_volpe_companies.mjs para corrigir automaticamente`)
    process.exit(1)
  } else {
    console.log(`\n✨ Nenhum problema crítico encontrado!`)
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})

