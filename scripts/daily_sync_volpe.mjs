import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { F360Service } from '../src/services/f360Service.ts'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GROUP_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'

// 13 empresas do Grupo Volpe
const VOLPE_COMPANIES = [
  { cnpj: '26888098000159', nome: 'VOLPE MATRIZ' },
  { cnpj: '26888098000230', nome: 'VOLPE ZOIAO' },
  { cnpj: '26888098000310', nome: 'VOLPE MAUÁ' },
  { cnpj: '26888098000400', nome: 'VOLPE DIADEMA' },
  { cnpj: '26888098000582', nome: 'VOLPE GRAJAÚ' },
  { cnpj: '26888098000663', nome: 'VOLPE SANTO ANDRÉ' },
  { cnpj: '26888098000744', nome: 'VOLPE CAMPO LIMPO' },
  { cnpj: '26888098000825', nome: 'VOLPE BRASILÂNDIA' },
  { cnpj: '26888098000906', nome: 'VOLPE POÁ' },
  { cnpj: '26888098001040', nome: 'VOLPE ITAIM' },
  { cnpj: '26888098001120', nome: 'VOLPE PRAIA GRANDE' },
  { cnpj: '26888098001201', nome: 'VOLPE ITANHAÉM' },
  { cnpj: '26888098001392', nome: 'VOLPE SÃO MATHEUS' },
]

/**
 * Validar formato de valores monetários
 */
function validateCurrencyFormat(value) {
  if (value == null || value === '') return { valid: false, error: 'Valor nulo ou vazio' }
  if (typeof value === 'string') {
    // Verificar se é um número válido
    const num = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'))
    if (isNaN(num)) return { valid: false, error: 'Valor não é um número válido' }
    return { valid: true, value: num }
  }
  if (typeof value === 'number') {
    if (!isFinite(value)) return { valid: false, error: 'Valor não é finito' }
    return { valid: true, value }
  }
  return { valid: false, error: 'Tipo de valor inválido' }
}

/**
 * Validar datas
 */
function validateDate(date) {
  if (!date) return { valid: false, error: 'Data vazia' }
  const d = new Date(date)
  if (isNaN(d.getTime())) return { valid: false, error: 'Data inválida' }
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (d > today) return { valid: false, error: 'Data no futuro' }
  return { valid: true, date: d.toISOString().split('T')[0] }
}

/**
 * Verificar integridade dos dados de uma empresa
 */
