#!/usr/bin/env node
/**
 * Processador Completo - Grupo Volpe (13 Empresas)
 * =================================================
 * 
 * Baseado nas regras Python em avant/integracao/f360/regras/
 * 
 * Processa os 13 CNPJs do Grupo Volpe:
 * - Lê dados de cada arquivo CNPJ.xlsx (Relatório Unificado F360)
 * - Usa PlanoDeContas.xlsx e CentroDeCustos.xlsx como referência
 * - Gera DRE (regime competência) e DFC (regime caixa)
 * - Upload para Supabase com suporte a filtro por empresa ou consolidado
 * 
 * Uso:
 *   node scripts/processar_grupo_volpe.mjs --upload=true
 */

import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const DEFAULTS = {
  inputDir: 'avant/integracao/f360',
  empresasFile: 'avant/integracao/f360/regras/empresas.csv',
  planFile: 'avant/integracao/f360/PlanoDeContas.xlsx',
  centroFile: 'avant/integracao/f360/CentroDeCustos.xlsx',
  outputDir: 'var/grupo_volpe'
}

const args = process.argv.slice(2).reduce((acc, curr) => {
  const [key, value] = curr.split('=')
  if (key && value) acc[key.replace(/^--/, '')] = value
  return acc
}, {})

const options = {
  inputDir: args.input || DEFAULTS.inputDir,
  empresasFile: args.empresas || DEFAULTS.empresasFile,
  planFile: args.plan || DEFAULTS.planFile,
  centroFile: args.centro || DEFAULTS.centroFile,
  outputDir: args.output || DEFAULTS.outputDir,
  upload: args.upload === 'true' || args.upload === '1',
  cnpjFilter: args.cnpj || null
}

const supabase = options.upload
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function parseDate(value) {
  if (!value) return null
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  const str = String(value).trim()
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return str
  return null
}

function parseCompetencia(value) {
  if (!value) return null
  const str = String(value).trim()
  const match = str.match(/^(\d{2})\/(\d{4})$/)
  if (match) {
    const [, month, year] = match
    return `${year}-${month}`
  }
  const altMatch = str.match(/^(\d{4})-(\d{2})$/)
  if (altMatch) return str
  return null
}

