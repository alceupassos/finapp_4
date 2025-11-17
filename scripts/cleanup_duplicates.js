import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function cleanupDuplicates() {
  console.log('🧹 Iniciando higienização da base de dados...\n');

  // 1. Limpar duplicatas em cashflow_entries
  console.log('1️⃣ Limpando duplicatas em cashflow_entries...');
  const { data: cashflowData, error: cashflowError } = await supabase
    .from('cashflow_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (cashflowError) {
    console.error('❌ Erro ao buscar cashflow:', cashflowError);
    return;
  }

  const cashflowDuplicates = new Map();
  const cashflowIdsToDelete = [];

  cashflowData.forEach(record => {
    const key = `${record.company_cnpj}-${record.data}-${record.descricao}-${record.valor}`;
    if (cashflowDuplicates.has(key)) {
      cashflowIdsToDelete.push(record.id);
    } else {
      cashflowDuplicates.set(key, record.id);
    }
  });

  if (cashflowIdsToDelete.length > 0) {
    console.log(`   📊 Encontradas ${cashflowIdsToDelete.length} duplicatas em cashflow`);
    const { error: deleteError } = await supabase
      .from('cashflow_entries')
      .delete()
      .in('id', cashflowIdsToDelete);
    
    if (deleteError) {
      console.error('❌ Erro ao deletar duplicatas cashflow:', deleteError);
    } else {
      console.log(`   ✅ Removidas ${cashflowIdsToDelete.length} duplicatas cashflow`);
    }
  }

  // 2. Limpar duplicatas em dre_entries
  console.log('2️⃣ Limpando duplicatas em dre_entries...');
  const { data: dreData, error: dreError } = await supabase
    .from('dre_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (dreError) {
    console.error('❌ Erro ao buscar DRE:', dreError);
    return;
  }

  const dreDuplicates = new Map();
  const dreIdsToDelete = [];

  dreData.forEach(record => {
    const key = `${record.company_cnpj}-${record.grupo}-${record.conta}-${record.periodo}`;
    if (dreDuplicates.has(key)) {
      dreIdsToDelete.push(record.id);
    } else {
      dreDuplicates.set(key, record.id);
    }
  });

  if (dreIdsToDelete.length > 0) {
    console.log(`   📊 Encontradas ${dreIdsToDelete.length} duplicatas em DRE`);
    const { error: deleteError } = await supabase
      .from('dre_entries')
      .delete()
      .in('id', dreIdsToDelete);
    
    if (deleteError) {
      console.error('❌ Erro ao deletar duplicatas DRE:', deleteError);
    } else {
      console.log(`   ✅ Removidas ${dreIdsToDelete.length} duplicatas DRE`);
    }
  }

  // 3. Verificar resumo final
  console.log('\n📈 Resumo da limpeza:');
  
  const { count: cashflowCount } = await supabase
    .from('cashflow_entries')
    .select('*', { count: 'exact', head: true });

  const { count: dreCount } = await supabase
    .from('dre_entries')
    .select('*', { count: 'exact', head: true });

  console.log(`   📊 Total cashflow_entries: ${cashflowCount}`);
  console.log(`   📊 Total dre_entries: ${dreCount}`);
  
  console.log('\n✅ Higienização concluída!');
}

cleanupDuplicates();