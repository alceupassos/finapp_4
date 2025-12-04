import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Executar script e aguardar conclusão
 */
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🚀 Executando: ${scriptPath}`)
    console.log('='.repeat(60))

    const child = spawn('node', [scriptPath], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${scriptPath} concluído com sucesso\n`)
        resolve()
      } else {
        console.error(`\n❌ ${scriptPath} falhou com código ${code}\n`)
        reject(new Error(`Script falhou com código ${code}`))
      }
    })

    child.on('error', (error) => {
      console.error(`\n❌ Erro ao executar ${scriptPath}:`, error.message)
      reject(error)
    })
  })
}

/**
 * Função principal
 */
async function main() {
  console.log('🎯 Iniciando importação completa - Grupo Volpe')
  console.log('📋 Ordem de execução:')
  console.log('   1. Plano de Contas')
  console.log('   2. Contas Bancárias')
  console.log('   3. DRE/DFC (Dados Financeiros)')
  console.log('\n⏱️  Este processo pode levar vários minutos...\n')

  const scripts = [
    join(__dirname, 'import_volpe_chart_of_accounts.mjs'),
    join(__dirname, 'import_volpe_bank_accounts.mjs'),
    join(__dirname, 'import_volpe_financial_data.mjs'),
  ]

  try {
    for (const script of scripts) {
      await runScript(script)
      // Delay entre scripts
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    console.log('\n' + '='.repeat(60))
    console.log('✨ Importação completa concluída com sucesso!')
    console.log('='.repeat(60))
    console.log('\n📊 Próximos passos:')
    console.log('   1. Verificar dados no Supabase')
    console.log('   2. Testar visualização na interface (Relatórios)')
    console.log('   3. Verificar se todos os dados estão corretos\n')
  } catch (error) {
    console.error('\n❌ Erro durante a importação:', error.message)
    console.error('\n💡 Verifique os logs acima para identificar o problema.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Erro inesperado:', err)
  process.exit(1)
})

