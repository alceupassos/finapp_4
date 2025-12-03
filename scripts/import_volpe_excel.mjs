import fs from 'fs'
import path from 'path'
import { read, utils } from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GROUP_TOKEN = '223b065a-1873-4cfe-a36b-f092c602a03e'

// 13 empresas do Grupo Volpe
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

/**
 * Normalizar CNPJ (remover formatação)
 */
function normalizeCnpj(cnpj) {
  return String(cnpj || '').replace(/\D/g, '')
}

/**
 * Converter valor para número brasileiro
 */
function toNumberBR(value) {
  if (value == null || value === '') return 0
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0
    return value
  }
  const normalized = String(value).replace(/\s|R\$|\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Converter data para ISO (YYYY-MM-DD)
 */
function toIso(value) {
  if (!value || value === '') {
    // Usar primeiro dia do mês atual como padrão
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }
  
  // Tentar formato brasileiro DD/MM/YYYY
  const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  }
  
  // Tentar parsear como Date
  const parsed = new Date(value)
  if (Number.isFinite(parsed.getTime())) {
    // Validar que não é data futura
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (parsed > today) {
      // Se for futura, usar primeiro dia do mês atual
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    }
    return parsed.toISOString().slice(0, 10)
  }
  
  // Se tudo falhar, usar primeiro dia do mês atual
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Buscar valor em objeto usando múltiplas chaves
 */
function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k]
  }
  return ''
}

/**
 * Classificar natureza da conta
 */
function classifyNature(accountName) {
  if (!accountName) return 'despesa'
  const s = String(accountName).toLowerCase()
  if (/receita|venda|faturamento|recebido|rendimento/.test(s)) return 'receita'
  if (/despesa|custo|taxa|imposto|pagamento|pagar|desembolso/.test(s)) return 'despesa'
  return 'despesa' // padrão
}

/**
 * Obter ou criar cliente "Grupo Volpe"
 */
