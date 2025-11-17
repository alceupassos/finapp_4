import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

  const MATRIZ_CNPJ = '26888098000159'; // Matriz VOLPE (formato sem zeros à esquerda)

async function analyzeMatrizData() {
  console.log('📊 Analisando dados da Matriz VOLPE (0159)...\n');

  // 1. Verificar dados existentes
  console.log('1️⃣ Dados existentes para Matriz 0159:');
  
  const { data: cashflowData, error: cashflowError } = await supabase
    .from('cashflow_entries')
    .select('*')
    .eq('company_cnpj', MATRIZ_CNPJ)
    .order('data', { ascending: true });

  const { data: dreData, error: dreError } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('company_cnpj', MATRIZ_CNPJ)
    .order('periodo', { ascending: true });

  console.log(`   📈 Cashflow: ${cashflowData?.length || 0} registros`);
  console.log(`   📊 DRE: ${dreData?.length || 0} registros`);

  // 2. Analisar períodos cobertos
  if (cashflowData && cashflowData.length > 0) {
    const cashflowDates = cashflowData.map(d => new Date(d.data));
    const minDate = new Date(Math.min(...cashflowDates));
    const maxDate = new Date(Math.max(...cashflowDates));
    console.log(`   📅 Cashflow período: ${minDate.toLocaleDateString('pt-BR')} até ${maxDate.toLocaleDateString('pt-BR')}`);
  }

  if (dreData && dreData.length > 0) {
    const dreDates = dreData.map(d => new Date(d.periodo));
    const minDate = new Date(Math.min(...dreDates));
    const maxDate = new Date(Math.max(...dreDates));
    console.log(`   📅 DRE período: ${minDate.toLocaleDateString('pt-BR')} até ${maxDate.toLocaleDateString('pt-BR')}`);
  }

  // 3. Verificar gaps mensais
  console.log('\n2️⃣ Análise de gaps mensais:');
  
  const currentYear = 2025;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  for (let month of months) {
    const monthStart = `${currentYear}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${currentYear}-${String(month).padStart(2, '0')}-${new Date(currentYear, month, 0).getDate()}`;
    
    const { count: cashflowMonth } = await supabase
      .from('cashflow_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_cnpj', MATRIZ_CNPJ)
      .gte('data', monthStart)
      .lte('data', monthEnd);

    const { count: dreMonth } = await supabase
      .from('dre_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_cnpj', MATRIZ_CNPJ)
      .gte('periodo', monthStart)
      .lte('periodo', monthEnd);

    const monthName = new Date(2025, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    console.log(`   ${monthName}: Cashflow ${cashflowMonth || 0} | DRE ${dreMonth || 0}`);
  }

  // 4. Verificar estrutura de contas
  console.log('\n3️⃣ Estrutura de contas DRE:');
  
  if (dreData && dreData.length > 0) {
    const grupos = [...new Set(dreData.map(d => d.grupo))];
    const contas = [...new Set(dreData.map(d => d.conta))];
    
    console.log(`   📋 Grupos DRE: ${grupos.length}`);
    console.log(`   📋 Contas DRE: ${contas.length}`);
    
    console.log('\n   📊 Top 10 contas por valor:');
    const topContas = dreData
      .reduce((acc, item) => {
        const key = `${item.grupo} - ${item.conta}`;
        acc[key] = (acc[key] || 0) + Math.abs(item.valor);
        return acc;
      }, {})
      .then(obj => Object.entries(obj)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([conta, valor]) => {
          console.log(`      ${conta}: R$ ${valor.toLocaleString('pt-BR')}`);
        }));
  }

  // 5. Verificar arquivos esperados
  console.log('\n4️⃣ Verificação de arquivos esperados:');
  
  const expectedFiles = [
    'avant/integracao/f360/DRE.....xls',
    'avant/integracao/f360/plano_de_contas',
    'avant/integracao/f360/DFC.....xls'
  ];

  expectedFiles.forEach(file => {
    console.log(`   ${file}: ⚠️ Verificação manual necessária`);
  });

  // 6. Relatório de gaps
  console.log('\n5️⃣ Relatório de gaps para preenchimento:');
  
  const gaps = [];
  
  // Verificar meses sem dados
  for (let month of months) {
    const monthStart = `${currentYear}-${String(month).padStart(2, '0')}-01`;
    const { count: cashflowCount } = await supabase
      .from('cashflow_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_cnpj', MATRIZ_CNPJ)
      .gte('data', monthStart)
      .lt('data', `${currentYear}-${String(month + 1).padStart(2, '0')}-01`);

    const { count: dreCount } = await supabase
      .from('dre_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_cnpj', MATRIZ_CNPJ)
      .gte('periodo', monthStart)
      .lt('periodo', `${currentYear}-${String(month + 1).padStart(2, '0')}-01`);

    if (!cashflowCount || cashflowCount === 0) {
      gaps.push(`Cashflow ${new Date(2025, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}`);
    }
    if (!dreCount || dreCount === 0) {
      gaps.push(`DRE ${new Date(2025, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}`);
    }
  }

  console.log('\n📋 Dados faltantes para preencher:');
  if (gaps.length > 0) {
    gaps.forEach(gap => console.log(`   ❌ ${gap}`));
  } else {
    console.log('   ✅ Todos os meses possuem dados');
  }

  console.log('\n✅ Análise concluída!');
}

analyzeMatrizData();