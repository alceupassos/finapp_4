import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SQL_FILE = join(__dirname, '..', 'f360_import_october_consolidated.sql');

console.log('📖 Lendo arquivo SQL consolidado...');
const sqlContent = readFileSync(SQL_FILE, 'utf-8');

// Dividir em statements (separados por ;\n\n ou ;\n\n\n)
const statements = sqlContent
  .split(/;\s*\n\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📊 Encontrados ${statements.length} statements SQL`);

// Agrupar statements por tipo (INSERT INTO dre_entries, INSERT INTO dfc_entries)
const dreStatements = [];
const dfcStatements = [];

for (const stmt of statements) {
  if (stmt.includes('INSERT INTO dre_entries')) {
    dreStatements.push(stmt);
  } else if (stmt.includes('INSERT INTO dfc_entries')) {
    dfcStatements.push(stmt);
  }
}

console.log(`\n📋 DRE statements: ${dreStatements.length}`);
console.log(`📋 DFC statements: ${dfcStatements.length}`);

// Salvar statements para execução manual via MCP
const outputFile = join(__dirname, '..', 'f360_import_statements.json');
const output = {
  dre: dreStatements,
  dfc: dfcStatements,
  total_statements: statements.length
};

import { writeFileSync } from 'fs';
writeFileSync(outputFile, JSON.stringify(output, null, 2));

console.log(`\n✅ Statements salvos em: ${outputFile}`);
console.log(`\n💡 Para aplicar via MCP Supabase:`);
console.log(`   1. Use mcp_supabase_execute_sql para cada statement`);
console.log(`   2. Ou use mcp_supabase_apply_migration com o SQL completo`);

// Tentar executar via MCP (se disponível)
console.log(`\n⚠️  Execução via MCP requer ferramenta mcp_supabase_execute_sql`);
console.log(`   O arquivo SQL foi preparado para execução manual.`);

