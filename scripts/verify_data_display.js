import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verifyDataDisplay() {
  console.log('📊 Verificando estrutura de dados para display...\n');
  
  const matrizCnpj = '26888098000159';
  
  // 1. Verificar DRE
  console.log('🔍 DRE - Estrutura para colunas por mês:');
  const { data: dreData } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('company_cnpj', matrizCnpj)
    .limit(20);

  if (dreData && dreData.length > 0) {
    console.log('   ✅ Total registros:', dreData.length);
    
    // Agrupar por mês/natureza
    const monthlyData = dreData.reduce((acc, item) => {
      const month = item.date?.substring(0, 7) || 'unknown';
      const nature = item.nature || 'Outros';
      
      if (!acc[month]) acc[month] = {};
      acc[month][nature] = (acc[month][nature] || 0) + item.amount;
      
      return acc;
    }, {});
    
    console.log('   📅 Dados por mês:');
    Object.entries(monthlyData).forEach(([month, data]) => {
      console.log(`   ${month}:`, Object.keys(data).length, 'naturezas');
    });
    
    console.log('   🏷️ Naturezas únicas:', [...new Set(dreData.map(d => d.nature))].length);
  }
  
  // 2. Verificar DFC
  console.log('\n🔍 DFC - Estrutura para colunas por mês:');
  const { data: dfcData } = await supabase
    .from('cashflow_entries')
    .select('*')
    .eq('company_cnpj', matrizCnpj)
    .limit(20);

  if (dfcData && dfcData.length > 0) {
    console.log('   ✅ Total registros:', dfcData.length);
    
    // Agrupar por mês
    const monthlyDfc = dfcData.reduce((acc, item) => {
      const month = item.date?.substring(0, 7) || 'unknown';
      
      if (!acc[month]) acc[month] = { entradas: 0, saidas: 0 };
      
      if (item.amount > 0) {
        acc[month].entradas += item.amount;
      } else {
        acc[month].saidas += Math.abs(item.amount);
      }
      
      return acc;
    }, {});
    
    console.log('   📅 Dados por mês:');
    Object.entries(monthlyDfc).forEach(([month, data]) => {
      console.log(`   ${month}: Entradas ${data.entradas.toFixed(2)}, Saídas ${data.saidas.toFixed(2)}`);
    });
  }
  
  console.log('\n✅ Análise concluída!');
  console.log('💡 Os dados estão em formato de linhas (registros individuais)');
  console.log('📊 Para colunas por mês, precisamos pivotar os dados');
}

verifyDataDisplay();