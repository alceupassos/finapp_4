// Teste rápido do sistema VOLPE
console.log('🎯 Testando sistema VOLPE...\n');

// Verificar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

console.log('✅ Variáveis de ambiente:');
console.log('   SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'OK' : '❌');
console.log('   SUPABASE_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'OK' : '❌');

// Testar login
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function runTests() {
  console.log('\n🔐 Testando login...');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'dev@angrax.com.br',
      password: 'B5b0dcf500@#'
    });
    
    if (error) {
      console.log('❌ Login falhou:', error.message);
    } else {
      console.log('✅ Login bem-sucedido!');
      console.log('   Usuário:', data.user.email);
      console.log('   Token:', data.session.access_token.substring(0, 20) + '...');
    }
  } catch (err) {
    console.log('❌ Erro no login:', err.message);
  }

  console.log('\n🏢 Testando empresas VOLPE...');
  
  try {
    const { data, error } = await supabase
      .from('integration_f360')
      .select('*')
      .order('cliente_nome');
    
    if (error) {
      console.log('❌ Erro ao buscar empresas:', error.message);
    } else {
      const volpeCompanies = data.filter(c => 
        c.cliente_nome?.toLowerCase().includes('volpe') ||
        String(c.cnpj || '').startsWith('26888098')
      );
      
      console.log('✅ Empresas VOLPE encontradas:', volpeCompanies.length);
      volpeCompanies.forEach(c => {
        console.log(`   - ${c.cliente_nome} (${c.cnpj})`);
      });
    }
  } catch (err) {
    console.log('❌ Erro ao buscar empresas:', err.message);
  }

  console.log('\n📊 Testando dados...');
  
  try {
    const { data: dfcData, error: dfcError } = await supabase
      .from('cashflow_entries')
      .select('*')
      .eq('company_cnpj', '26888098000159');
    
    if (dfcError) {
      console.log('❌ Erro DFC:', dfcError.message);
    } else {
      console.log('✅ DFC 0159 registros:', dfcData.length);
    }

    const { data: dreData, error: dreError } = await supabase
      .from('dre_entries')
      .select('*')
      .eq('company_cnpj', '26888098000159');
    
    if (dreError) {
      console.log('❌ Erro DRE:', dreError.message);
    } else {
      console.log('✅ DRE 0159 registros:', dreData.length);
    }
    
  } catch (err) {
    console.log('❌ Erro ao buscar dados:', err.message);
  }

  console.log('\n🚀 Sistema VOLPE está pronto!');
  console.log('   Acesse: http://localhost:3001');
  console.log('   Login: dev@angrax.com.br / B5b0dcf500@#');
  console.log('   Empresa padrão: 26888098000159 (Matriz VOLPE)');
}

runTests();