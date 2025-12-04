import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Este script apenas imprime os SQLs para serem aplicados via MCP
// Como não temos acesso direto ao MCP aqui, vamos gerar um relatório

const batches = [1, 2, 3, 4];
let totalLines = 0;

console.log('=== RELATÓRIO DE BATCHES DRE ===\n');

for (const batchNum of batches) {
  const batchFile = join(__dirname, '..', `tmp/dre_batch_${batchNum}.sql`);
  const sql = readFileSync(batchFile, 'utf-8');
  
  // Contar linhas de valores (linhas que começam com '(')
  const valueLines = sql.split('\n').filter(l => l.trim().startsWith('(')).length;
  totalLines += valueLines;
  
  console.log(`Batch ${batchNum}: ${valueLines} registros (${sql.length} caracteres)`);
}

console.log(`\n✅ Total: ${totalLines} registros DRE para aplicar`);
console.log('\n⚠️  Aplique cada batch via MCP Supabase execute_sql');
console.log('   Arquivos: tmp/dre_batch_1.sql até tmp/dre_batch_4.sql');