async function validateCompanyData(cnpj, companyName) {
  console.log(`\n🔍 Validando dados de ${companyName} (${cnpj})`)

  const issues = []
  let dreCount = 0
  let dfcCount = 0
  let bankAccountsCount = 0

  try {
    // Verificar DRE
    const { data: dreEntries, error: dreError } = await supabase
      .from('dre_entries')
      .select('*')
      .eq('company_cnpj', cnpj)
      .limit(1000)

    if (dreError) {
      issues.push({ type: 'DRE', error: `Erro ao buscar: ${dreError.message}` })
    } else {
      dreCount = dreEntries?.length || 0
      if (dreCount === 0) {
        issues.push({ type: 'DRE', error: 'Nenhuma entrada DRE encontrada' })
      } else {
        // Validar valores
        for (const entry of dreEntries || []) {
          const valResult = validateCurrencyFormat(entry.valor || entry.amount)
          if (!valResult.valid) {
            issues.push({ type: 'DRE', error: `Valor inválido: ${valResult.error}`, entry_id: entry.id })
          }
          const dateResult = validateDate(entry.date || entry.data)
          if (!dateResult.valid) {
            issues.push({ type: 'DRE', error: `Data inválida: ${dateResult.error}`, entry_id: entry.id })
          }
        }
      }
    }

    // Verificar DFC
    const { data: dfcEntries, error: dfcError } = await supabase
      .from('dfc_entries')
      .select('*')
      .eq('company_cnpj', cnpj)
      .limit(1000)

    if (dfcError) {
      issues.push({ type: 'DFC', error: `Erro ao buscar: ${dfcError.message}` })
    } else {
      dfcCount = dfcEntries?.length || 0
      if (dfcCount === 0) {
        issues.push({ type: 'DFC', error: 'Nenhuma entrada DFC encontrada' })
      } else {
        // Validar valores
        for (const entry of dfcEntries || []) {
          const valResult = validateCurrencyFormat(entry.amount || entry.valor)
          if (!valResult.valid) {
            issues.push({ type: 'DFC', error: `Valor inválido: ${valResult.error}`, entry_id: entry.id })
          }
          const dateResult = validateDate(entry.date || entry.data)
          if (!dateResult.valid) {
            issues.push({ type: 'DFC', error: `Data inválida: ${dateResult.error}`, entry_id: entry.id })
          }
        }
      }
    }

    // Verificar Contas Bancárias
    const { data: bankAccounts, error: bankError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('company_cnpj', cnpj)

    if (bankError) {
      issues.push({ type: 'Bancos', error: `Erro ao buscar: ${bankError.message}` })
    } else {
      bankAccountsCount = bankAccounts?.length || 0
    }

    // Verificar referências (company_id existe)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', cnpj)
      .single()

    if (companyError || !company) {
      issues.push({ type: 'Referência', error: 'Empresa não encontrada na tabela companies' })
    }

    return {
      cnpj,
      companyName,
      dreCount,
      dfcCount,
      bankAccountsCount,
      issues,
      valid: issues.length === 0,
    }
  } catch (error) {
    return {
      cnpj,
      companyName,
      dreCount: 0,
      dfcCount: 0,
      bankAccountsCount: 0,
      issues: [{ type: 'Erro', error: error.message }],
      valid: false,
    }
  }
}

/**
 * Registrar log de sincronização
 */
async function logSync(syncResult) {
  try {
    await supabase.from('sync_logs').insert({
      sync_date: new Date().toISOString(),
      companies_processed: syncResult.companiesProcessed,
      companies_valid: syncResult.companiesValid,
      companies_invalid: syncResult.companiesInvalid,
      total_issues: syncResult.totalIssues,
      details: syncResult,
    })
  } catch (error) {
    console.warn('⚠️ Erro ao registrar log de sincronização:', error.message)
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🔄 Iniciando rotina diária de verificação e sincronização - Grupo Volpe\n')
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`)

  const results = []
  let totalIssues = 0
  let companiesValid = 0
  let companiesInvalid = 0

  for (const company of VOLPE_COMPANIES) {
    const result = await validateCompanyData(company.cnpj, company.nome)
    results.push(result)

    if (result.valid) {
      companiesValid++
      console.log(`  ✅ ${company.nome}: ${result.dreCount} DRE, ${result.dfcCount} DFC, ${result.bankAccountsCount} contas`)
    } else {
      companiesInvalid++
      totalIssues += result.issues.length
      console.log(`  ❌ ${company.nome}: ${result.issues.length} problema(s) encontrado(s)`)
      result.issues.forEach((issue) => {
        console.log(`     - ${issue.type}: ${issue.error}`)
      })
    }

    // Delay entre empresas
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  const syncResult = {
    timestamp: new Date().toISOString(),
    companiesProcessed: VOLPE_COMPANIES.length,
    companiesValid,
    companiesInvalid,
    totalIssues,
    results,
  }

  // Registrar log
  await logSync(syncResult)

  console.log(`\n📊 Resumo Final:`)
  console.log(`  ✅ Empresas válidas: ${companiesValid}/${VOLPE_COMPANIES.length}`)
  console.log(`  ❌ Empresas com problemas: ${companiesInvalid}/${VOLPE_COMPANIES.length}`)
  console.log(`  ⚠️  Total de problemas: ${totalIssues}`)
  console.log(`\n✨ Verificação concluída!`)

  // Retornar código de saída baseado nos resultados
  if (companiesInvalid > 0 || totalIssues > 0) {
    process.exit(1) // Falha se houver problemas
  }
}

main().catch((error) => {
  console.error('❌ Erro fatal na rotina de sincronização:', error)
  process.exit(1)
})

