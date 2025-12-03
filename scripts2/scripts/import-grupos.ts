/**
 * Script de Importação de Empresas de Grupo
 * 
 * Importa empresas dentro de grupos baseado nos resultados da investigação da API.
 * Marca empresas com is_group = true e associa empresas filhas ao grupo pai.
 * 
 * Uso:
 *   tsx scripts/import-grupos.ts <group-token>
 * 
 * Exemplo:
 *   tsx scripts/import-grupos.ts "token-do-grupo-aqui"
 */

import { createClient } from '@supabase/supabase-js'
import { F360Client } from '../src/lib/f360/client-definitivo'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

interface CompanyData {
  cnpj: string
  razao_social: string
  nome_fantasia?: string
  [key: string]: unknown
}

/**
 * Extrai CNPJs de dados da API F360
 */
function extractCnpjs(data: unknown): CompanyData[] {
  const companies: CompanyData[] = []
  const seenCnpjs = new Set<string>()

  const extractFromObject = (obj: any, depth = 0): void => {
    if (depth > 5) return

    if (Array.isArray(obj)) {
      obj.forEach(item => extractFromObject(item, depth + 1))
    } else if (obj && typeof obj === 'object') {
      // Procurar por objetos que possam representar empresas
      if (obj.cnpj || obj.CNPJ || obj.CpfCnpj) {
        const cnpj = String(obj.cnpj || obj.CNPJ || obj.CpfCnpj || '').replace(/[.\/-]/g, '')
        if (cnpj.length === 14 && !seenCnpjs.has(cnpj)) {
          seenCnpjs.add(cnpj)
          companies.push({
            cnpj,
            razao_social: String(obj.razao_social || obj.RazaoSocial || obj.Nome || obj.nome || 'Empresa sem nome'),
            nome_fantasia: obj.nome_fantasia || obj.NomeFantasia || undefined,
          })
        }
      }

      // Continuar procurando recursivamente
      for (const key in obj) {
        extractFromObject(obj[key], depth + 1)
      }
    }
  }

  extractFromObject(data)
  return companies
}

/**
 * Importa empresas de um grupo
 */
async function importGroupCompanies(groupToken: string, groupName?: string) {
  try {
    console.log(`\n🚀 Importando grupo com token: ${groupToken.substring(0, 20)}...`)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const f360Client = new F360Client(groupToken)

    // Step 1: Criar empresa grupo no banco
    const groupCompanyName = groupName || 'Grupo Empresarial'
    console.log(`\n📝 Criando empresa grupo: ${groupCompanyName}`)

    const { data: groupCompany, error: groupError } = await supabase
      .from('companies')
      .insert({
        cnpj: `GRUPO-${Date.now()}`, // CNPJ temporário para grupos
        razao_social: groupCompanyName,
        token_f360: groupToken,
        is_group: true,
        group_token: groupToken,
        active: true,
      })
      .select()
      .single()

    if (groupError) {
      throw new Error(`Failed to create group company: ${groupError.message}`)
    }

    console.log(`  ✅ Grupo criado com ID: ${groupCompany.id}`)

    // Step 2: Obter empresas filhas usando diferentes endpoints
    console.log(`\n🔍 Buscando empresas filhas...`)

    const allCompanies: CompanyData[] = []

    // Tentar obter CNPJs de diferentes endpoints
    try {
      console.log('  - Testando endpoint ListarPessoas...')
      const pessoas = await f360Client.listarPessoas(1, 'ambos')
      const companiesFromPessoas = extractCnpjs(pessoas)
      allCompanies.push(...companiesFromPessoas)
      console.log(`    ✓ Encontradas ${companiesFromPessoas.length} empresas`)
    } catch (error) {
      console.log(`    ✗ Erro: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    try {
      console.log('  - Testando endpoint GerarRelatorioContabil...')
      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0]

      const relatorio = await f360Client.gerarRelatorioContabil({
        Data: inicioMes,
        DataFim: fimMes,
        ModeloContabil: 'provisao',
        ModeloRelatorio: 'gerencial',
        ExtensaoDeArquivo: 'json',
        CNPJEmpresas: [],
        Pagina: 1,
        RegistrosPorPagina: 100,
      })

      const companiesFromRelatorio = extractCnpjs(relatorio)
      allCompanies.push(...companiesFromRelatorio)
      console.log(`    ✓ Encontradas ${companiesFromRelatorio.length} empresas`)
    } catch (error) {
      console.log(`    ✗ Erro: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    // Remover duplicatas por CNPJ
    const uniqueCompanies = new Map<string, CompanyData>()
    allCompanies.forEach(company => {
      if (!uniqueCompanies.has(company.cnpj)) {
        uniqueCompanies.set(company.cnpj, company)
      }
    })

    const childCompanies = Array.from(uniqueCompanies.values())
    console.log(`\n  📊 Total de empresas únicas encontradas: ${childCompanies.length}`)

    if (childCompanies.length === 0) {
      console.log(`\n⚠️  Nenhuma empresa filha encontrada. O grupo pode não ter empresas associadas ou os endpoints não retornaram CNPJs.`)
      return { groupId: groupCompany.id, childCount: 0 }
    }

    // Step 3: Criar empresas filhas no banco
    console.log(`\n💾 Criando empresas filhas no banco de dados...`)

    let successCount = 0
    let errorCount = 0

    for (const company of childCompanies) {
      try {
        // Verificar se empresa já existe
        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .eq('cnpj', company.cnpj)
          .single()

        if (existing) {
          // Atualizar empresa existente para associar ao grupo
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              parent_company_id: groupCompany.id,
              group_token: groupToken,
            })
            .eq('id', existing.id)

          if (updateError) {
            throw updateError
          }

          console.log(`  ✓ Empresa existente atualizada: ${company.razao_social}`)
        } else {
          // Criar nova empresa
          const { error: insertError } = await supabase
            .from('companies')
            .insert({
              cnpj: company.cnpj,
              razao_social: company.razao_social,
              nome_fantasia: company.nome_fantasia,
              token_f360: groupToken, // Usar token do grupo
              is_group: false,
              parent_company_id: groupCompany.id,
              group_token: groupToken,
              active: true,
            })

          if (insertError) {
            throw insertError
          }

          console.log(`  ✓ Empresa criada: ${company.razao_social}`)
        }

        successCount++
      } catch (error) {
        console.error(`  ✗ Erro ao processar ${company.razao_social}: ${error instanceof Error ? error.message : 'Unknown'}`)
        errorCount++
      }
    }

    console.log(`\n✅ Importação concluída!`)
    console.log(`   - Empresas processadas com sucesso: ${successCount}`)
    console.log(`   - Erros: ${errorCount}`)
    console.log(`   - Grupo ID: ${groupCompany.id}`)

    return {
      groupId: groupCompany.id,
      childCount: successCount,
      errors: errorCount,
    }
  } catch (error) {
    console.error('❌ Erro ao importar grupo:', error)
    throw error
  }
}

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('❌ Erro: Token do grupo não fornecido')
    console.log('\nUso:')
    console.log('  tsx scripts/import-grupos.ts <group-token> [group-name]')
    console.log('\nExemplo:')
    console.log('  tsx scripts/import-grupos.ts "token-aqui" "Nome do Grupo"')
    process.exit(1)
  }

  const groupToken = args[0]
  const groupName = args[1]

  try {
    const result = await importGroupCompanies(groupToken, groupName)
    console.log('\n🎉 Processo concluído com sucesso!')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Falha na importação:', error)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error)
}

export { importGroupCompanies, extractCnpjs }

