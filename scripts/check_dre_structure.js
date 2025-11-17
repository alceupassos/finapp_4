import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDREStructure() {
  console.log('🔍 Verificando estrutura dos dados DRE...\n');
  
  const matrizCnpj = '26888098000159';
  
  const { data: dreData, error } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('company_cnpj', matrizCnpj)
    .limit(10);

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log('📊 Total de registros para matriz:', dreData?.length || 0);
  
  if (dreData && dreData.length > 0) {
    console.log('\n🔍 Estrutura dos campos:');
    console.log(Object.keys(dreData[0]));
    
    console.log('\n📋 Primeiros registros:');
    dreData.forEach((item, index) => {
      console.log(`\n${index + 1}:`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Company CNPJ: ${item.company_cnpj}`);
      console.log(`   Período: ${item.periodo}`);
      console.log(`   Grupo: ${item.grupo}`);
      console.log(`   Conta: ${item.conta}`);
      console.log(`   Valor: ${item.valor}`);
      console.log(`   Created: ${item.created_at}`);
    });

    console.log('\n📊 Análise de períodos únicos:');
    const periodos = [...new Set(dreData.map(d => d.periodo))];
    console.log('   Períodos encontrados:', periodos);
    
    console.log('\n📊 Análise de grupos únicos:');
    const grupos = [...new Set(dreData.map(d => d.grupo))];
    console.log('   Grupos encontrados:', grupos);
  }
}

checkDREStructure();