async function getOrCreateClient() {
  const groupName = 'Grupo Volpe'
  
  // Verificar se cliente já existe
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('group_name', groupName)
    .single()

  if (existing) {
    return existing.id
  }

  // Criar novo cliente
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
 * Obter ou criar empresa (baseado em scripts2/scripts/import-all-f360.ts)
 */
async function getOrCreateCompany(clientId, companyData) {
  const cnpj = normalizeCnpj(companyData.cnpj)
  
  if (cnpj.length !== 14) {
    throw new Error(`CNPJ inválido: ${companyData.cnpj}`)
  }

  // Verificar se empresa já existe
  const { data: existing } = await supabase
    .from('companies')
    .select('id, cnpj, razao_social')
    .eq('cnpj', cnpj)
    .single()

  const companyPayload = {
    client_id: clientId,
    cnpj: cnpj,
    razao_social: companyData.razao_social || companyData.nome,
    nome_fantasia: companyData.nome || null,
    token_f360: GROUP_TOKEN,
    erp_type: 'F360',
    active: true,
    last_sync: new Date().toISOString(),
  }

  if (existing) {
    // Atualizar empresa existente
    const { data: updated, error } = await supabase
      .from('companies')
      .update(companyPayload)
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar empresa: ${error.message}`)
    }

    return { companyId: updated.id, created: false }
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

    return { companyId: created.id, created: true }
  }
}

/**
 * Validar e corrigir dados antes de importar
 */
function validateAndFixDreEntry(entry, cnpj) {
  // Validar e corrigir conta
  const conta = String(entry.conta || '').trim()
  if (!conta || conta === '') {
    return null // Pular se não tiver conta
  }

  // Validar e corrigir valor
  const valor = toNumberBR(entry.valor)
  if (valor === 0) {
    return null // Pular se valor for zero
  }

  // Validar e corrigir data
  const date = toIso(entry.data)

  // Validar e corrigir natureza
  const natureza = classifyNature(conta)

  return {
    company_cnpj: normalizeCnpj(cnpj),
    date: date,
    account: conta,
    natureza: natureza,
    valor: valor,
  }
}

function validateAndFixDfcEntry(entry, cnpj) {
  // Validar categoria
  const category = String(entry.category || entry.descricao || '').trim()
  if (!category || category === '') {
    return null // Pular se não tiver categoria
  }

  // Validar e corrigir valores
  const entrada = toNumberBR(entry.entrada || entry.amount)
  const saida = toNumberBR(entry.saida || entry.amount)
  
  if (entrada === 0 && saida === 0) {
    return null // Pular se ambos forem zero
  }

  // Validar e corrigir data
  const date = toIso(entry.date || entry.data)

  // Validar kind
  const kind = entry.kind || (entrada > 0 ? 'in' : 'out')

  return {
    company_cnpj: normalizeCnpj(cnpj),
    date: date,
    kind: kind,
    category: category,
    amount: entrada > 0 ? entrada : saida,
  }
}

function validateAndFixPlanoContas(entry) {
  const name = String(entry.name || entry.nome || '').trim()
  if (!name || name === '') {
    return null
  }

  const code = String(entry.code || entry.codigo || '').trim() || 'SEM_CODIGO'
  const type = String(entry.type || entry.tipo || 'DESPESA').toUpperCase()
  const validType = ['RECEITA', 'DESPESA', 'ATIVO', 'PASSIVO', 'RESULTADO'].includes(type) ? type : 'DESPESA'

  return {
    code: code,
    name: name,
    type: validType,
    parent_code: entry.parent_code || null,
  }
}

function validateAndFixBanco(entry) {
  const nome = String(entry.nome || entry.name || '').trim()
  if (!nome || nome === '') {
    return null
  }

  return {
    nome: nome,
    tipo_conta: String(entry.tipo_conta || entry.tipo || 'Conta Corrente').trim(),
    banco_numero: entry.banco_numero ? Number(entry.banco_numero) : null,
    agencia: String(entry.agencia || '').trim() || '',
    conta: String(entry.conta || '').trim() || '',
    digito_conta: String(entry.digito_conta || entry.digito || '').trim() || '',
  }
}

/**
 * Parse Excel file volpe.xlsx
 */
function parseVolpeExcel(excelPath) {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Arquivo não encontrado: ${excelPath}`)
  }

  const buf = fs.readFileSync(excelPath)
  const wb = read(buf, { type: 'buffer' })
  const sheetNames = wb.SheetNames

  console.log(`📊 Abas encontradas: ${sheetNames.join(', ')}`)

  const findSheet = (keys) => sheetNames.find((n) => keys.some((k) => n.toLowerCase().includes(k.toLowerCase())))

  const dreSheetName = findSheet(['dre', 'resultado', 'demonstrativo'])
  const dfcSheetName = findSheet(['dfc', 'fluxo', 'caixa'])
  const planoContasSheetName = findSheet(['plano', 'contas', 'chart'])
  const bancosSheetName = findSheet(['banco', 'bancaria', 'conta'])

  const results = {
    dre: [],
    dfc: [],
    planoContas: [],
    bancos: [],
  }

  // Processar DRE
  if (dreSheetName) {
    const dreSheet = wb.Sheets[dreSheetName]
    const dreRows = utils.sheet_to_json(dreSheet, { defval: '' })
    console.log(`  ✅ DRE: ${dreRows.length} linhas encontradas`)

    results.dre = dreRows
      .map((r) => ({
        conta: String(pick(r, ['conta', 'Conta', 'CONTA', 'categoria', 'Categoria'])).trim(),
        valor: pick(r, ['valor', 'Valor', 'VALOR', 'total', 'Total', 'TOTAL']),
        data: pick(r, ['data', 'Data', 'DATA', 'competencia', 'Competencia', 'COMPETENCIA']),
      }))
      .filter((r) => r.conta && r.valor)
  }

  // Processar DFC
  if (dfcSheetName) {
    const dfcSheet = wb.Sheets[dfcSheetName]
    const dfcRows = utils.sheet_to_json(dfcSheet, { defval: '' })
    console.log(`  ✅ DFC: ${dfcRows.length} linhas encontradas`)

    results.dfc = dfcRows
      .map((r) => {
        const desc = String(pick(r, ['descricao', 'Descrição', 'DESCRICAO', 'categoria', 'Categoria'])).trim()
        const entrada = pick(r, ['entrada', 'Entrada', 'ENTRADA'])
        const saida = pick(r, ['saida', 'Saída', 'SAIDA'])
        const data = pick(r, ['data', 'Data', 'DATA', 'dt', 'DT', 'date', 'Date'])

        const entries = []
        if (entrada) {
          entries.push({ category: desc, entrada: entrada, saida: 0, date: data })
        }
        if (saida) {
          entries.push({ category: desc, entrada: 0, saida: saida, date: data })
        }
        return entries
      })
      .flat()
      .filter((r) => r.category)
  }

  // Processar Plano de Contas
  if (planoContasSheetName) {
    const planoSheet = wb.Sheets[planoContasSheetName]
    const planoRows = utils.sheet_to_json(planoSheet, { defval: '' })
    console.log(`  ✅ Plano de Contas: ${planoRows.length} linhas encontradas`)

    results.planoContas = planoRows
      .map((r) => ({
        code: pick(r, ['codigo', 'Codigo', 'CODIGO', 'code', 'Code']),
        name: pick(r, ['nome', 'Nome', 'NOME', 'conta', 'Conta']),
        type: pick(r, ['tipo', 'Tipo', 'TIPO', 'natureza', 'Natureza']),
        parent_code: pick(r, ['pai', 'Pai', 'PAI', 'parent', 'Parent']),
      }))
      .filter((r) => r.name)
  }

  // Processar Contas Bancárias
  if (bancosSheetName) {
    const bancosSheet = wb.Sheets[bancosSheetName]
    const bancosRows = utils.sheet_to_json(bancosSheet, { defval: '' })
    console.log(`  ✅ Contas Bancárias: ${bancosRows.length} linhas encontradas`)

    results.bancos = bancosRows
      .map((r) => ({
        nome: pick(r, ['nome', 'Nome', 'NOME', 'conta', 'Conta']),
        tipo: pick(r, ['tipo', 'Tipo', 'TIPO']),
        banco: pick(r, ['banco', 'Banco', 'BANCO', 'numero', 'Numero']),
        agencia: pick(r, ['agencia', 'Agencia', 'AGENCIA']),
        conta: pick(r, ['conta', 'Conta', 'CONTA', 'numero_conta']),
        digito: pick(r, ['digito', 'Digito', 'DIGITO']),
      }))
      .filter((r) => r.nome)
  }

  return results
}

