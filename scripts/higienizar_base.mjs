#!/usr/bin/env node
/**
 * Higienização da Base de Dados Supabase
 * ========================================
 * 
 * Este script limpa e reorganiza os dados no Supabase:
 * 1. Remove registros duplicados
 * 2. Valida campos obrigatórios
 * 3. Corrige formatos de data
 * 4. Remove registros órfãos ou inválidos
 * 5. Normaliza valores
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analisarDRE() {
  console.log('\n📊 ANALISANDO TABELA DRE_ENTRIES...\n')

  // Buscar todos os registros (em lotes)
  let allRecords = []
  let offset = 0
  const limit = 1000

  while (true) {
    const { data, error } = await supabase
      .from('dre_entries')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('id')

    if (error) {
      console.log('❌ Erro ao buscar registros:', error.message)
      break
    }

    if (!data || data.length === 0) break

    allRecords = [...allRecords, ...data]
    offset += limit

    if (data.length < limit) break
  }

  console.log(`✅ Total de registros encontrados: ${allRecords.length}`)

  // Análise de qualidade
  const problemas = {
    semCNPJ: [],
    semData: [],
    semConta: [],
    semNatureza: [],
    valorZero: [],
    valorNegativo: [],
    dataInvalida: [],
    duplicados: new Map()
  }

  allRecords.forEach(record => {
    // Validações
    if (!record.company_cnpj || record.company_cnpj.trim() === '') {
      problemas.semCNPJ.push(record.id)
    }

    if (!record.date) {
      problemas.semData.push(record.id)
    } else {
      const data = new Date(record.date)
      if (isNaN(data.getTime())) {
        problemas.dataInvalida.push(record.id)
      }
    }

    if (!record.account || record.account.trim() === '') {
      problemas.semConta.push(record.id)
    }

    if (!record.nature || !['receita', 'despesa'].includes(record.nature)) {
      problemas.semNatureza.push(record.id)
    }

    if (record.amount === 0 || record.amount === null) {
      problemas.valorZero.push(record.id)
    }

    if (record.amount < 0) {
      problemas.valorNegativo.push(record.id)
    }

    // Detectar duplicados (mesmo CNPJ + data + conta + valor)
    const key = `${record.company_cnpj}|${record.date}|${record.account}|${record.amount}`
    if (problemas.duplicados.has(key)) {
      problemas.duplicados.get(key).push(record.id)
    } else {
      problemas.duplicados.set(key, [record.id])
    }
  })

  // Filtrar apenas duplicados reais (mais de 1 registro)
  const duplicadosReais = new Map()
  problemas.duplicados.forEach((ids, key) => {
    if (ids.length > 1) {
      duplicadosReais.set(key, ids)
    }
  })

  // Relatório
  console.log('\n📋 RELATÓRIO DE QUALIDADE - DRE:\n')
  console.log(`   • Sem CNPJ: ${problemas.semCNPJ.length}`)
  console.log(`   • Sem Data: ${problemas.semData.length}`)
  console.log(`   • Data Inválida: ${problemas.dataInvalida.length}`)
  console.log(`   • Sem Conta: ${problemas.semConta.length}`)
  console.log(`   • Sem Natureza: ${problemas.semNatureza.length}`)
  console.log(`   • Valor Zero: ${problemas.valorZero.length}`)
  console.log(`   • Valor Negativo: ${problemas.valorNegativo.length}`)
  console.log(`   • Grupos Duplicados: ${duplicadosReais.size}`)

  return { allRecords, problemas, duplicadosReais }
}

async function analisarDFC() {
  console.log('\n📊 ANALISANDO TABELA CASHFLOW_ENTRIES...\n')

  let allRecords = []
  let offset = 0
  const limit = 1000

  while (true) {
    const { data, error } = await supabase
      .from('cashflow_entries')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('id')

    if (error) {
      console.log('❌ Erro ao buscar registros:', error.message)
      break
    }

    if (!data || data.length === 0) break

    allRecords = [...allRecords, ...data]
    offset += limit

    if (data.length < limit) break
  }

  console.log(`✅ Total de registros encontrados: ${allRecords.length}`)

  const problemas = {
    semCNPJ: [],
    semData: [],
    semCategoria: [],
    semKind: [],
    valorZero: [],
    valorNegativo: [],
    dataInvalida: [],
    duplicados: new Map()
  }

  allRecords.forEach(record => {
    if (!record.company_cnpj || record.company_cnpj.trim() === '') {
      problemas.semCNPJ.push(record.id)
    }

    if (!record.date) {
      problemas.semData.push(record.id)
    } else {
      const data = new Date(record.date)
      if (isNaN(data.getTime())) {
        problemas.dataInvalida.push(record.id)
      }
    }

    if (!record.category || record.category.trim() === '') {
      problemas.semCategoria.push(record.id)
    }

    if (!record.kind || !['in', 'out'].includes(record.kind)) {
      problemas.semKind.push(record.id)
    }

    if (record.amount === 0 || record.amount === null) {
      problemas.valorZero.push(record.id)
    }

    if (record.amount < 0) {
      problemas.valorNegativo.push(record.id)
    }

    const key = `${record.company_cnpj}|${record.date}|${record.category}|${record.kind}|${record.amount}`
    if (problemas.duplicados.has(key)) {
      problemas.duplicados.get(key).push(record.id)
    } else {
      problemas.duplicados.set(key, [record.id])
    }
  })

  const duplicadosReais = new Map()
  problemas.duplicados.forEach((ids, key) => {
    if (ids.length > 1) {
      duplicadosReais.set(key, ids)
    }
  })

  console.log('\n📋 RELATÓRIO DE QUALIDADE - DFC:\n')
  console.log(`   • Sem CNPJ: ${problemas.semCNPJ.length}`)
  console.log(`   • Sem Data: ${problemas.semData.length}`)
  console.log(`   • Data Inválida: ${problemas.dataInvalida.length}`)
  console.log(`   • Sem Categoria: ${problemas.semCategoria.length}`)
  console.log(`   • Sem Kind: ${problemas.semKind.length}`)
  console.log(`   • Valor Zero: ${problemas.valorZero.length}`)
  console.log(`   • Valor Negativo: ${problemas.valorNegativo.length}`)
  console.log(`   • Grupos Duplicados: ${duplicadosReais.size}`)

  return { allRecords, problemas, duplicadosReais }
}

async function limparDuplicados(tabela, duplicadosReais) {
  if (duplicadosReais.size === 0) {
    console.log(`\n✅ Nenhum duplicado encontrado em ${tabela}`)
    return 0
  }

  console.log(`\n🗑️  REMOVENDO DUPLICADOS DE ${tabela.toUpperCase()}...\n`)

  let totalRemovido = 0

  for (const [key, ids] of duplicadosReais.entries()) {
    // Manter o primeiro, remover os demais
    const idsParaRemover = ids.slice(1)
    
    console.log(`   Grupo: ${key.substring(0, 60)}...`)
    console.log(`   IDs duplicados: ${ids.join(', ')}`)
    console.log(`   Mantendo ID: ${ids[0]}, removendo: ${idsParaRemover.join(', ')}`)

    for (const id of idsParaRemover) {
      const { error } = await supabase
        .from(tabela)
        .delete()
        .eq('id', id)

      if (error) {
        console.log(`   ❌ Erro ao remover ID ${id}: ${error.message}`)
      } else {
        totalRemovido++
      }
    }
  }

  console.log(`\n✅ Total removido: ${totalRemovido} registros`)
  return totalRemovido
}

async function limparRegistrosInvalidos(tabela, problemas) {
  console.log(`\n🗑️  REMOVENDO REGISTROS INVÁLIDOS DE ${tabela.toUpperCase()}...\n`)

  let totalRemovido = 0

  // Remover registros sem campos obrigatórios
  const idsInvalidos = new Set([
    ...problemas.semCNPJ,
    ...problemas.semData,
    ...problemas.dataInvalida,
    ...(tabela === 'dre_entries' ? problemas.semConta : problemas.semCategoria),
    ...(tabela === 'dre_entries' ? problemas.semNatureza : problemas.semKind),
    ...problemas.valorZero,
    ...problemas.valorNegativo
  ])

  if (idsInvalidos.size === 0) {
    console.log(`✅ Nenhum registro inválido em ${tabela}`)
    return 0
  }

  console.log(`   • Total de IDs inválidos: ${idsInvalidos.size}`)

  for (const id of idsInvalidos) {
    const { error } = await supabase
      .from(tabela)
      .delete()
      .eq('id', id)

    if (error) {
      console.log(`   ❌ Erro ao remover ID ${id}: ${error.message}`)
    } else {
      totalRemovido++
    }
  }

  console.log(`\n✅ Total removido: ${totalRemovido} registros inválidos`)
  return totalRemovido
}

async function gerarEstatisticas() {
  console.log('\n📊 ESTATÍSTICAS FINAIS...\n')

  // DRE
  const { count: dreCount } = await supabase
    .from('dre_entries')
    .select('*', { count: 'exact', head: true })

  const { data: dreEmpresas } = await supabase
    .from('dre_entries')
    .select('company_cnpj, company_nome')
    .limit(5000)

  const dreEmpresasUnicas = new Set()
  dreEmpresas?.forEach(r => dreEmpresasUnicas.add(r.company_cnpj))

  console.log('DRE:')
  console.log(`   • Total de registros: ${dreCount}`)
  console.log(`   • Empresas únicas: ${dreEmpresasUnicas.size}`)

  // DFC
  const { count: dfcCount } = await supabase
    .from('cashflow_entries')
    .select('*', { count: 'exact', head: true })

  const { data: dfcEmpresas } = await supabase
    .from('cashflow_entries')
    .select('company_cnpj, company_nome')
    .limit(5000)

  const dfcEmpresasUnicas = new Set()
  dfcEmpresas?.forEach(r => dfcEmpresasUnicas.add(r.company_cnpj))

  console.log('\nDFC:')
  console.log(`   • Total de registros: ${dfcCount}`)
  console.log(`   • Empresas únicas: ${dfcEmpresasUnicas.size}`)

  console.log('\n')
}

async function main() {
  console.log('🧹 HIGIENIZAÇÃO DA BASE DE DADOS SUPABASE')
  console.log('=' .repeat(80))

  // Análise DRE
  const { problemas: problemasDRE, duplicadosReais: duplicadosDRE } = await analisarDRE()

  // Análise DFC
  const { problemas: problemasDFC, duplicadosReais: duplicadosDFC } = await analisarDFC()

  console.log('\n' + '='.repeat(80))
  console.log('EXECUTAR LIMPEZA?')
  console.log('='.repeat(80))
  console.log('\n⚠️  ATENÇÃO: Esta operação irá DELETAR dados permanentemente!')
  console.log('\nResumo das operações:')
  console.log(`   • DRE - Duplicados: ${duplicadosDRE.size} grupos`)
  console.log(`   • DRE - Inválidos: ${new Set([...problemasDRE.semCNPJ, ...problemasDRE.semData, ...problemasDRE.dataInvalida, ...problemasDRE.semConta, ...problemasDRE.semNatureza, ...problemasDRE.valorZero, ...problemasDRE.valorNegativo]).size}`)
  console.log(`   • DFC - Duplicados: ${duplicadosDFC.size} grupos`)
  console.log(`   • DFC - Inválidos: ${new Set([...problemasDFC.semCNPJ, ...problemasDFC.semData, ...problemasDFC.dataInvalida, ...problemasDFC.semCategoria, ...problemasDFC.semKind, ...problemasDFC.valorZero, ...problemasDFC.valorNegativo]).size}`)

  // Para executar automaticamente, comente as linhas abaixo
  console.log('\n▶️  Para executar a limpeza, rode:')
  console.log('    node scripts/higienizar_base.mjs --executar')
  
  if (!process.argv.includes('--executar')) {
    console.log('\n✅ Análise concluída (modo somente leitura)')
    return
  }

  console.log('\n🚀 INICIANDO LIMPEZA...\n')

  // Limpar duplicados
  await limparDuplicados('dre_entries', duplicadosDRE)
  await limparDuplicados('cashflow_entries', duplicadosDFC)

  // Limpar inválidos
  await limparRegistrosInvalidos('dre_entries', problemasDRE)
  await limparRegistrosInvalidos('cashflow_entries', problemasDFC)

  // Estatísticas finais
  await gerarEstatisticas()

  console.log('✅ HIGIENIZAÇÃO CONCLUÍDA!')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