function parseNumber(value) {
  if (typeof value === 'number') return value
  if (!value) return 0
  const cleaned = String(value).replace(/[^0-9,-.]/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function extractCode(planValue) {
  if (!planValue) return null
  const str = String(planValue).trim()
  const match = str.match(/^(\d{2,}(?:-\d+)*)/)
  return match ? match[1].replace(/\s+/g, '') : null
}

function normalizeLabel(value) {
  if (!value) return null
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase()
}

function loadEmpresas(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n').slice(1)
  return lines.map(line => {
    const [cnpj, nome] = line.split(',')
    return { cnpj: cnpj.trim(), nome: nome.trim() }
  })
}

function loadPlanContas(filePath) {
  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets['Plano de Contas']
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const dict = {}
  for (const row of rows.slice(1)) {
    const name = row['Plano de Contas (Visualizacao/Edicao)']
    const code = extractCode(name)
    if (!code) continue
    dict[code] = String(name || '').trim()
  }
  return dict
}

function loadCentroCustos(filePath) {
  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const dict = {}
  for (const row of rows.slice(1)) {
    const name = row['Centro de Custos']
    if (name) dict[String(name).trim()] = true
  }
  return dict
}

function loadTransactions(inputDir, cnpj) {
  const filePath = path.join(inputDir, `${cnpj}.xlsx`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`)
  }
  
  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets['Relatório Unificado']
  if (!sheet) throw new Error(`Aba "Relatório Unificado" não encontrada em ${cnpj}.xlsx`)
  
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  
  return rows.slice(1).map(row => {
    const tipo = String(row['__EMPTY'] || '').trim()
    const competencia = parseCompetencia(row['__EMPTY_11'])
    const liquidacao = parseDate(row['__EMPTY_5'] || row['__EMPTY_4'] || row['__EMPTY_3'])
    const value = parseNumber(row['__EMPTY_8'])
    const code = extractCode(row['__EMPTY_12'])
    const planName = String(row['__EMPTY_12'] || '').trim()
    const fornecedor = String(row['__EMPTY_13'] || '').trim()
    const centroCusto = String(row['__EMPTY_7'] || '').trim()
    const categoria = String(row['__EMPTY_9'] || '').trim()
    const observation = String(row['__EMPTY_10'] || '').trim()

    if (!value || !code) return null

    const sign = /receber/i.test(tipo) ? 1 : -1
    const signedValue = value * sign

    return {
      tipo,
      competencia,
      liquidacao,
      value: signedValue,
      accountCode: code,
      planName,
      fornecedor,
      centroCusto,
      categoria,
      observation
    }
  }).filter(Boolean)
}

function categorizarConta(planName, accountCode) {
  const label = normalizeLabel(planName)
  
  // Receitas Operacionais
  if (/^102-1/.test(accountCode) && !/cancelad|devol/i.test(label)) {
    return { dreGroup: 'Receitas Operacionais', dfcGroup: 'Receitas Operacionais' }
  }
  if (/^302-1/.test(accountCode)) {
    return { dreGroup: 'Receitas Operacionais', dfcGroup: 'Receitas Operacionais' }
  }
  
  // Deduções de Receitas
  if (/cancelad|devol/i.test(label)) {
    return { dreGroup: 'Deduções de Receitas', dfcGroup: 'Deduções de Receitas' }
  }
  if (/^300-9|^431-9/.test(accountCode)) {
    return { dreGroup: 'Deduções de Receitas', dfcGroup: 'Deduções de Receitas' }
  }
  
  // Impostos
  if (/^205-0/.test(accountCode)) {
    return { dreGroup: 'Impostos Sobre o Faturamento', dfcGroup: 'Impostos Sobre o Faturamento' }
  }
  
  // CMV / Custos
  if (/^400-0/.test(accountCode) && /custo.*mercadoria/i.test(label)) {
    return { dreGroup: 'Custo de Mercadorias Vendidas', dfcGroup: 'Despesas Operacionais' }
  }
  if (/^400-/.test(accountCode)) {
    return { dreGroup: 'Despesas Operacionais', dfcGroup: 'Despesas Operacionais' }
  }
  
  // Despesas com Pessoal
  if (/^201-|^202-|^203-|^415-|^417-/.test(accountCode)) {
    return { dreGroup: 'Despesas Com Pessoal', dfcGroup: 'Despesas Com Pessoal' }
  }
  
  // Despesas Administrativas
  if (/^420-|^424-|^425-|^434-/.test(accountCode)) {
    return { dreGroup: 'Despesas Administrativas', dfcGroup: 'Despesas Administrativas' }
  }
  
  // Despesas Operacionais
  if (/^421-|^422-|^409-/.test(accountCode)) {
    return { dreGroup: 'Despesas Operacionais', dfcGroup: 'Despesas Operacionais' }
  }
  
  // Despesas Financeiras
  if (/^432-|^431-5/.test(accountCode)) {
    return { dreGroup: 'Despesas Financeiras', dfcGroup: 'Despesas Financeiras' }
  }
  
  // Receitas Financeiras
  if (/^303-4/.test(accountCode) && /desconto.*obtid/i.test(label)) {
    return { dreGroup: 'Receitas Financeiras', dfcGroup: 'Receitas Financeiras' }
  }
  
  // Investimentos e Outros
  if (/^200-8|^211-/.test(accountCode)) {
    return { dreGroup: 'Investimentos e Outros', dfcGroup: 'Investimentos e Outros' }
  }
  
  // Padrão: classificar pelo sinal
  return {
    dreGroup: 'Outras Receitas/Despesas',
    dfcGroup: 'Outras Receitas/Despesas'
  }
}

function aggregateDRE(transactions, cnpj, companyName, planNames) {
  const buckets = new Map()

  for (const tx of transactions) {
    if (!tx.competencia) continue
    
    const monthKey = tx.competencia
    const monthDate = `${monthKey}-01`
    const { dreGroup } = categorizarConta(tx.planName, tx.accountCode)
    const accountLabel = tx.planName || planNames[tx.accountCode] || `Conta ${tx.accountCode}`
    const key = `${monthDate}|${accountLabel}`

    if (!buckets.has(key)) {
      buckets.set(key, {
        company_cnpj: cnpj,
        company_nome: companyName,
        date: monthDate,
        account: accountLabel,
        group: dreGroup,
        total: 0
      })
    }

    const entry = buckets.get(key)
    entry.total += tx.value
  }

  const result = Array.from(buckets.values()).map(entry => {
    const amount = Math.round(Math.abs(entry.total) * 100) / 100
    // Supabase aceita apenas 'receita' ou 'despesa' no campo nature
    const nature = entry.total >= 0 ? 'receita' : 'despesa'
    return {
      company_cnpj: entry.company_cnpj,
      company_nome: entry.company_nome,
      date: entry.date,
      account: entry.account,
      nature,
      amount,
      created_at: new Date().toISOString()
    }
  })

  return result.filter(item => item.amount !== 0)
}

function aggregateDFC(transactions, cnpj, companyName) {
  const buckets = new Map()

  for (const tx of transactions) {
    if (!tx.liquidacao) continue
    
    const date = new Date(tx.liquidacao)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const { dfcGroup } = categorizarConta(tx.planName, tx.accountCode)
    const key = `${monthKey}|${dfcGroup}`
    
    if (!buckets.has(key)) {
      buckets.set(key, {
        month: monthKey,
        group: dfcGroup,
        entradas: 0,
        saidas: 0
      })
    }
    
    const bucket = buckets.get(key)
    if (tx.value >= 0) bucket.entradas += tx.value
    else bucket.saidas += Math.abs(tx.value)
  }

  const entries = []
  for (const bucket of buckets.values()) {
    const base = {
      company_cnpj: cnpj,
      company_nome: companyName,
      category: bucket.group,
      date: `${bucket.month}-01`,
      created_at: new Date().toISOString()
    }
    if (bucket.entradas > 0) {
      entries.push({
        ...base,
        kind: 'in',
        amount: Math.round(bucket.entradas * 100) / 100
      })
    }
    if (bucket.saidas > 0) {
      entries.push({
        ...base,
        kind: 'out',
        amount: Math.round(bucket.saidas * 100) / 100
      })
    }
  }
  return entries
}

async function uploadSupabase(table, rows, cnpj) {
  if (!supabase) return
  
  console.log(`\n🗑️  Limpando ${table} para CNPJ ${cnpj}...`)
  const { error: deleteError, count: deletedCount } = await supabase
    .from(table)
    .delete()
    .eq('company_cnpj', cnpj)
    .select()
  if (deleteError) {
    console.log(`   ⚠️  Erro ao deletar: ${deleteError.message}`)
  } else {
    console.log(`   ✅ Deletados: ${deletedCount?.length || 0} registros`)
  }

  console.log(`📤 Inserindo ${rows.length} registros em ${table}...`)
  let insertedTotal = 0
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { data, error } = await supabase.from(table).insert(batch).select()
    if (error) {
      console.log(`\n   ❌ Erro no batch ${i}-${i+batch.length}: ${error.message}`)
      console.log(`   Primeiro registro do batch:`, JSON.stringify(batch[0]).substring(0, 200))
      throw error
    }
    insertedTotal += data?.length || 0
    process.stdout.write(`\r   → ${Math.min(i + 500, rows.length)}/${rows.length}`)
  }
  process.stdout.write(`\n   ✅ Inseridos: ${insertedTotal} registros\n`)
}

function saveJSON(data, filePath) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

async function processarEmpresa(empresa, planNames) {
  const { cnpj, nome } = empresa
  
  console.log(`\n${'='.repeat(80)}`)
  console.log(`Processando: ${nome} (${cnpj})`)
  console.log('='.repeat(80))
  
  try {
    const transactions = loadTransactions(options.inputDir, cnpj)
    console.log(`   • Registros carregados: ${transactions.length}`)
    
    const dreEntries = aggregateDRE(transactions, cnpj, nome, planNames)
    const dfcEntries = aggregateDFC(transactions, cnpj, nome)
    
    console.log(`   • DRE gerado: ${dreEntries.length} linhas`)
    console.log(`   • DFC gerado: ${dfcEntries.length} linhas`)
    
    const drePath = path.join(options.outputDir, `dre_${cnpj}.json`)
    const dfcPath = path.join(options.outputDir, `dfc_${cnpj}.json`)
    saveJSON(dreEntries, drePath)
    saveJSON(dfcEntries, dfcPath)
    
    console.log(`   • Arquivos salvos em ${options.outputDir}`)
    
    if (options.upload) {
      await uploadSupabase('dre_entries', dreEntries, cnpj)
      await uploadSupabase('cashflow_entries', dfcEntries, cnpj)
      console.log('   ✅ Upload Supabase concluído!')
    }
    
    return { cnpj, nome, success: true, dreCount: dreEntries.length, dfcCount: dfcEntries.length }
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}`)
    return { cnpj, nome, success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Processador Grupo Volpe - 13 Empresas')
  console.log(`   • Diretório entrada: ${options.inputDir}`)
  console.log(`   • Plano de contas: ${options.planFile}`)
  console.log(`   • Upload Supabase: ${options.upload ? 'SIM' : 'NÃO'}`)
  
  const empresas = loadEmpresas(options.empresasFile)
  const planNames = loadPlanContas(options.planFile)
  
  console.log(`\n📋 Total de empresas: ${empresas.length}`)
  
  const empresasFiltradas = options.cnpjFilter
    ? empresas.filter(e => e.cnpj === options.cnpjFilter)
    : empresas
  
  if (empresasFiltradas.length === 0) {
    console.error(`❌ Nenhuma empresa encontrada com filtro: ${options.cnpjFilter}`)
    process.exit(1)
  }
  
  console.log(`📊 Empresas a processar: ${empresasFiltradas.length}`)
  
  const results = []
  for (const empresa of empresasFiltradas) {
    const result = await processarEmpresa(empresa, planNames)
    results.push(result)
  }
  
  console.log(`\n${'='.repeat(80)}`)
  console.log('RESUMO DO PROCESSAMENTO')
  console.log('='.repeat(80))
  
  const sucesso = results.filter(r => r.success)
  const falhas = results.filter(r => !r.success)
  
  console.log(`✅ Processados com sucesso: ${sucesso.length}/${results.length}`)
  console.log(`❌ Falhas: ${falhas.length}/${results.length}`)
  
  if (sucesso.length > 0) {
    console.log('\n📊 Estatísticas:')
    const totalDRE = sucesso.reduce((sum, r) => sum + r.dreCount, 0)
    const totalDFC = sucesso.reduce((sum, r) => sum + r.dfcCount, 0)
    console.log(`   • Total DRE: ${totalDRE} linhas`)
    console.log(`   • Total DFC: ${totalDFC} linhas`)
  }
  
  if (falhas.length > 0) {
    console.log('\n❌ Empresas com erro:')
    for (const f of falhas) {
      console.log(`   • ${f.nome} (${f.cnpj}): ${f.error}`)
    }
  }
  
  console.log('\n✅ Processamento concluído!')
}

main().catch(err => {
  console.error('\n❌ Falha fatal:', err.message)
  process.exit(1)
})
