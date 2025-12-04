import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlFile = join(__dirname, '..', 'f360_import_october_consolidated.sql');
const sqlContent = readFileSync(sqlFile, 'utf-8');

// Extrair apenas a parte DRE (até o primeiro ON CONFLICT)
const dreMatch = sqlContent.match(/INSERT INTO dre_entries[\s\S]*?ON CONFLICT[\s\S]*?updated_at = NOW\(\);?/);
if (!dreMatch) {
  console.error('Não foi possível encontrar a seção DRE no SQL');
  process.exit(1);
}

let dreSql = dreMatch[0];

// Dividir em batches de 20 registros
const lines = dreSql.split('\n');
const insertLine = lines.findIndex(l => l.includes('INSERT INTO dre_entries'));
const valuesStart = insertLine + 2; // Linha após VALUES
const onConflictLine = lines.findIndex(l => l.includes('ON CONFLICT'));

const valuesLines = lines.slice(valuesStart, onConflictLine);
const conflictClause = lines.slice(onConflictLine).join('\n');

// Agrupar valores em batches de 20
const batchSize = 20;
const batches = [];
for (let i = 0; i < valuesLines.length; i += batchSize) {
  const batch = valuesLines.slice(i, i + batchSize).map(line => line.trim().replace(/,\s*$/, ''));
  if (batch.length > 0) {
    batches.push(batch);
  }
}

console.log(`Total de batches: ${batches.length}`);
console.log(`Total de linhas de valores: ${valuesLines.length}`);

// Gerar SQL para cada batch
for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  const batchSql = `INSERT INTO dre_entries (company_id, company_cnpj, date, account, account_code, natureza, valor, description, source_erp, source_id)
VALUES
${batch.join(',\n')}
${conflictClause}`;
  
  const outputFile = join(__dirname, '..', `tmp/dre_batch_${i + 1}.sql`);
  writeFileSync(outputFile, batchSql);
  console.log(`Batch ${i + 1}/${batches.length} gerado: ${outputFile}`);
}

console.log('\nSQL dividido em batches. Execute cada batch via MCP Supabase.');

