# Scripts de Importação

## Importação em Massa F360

Script para importar todas as empresas do arquivo `tokens_f360.json` para o Supabase.

### Pré-requisitos

1. **Variáveis de Ambiente:**
   ```bash
   export F360_LOGIN_TOKEN="seu-token-de-login-f360"
   export NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
   ```

2. **Arquivo de Mapeamento (Opcional):**
   Crie `scripts/token-cnpj-mapping.json` com o mapeamento de tokens para CNPJs:
   ```json
   {
     "mappings": [
       {
         "token": "013162e0-b9a0-4e3b-b016-47ae83f5809c",
         "cnpj": "12345678000190",
         "companyName": "CARREIRA PRETA"
       }
     ]
   }
   ```

   **Nota:** O script tentará obter o CNPJ de empresas já existentes no banco. Se não encontrar, usará o mapeamento. Se não houver mapeamento, a empresa será pulada.

### Uso

#### Importar todas as empresas
```bash
npm run import:all
```

#### Importar apenas 5 empresas (teste)
```bash
npm run import:test
```

#### Importar quantidade customizada
```bash
npx tsx scripts/import-all-f360.ts --limit=10
```

### Funcionalidades

- ✅ **Processamento em Batches:** Processa 10 empresas por vez para não sobrecarregar
- ✅ **Importação Incremental:** Verifica se empresa já existe antes de criar
- ✅ **Tratamento de Grupos:** Identifica e agrupa empresas (ex: VOLPE)
- ✅ **Importação Completa:** Importa plano de contas e todos os lançamentos de 2025
- ✅ **Logs Detalhados:** Mostra progresso a cada 10 empresas
- ✅ **Relatório Final:** Estatísticas completas da importação

### Fluxo de Execução

1. Carrega tokens do arquivo `tokens_f360.json`
2. Carrega mapeamento token -> CNPJ (se existir)
3. Para cada empresa:
   - Verifica se já existe no banco (pelo token)
   - Se não existir, tenta obter CNPJ do mapeamento
   - Busca detalhes da empresa via API F360
   - Identifica grupo empresarial
   - Cria/atualiza cliente e empresa
   - Importa plano de contas
   - Importa lançamentos contábeis de 2025
4. Gera relatório final com estatísticas

### Tratamento de Erros

- Empresas sem CNPJ são puladas (não causam falha)
- Erros individuais são registrados mas não interrompem o processo
- Relatório final lista todos os erros encontrados

### Performance

- **Batch Size:** 10 empresas por vez
- **Delay entre batches:** 1 segundo
- **Paginação:** Lançamentos são buscados por mês (12 meses de 2025)
- **Inserção em lote:** Contas e lançamentos são inseridos em batches de 1000

### Exemplo de Saída

```
🚀 Iniciando importação em massa F360...

📂 Carregando tokens...
✅ 275 empresas encontradas
📂 Carregando mapeamento token -> CNPJ...
✅ 50 mapeamentos encontrados

📦 Processando em 28 batches de até 10 empresas

📦 Batch 1/28 (10 empresas)
  ↻ Empresa existente: CARREIRA PRETA (CNPJ: 12345678000190)
  📋 CNPJ do mapeamento: FÓRUM DO CAMPO LACANIANO (CNPJ: 98765432000110)
  ...

📊 Progresso: 10/275 (3.6%) | ✅ 8 | ❌ 2

...

============================================================
📊 RELATÓRIO FINAL
============================================================
⏱️  Tempo total: 1250.45s
✅ Empresas processadas com sucesso: 250
❌ Empresas com erro: 15
⏭️  Empresas puladas (sem CNPJ): 10
🆕 Empresas criadas: 200
🔄 Empresas atualizadas: 50
👥 Clientes criados: 5
📋 Contas importadas: 12500
📝 Lançamentos importados: 250000
============================================================
```

### Troubleshooting

**Erro: "CNPJ não encontrado"**
- Adicione o mapeamento no arquivo `token-cnpj-mapping.json`
- Ou importe a empresa manualmente primeiro para criar o registro no banco

**Erro: "F360_LOGIN_TOKEN environment variable is required"**
- Configure a variável de ambiente antes de executar

**Erro: "Missing Supabase environment variables"**
- Configure `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`

**Importação muito lenta**
- Reduza o batch size (edite `BATCH_SIZE` no script)
- Verifique conexão com API F360
- Verifique rate limits da API

