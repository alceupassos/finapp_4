import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkMatrizData() {
  console.log('🔍 Verificando dados da Matriz VOLPE (0159)...\n');
  
  const matrizCnpj = '26888098000159';
  
  // 1. Cashflow
  const { data: cashflow, error: cfError } = await supabase
    .from('cashflow_entries')
    .select('*')
    .eq('company_cnpj', matrizCnpj);
  
  if (cfError) {
    console.error('❌ Erro cashflow:', cfError);
  } else {
    console.log(`📈 Cashflow entries: ${cashflow?.length || 0}`);
    if (cashflow && cashflow.length > 0) {
      console.log('   Primeiras datas:', [...new Set(cashflow.map(c => c.data))].slice(0, 5));
    }
  }
  
  // 2. DRE
  const { data: dre, error: dreError } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('company_cnpj', matrizCnpj);
  
  if (dreError) {
    console.error('❌ Erro DRE:', dreError);
  } else {
    console.log(`📊 DRE entries: ${dre?.length || 0}`);
    if (dre && dre.length > 0) {
      console.log('   Primeiros períodos:', [...new Set(dre.map(d => d.periodo))].slice(0, 5));
    }
  }
  
  // 3. Resumo
  console.log('\n📋 RESUMO MATRIZ VOLPE 0159:');
  console.log(`   📈 Cashflow: ${cashflow?.length || 0} registros`);
  console.log(`   📊 DRE: ${dre?.length || 0} registros`);
  
  if (cashflow && cashflow.length === 0 && dre && dre.length === 0) {
    console.log('   ⚠️ Nenhum dado encontrado para matriz 0159');
  } else {
    console.log('   ✅ Dados encontrados para matriz 0159');
  }
}

checkMatrizData().catch(console.error);