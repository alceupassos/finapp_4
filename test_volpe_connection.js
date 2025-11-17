// Script para testar conexão com dados VOLPE
import { SupabaseRest } from './src/services/supabaseRest.js';

async function testVolpeData() {
  console.log('🧪 Testando conexão com dados VOLPE...\n');
  
  try {
    // Testar empresas
    console.log('1. Carregando empresas do grupo VOLPE...');
    const companies = await SupabaseRest.getCompanies();
    const volpeCompanies = companies.filter(c => 
      c.grupo_empresarial === 'VOLPE' || 
      c.cliente_nome?.toLowerCase().includes('volpe') ||
      String(c.cnpj || '').startsWith('26888098')
    );
    console.log(`   ✅ Encontradas ${volpeCompanies.length} empresas VOLPE:`);
    volpeCompanies.forEach(c => {
      console.log(`      - ${c.cliente_nome} (${c.cnpj})`);
    });

    // Testar DRE da matriz 0159
    console.log('\n2. Carregando DRE da matriz 0159...');
    const dreData = await SupabaseRest.getDRE('26888098000159');
    console.log(`   ✅ ${dreData.length} registros DRE encontrados`);

    // Testar DFC da matriz 0159
    console.log('\n3. Carregando DFC da matriz 0159...');
    const dfcData = await SupabaseRest.getDFC('26888098000159');
    console.log(`   ✅ ${dfcData.length} registros DFC encontrados`);

    console.log('\n✅ Teste concluído com sucesso!');
    console.log('   Acesse http://localhost:3002 para ver o dashboard');
    
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
  }
}

testVolpeData();