/**
 * Importar dados para uma empresa (REVISADO - cria empresa se não existir)
 */
async function importCompanyData(companyInfo, parsedData) {
  const { cnpj, nome, razao_social } = companyInfo
  const normalizedCnpj = normalizeCnpj(cnpj)
  
  console.log(`\n📊 Processando ${nome} (${normalizedCnpj})`)

  try {
    // 1. Obter ou criar cliente
    const clientId = await getOrCreateClient()

    // 2. Obter ou criar empresa (CRIAR se não existir - nunca pular)
    let companyId
    let companyCreated = false
    
    try {
      const { companyId: id, created } = await getOrCreateCompany(clientId, {
        cnpj: normalizedCnpj,
        nome: nome,
        razao_social: razao_social,
      })
      companyId = id
      companyCreated = created
      
      if (created) {
        console.log(`  ✅ Empresa criada: ${nome}`)
      } else {
        console.log(`  ↻ Empresa já existe: ${nome}`)
      }
    } catch (error) {
      console.error(`  ❌ Erro ao obter/criar empresa: ${error.message}`)
      throw error // Não pular, lançar erro
    }

    let dreCount = 0
    let dfcCount = 0
    let planoContasCount = 0
    let bancosCount = 0
    let errors = []

    // 3. Importar DRE (com validação e correção)
    if (parsedData.dre.length > 0) {
      const dreEntries = parsedData.dre
        .map((item) => validateAndFixDreEntry(item, normalizedCnpj))
        .filter((item) => item !== null) // Remover entradas inválidas após correção
        .map((item) => ({
          company_id: companyId,
          company_cnpj: item.company_cnpj,
          date: item.date,
          account: item.account,
          natureza: item.natureza,
          valor: item.valor,
          source_erp: 'EXCEL',
          source_id: `excel_${item.company_cnpj}_${item.account}_${item.date}`,
        }))

      if (dreEntries.length > 0) {
        // Processar em batches
        const BATCH_SIZE = 500
        for (let i = 0; i < dreEntries.length; i += BATCH_SIZE) {
          const batch = dreEntries.slice(i, i + BATCH_SIZE)
          const { error: dreError } = await supabase
            .from('dre_entries')
            .upsert(batch, { onConflict: 'company_cnpj,date,account,natureza' })

          if (dreError) {
            errors.push(`DRE batch ${i / BATCH_SIZE + 1}: ${dreError.message}`)
          } else {
            dreCount += batch.length
          }
        }
        console.log(`  ✅ ${dreCount} entradas DRE importadas`)
      }
    }

    // 4. Importar DFC (com validação e correção)
    if (parsedData.dfc.length > 0) {
      const dfcEntries = parsedData.dfc
        .map((item) => validateAndFixDfcEntry(item, normalizedCnpj))
        .filter((item) => item !== null)
        .map((item) => ({
          company_id: companyId,
          company_cnpj: item.company_cnpj,
          date: item.date,
          kind: item.kind,
          category: item.category,
          amount: item.amount,
          bank_account: null, // Pode ser preenchido depois
          source_erp: 'EXCEL',
          source_id: `excel_${item.company_cnpj}_${item.category}_${item.date}_${item.kind}`,
        }))

      if (dfcEntries.length > 0) {
        const BATCH_SIZE = 500
        for (let i = 0; i < dfcEntries.length; i += BATCH_SIZE) {
          const batch = dfcEntries.slice(i, i + BATCH_SIZE)
          const { error: dfcError } = await supabase
            .from('dfc_entries')
            .upsert(batch, { onConflict: 'company_cnpj,date,kind,category,bank_account' })

          if (dfcError) {
            errors.push(`DFC batch ${i / BATCH_SIZE + 1}: ${dfcError.message}`)
          } else {
            dfcCount += batch.length
          }
        }
        console.log(`  ✅ ${dfcCount} entradas DFC importadas`)
      }
    }

    // 5. Importar Plano de Contas (com validação e correção)
    if (parsedData.planoContas.length > 0) {
      const planoEntries = parsedData.planoContas
        .map((item) => validateAndFixPlanoContas(item))
        .filter((item) => item !== null)
        .map((item) => ({
          company_id: companyId,
          company_cnpj: normalizedCnpj,
          code: item.code,
          name: item.name,
          type: item.type,
          parent_code: item.parent_code,
          level: item.parent_code ? 2 : 1,
          accepts_entries: true,
        }))

      if (planoEntries.length > 0) {
        const { error: planoError } = await supabase
          .from('chart_of_accounts')
          .upsert(planoEntries, { onConflict: 'company_id,code' })

        if (planoError) {
          errors.push(`Plano de Contas: ${planoError.message}`)
        } else {
          planoContasCount = planoEntries.length
          console.log(`  ✅ ${planoContasCount} contas importadas`)
        }
      }
    }

    // 6. Importar Contas Bancárias (com validação e correção)
    if (parsedData.bancos.length > 0) {
      const bancosEntries = parsedData.bancos
        .map((item) => validateAndFixBanco(item))
        .filter((item) => item !== null)
        .map((item) => ({
          company_id: companyId,
          company_cnpj: normalizedCnpj,
          nome: item.nome,
          tipo_conta: item.tipo_conta,
          banco_numero: item.banco_numero,
          agencia: item.agencia,
          conta: item.conta,
          digito_conta: item.digito_conta,
          active: true,
        }))

      if (bancosEntries.length > 0) {
        const { error: bancosError } = await supabase
          .from('bank_accounts')
          .upsert(bancosEntries, { onConflict: 'company_cnpj,nome' })

        if (bancosError) {
          errors.push(`Contas Bancárias: ${bancosError.message}`)
        } else {
          bancosCount = bancosEntries.length
          console.log(`  ✅ ${bancosCount} contas bancárias importadas`)
        }
      }
    }

    // Mostrar erros se houver
    if (errors.length > 0) {
      console.warn(`  ⚠️  ${errors.length} erro(s) durante importação:`)
      errors.forEach((err) => console.warn(`     - ${err}`))
    }

    return { 
      dre: dreCount, 
      dfc: dfcCount, 
      planoContas: planoContasCount, 
      bancos: bancosCount,
      created: companyCreated,
      errors: errors.length
    }
  } catch (error) {
    console.error(`  ❌ Erro fatal ao processar ${nome}:`, error.message)
    throw error // Não pular, propagar erro
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando importação do arquivo volpe.xlsx\n')

  const excelPath = path.join(process.cwd(), 'sol1', 'volpe.xlsx')

  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Arquivo não encontrado: ${excelPath}`)
    console.log('💡 Verifique se o arquivo existe em sol1/volpe.xlsx')
    process.exit(1)
  }

  // Parse Excel
  let parsedData
  try {
    parsedData = parseVolpeExcel(excelPath)
  } catch (error) {
    console.error('❌ Erro ao processar Excel:', error.message)
    process.exit(1)
  }

  console.log(`\n📊 Resumo do arquivo:`)
  console.log(`  - DRE: ${parsedData.dre.length} linhas`)
  console.log(`  - DFC: ${parsedData.dfc.length} linhas`)
  console.log(`  - Plano de Contas: ${parsedData.planoContas.length} linhas`)
  console.log(`  - Contas Bancárias: ${parsedData.bancos.length} linhas`)

  // Importar para cada empresa
  let totalDre = 0
  let totalDfc = 0
  let totalPlanoContas = 0
  let totalBancos = 0
  let companiesCreated = 0
  let totalErrors = 0

  for (const company of VOLPE_COMPANIES) {
    try {
      const result = await importCompanyData(company, parsedData)
      totalDre += result.dre
      totalDfc += result.dfc
      totalPlanoContas += result.planoContas
      totalBancos += result.bancos
      if (result.created) companiesCreated++
      totalErrors += result.errors

      // Delay entre empresas
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`❌ Erro ao processar ${company.nome}:`, error.message)
      totalErrors++
      // Continuar com próxima empresa mesmo com erro
    }
  }

  console.log(`\n📊 Resumo Final:`)
  console.log(`  ✅ Empresas criadas: ${companiesCreated}`)
  console.log(`  ✅ DRE: ${totalDre} entradas`)
  console.log(`  ✅ DFC: ${totalDfc} entradas`)
  console.log(`  ✅ Plano de Contas: ${totalPlanoContas} contas`)
  console.log(`  ✅ Contas Bancárias: ${totalBancos} contas`)
  if (totalErrors > 0) {
    console.log(`  ⚠️  Total de erros: ${totalErrors}`)
  }
  console.log(`\n✨ Importação concluída!`)
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})
