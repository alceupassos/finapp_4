# 📊 Scripts de Importação - Grupo Volpe

Scripts para importar dados financeiros do Grupo Volpe para o Supabase.

## 📁 Estrutura dos Dados

```
avant/integracao/f360/
├── 26888098000159.xlsx  ... 26888098001392.xlsx  (13 empresas)
├── PlanoDeContas.xlsx                              (Plano de contas unificado)
└── DRE-202511141757__.xlsx                        (DRE e DFC consolidados)
```

## 🔧 Preparação

### 1. Criar tabelas no Supabase

Execute o SQL em `scripts/create_tables.sql` no SQL Editor do Supabase Dashboard:

```bash
# Copiar conteúdo do arquivo e executar no Supabase
cat scripts/create_tables.sql
```

Ou via linha de comando (se tiver psql configurado):
```bash
psql $DATABASE_URL < scripts/create_tables.sql
```

### 2. Verificar .env.local

Certifique-se de que `.env.local` contém:
```env
VITE_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

## 🚀 Execução

### Opção 1: Importação Completa (Recomendado)

```bash
chmod +x scripts/run_full_import.sh
./scripts/run_full_import.sh
```

### Opção 2: Importação Manual (Passo a Passo)

```bash
# 1. Importar empresas
node scripts/import_group_companies.mjs

# 2. Importar plano de contas
node scripts/import_chart_of_accounts.mjs

# 3. Importar transações de todas empresas (cashflow_entries)
node scripts/import_all_transactions.mjs

# 4. Importar DRE e DFC consolidados da matriz
node scripts/import_consolidated_reports.mjs

# 5. Validar importação
node scripts/validate_import.mjs
```

## 📋 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `inspect_excel.mjs` | Analisa estrutura de um arquivo Excel |
| `import_group_companies.mjs` | Cadastra as 13 empresas do grupo |
| `import_chart_of_accounts.mjs` | Importa plano de contas (204 contas) |
| `import_all_transactions.mjs` | Importa transações dos 13 arquivos CNPJ.xlsx |
| `import_consolidated_reports.mjs` | Importa DRE e DFC do arquivo consolidado |
| `validate_import.mjs` | Valida dados importados |
| `run_full_import.sh` | Executa importação completa |

## 🔍 Inspeção de Arquivos

Para entender a estrutura de qualquer arquivo Excel:

```bash
node scripts/inspect_excel.mjs avant/integracao/f360/26888098000159.xlsx
node scripts/inspect_excel.mjs avant/integracao/f360/PlanoDeContas.xlsx
node scripts/inspect_excel.mjs avant/integracao/f360/DRE-202511141757__.xlsx
```

## 📊 Dados Importados

Após execução completa:

- **companies**: 13 empresas
- **chart_of_accounts**: ~204 contas contábeis
- **cashflow_entries**: ~137k+ transações (todas empresas)
- **dre_entries**: Dados DRE consolidados

## ✅ Validação

Execute para verificar:
```bash
node scripts/validate_import.mjs
```

Saída esperada:
```
📊 VALIDANDO IMPORTAÇÃO
1️⃣  EMPRESAS: 13
2️⃣  PLANO DE CONTAS: 204 contas
3️⃣  FLUXO DE CAIXA: XXX.XXX registros
4️⃣  DRE: X.XXX registros
5️⃣  PERÍODO: 2024-XX-XX até 2025-XX-XX
```

## 🐛 Solução de Problemas

### Erro: "relation does not exist"
→ Execute primeiro `scripts/create_tables.sql` no Supabase

### Erro: "invalid_grant" ou "JWT expired"
→ Verifique SUPABASE_SERVICE_ROLE_KEY em `.env.local`

### Erro: "File not found"
→ Certifique-se de estar na raiz do projeto (`/Users/.../finapp_v4`)

### Importação lenta
→ Normal para grandes volumes. Script processa em lotes de 500.

## 📝 Notas

- **Duplicatas**: Scripts usam `insert` (não `upsert`) para evitar sobrescrever dados
- **Performance**: Processamento em lotes otimizado (50-500 registros por vez)
- **Encoding**: Suporta caracteres especiais (UTF-8)
- **Datas**: Converte Excel serial dates automaticamente
- **CNPJ**: Formato normalizado (14 dígitos sem formatação)

## 🔄 Re-importação

Para limpar e re-importar:

```sql
-- Limpar dados (CUIDADO!)
DELETE FROM cashflow_entries;
DELETE FROM dre_entries;
DELETE FROM companies;
DELETE FROM chart_of_accounts;

-- Depois executar novamente
./scripts/run_full_import.sh
```
