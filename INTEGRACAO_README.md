# Integração Omie + Supabase

Este documento descreve como usar a integração entre a API Omie e o Supabase para sincronizar dados de clientes e ERP.

## Configuração Inicial

### 1. Variáveis de Ambiente

Certifique-se de que seu arquivo `.env.local` contém:

```env
# Supabase
SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
```

### 2. Estrutura do Banco de Dados

As seguintes tabelas foram criadas no Supabase:

#### `erp_tokens`
Armazena as credenciais de acesso aos ERPs (Omie, Bling, etc).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| company_name | TEXT | Nome da empresa |
| erp_type | TEXT | Tipo de ERP (omie, bling, outros) |
| app_key | TEXT | App Key do ERP |
| app_secret | TEXT | App Secret do ERP |
| cnpj | TEXT | CNPJ da empresa |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |

#### `omie_clients`
Armazena clientes sincronizados do Omie.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| omie_id | BIGINT | ID do cliente no Omie |
| company_name | TEXT | Nome da empresa (FK virtual para erp_tokens) |
| cnpj | TEXT | CNPJ do cliente |
| razao_social | TEXT | Razão social |
| nome_fantasia | TEXT | Nome fantasia |
| email | TEXT | Email |
| telefone | TEXT | Telefone |
| endereco | TEXT | Endereço completo |
| cidade | TEXT | Cidade |
| estado | TEXT | Estado (UF) |
| cep | TEXT | CEP |
| status | TEXT | Status (ativo/inativo) |
| synced_at | TIMESTAMPTZ | Data da última sincronização |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |

#### `omie_contas_receber`
Armazena contas a receber do Omie.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| omie_id | BIGINT | ID da conta no Omie |
| company_name | TEXT | Nome da empresa |
| codigo_cliente_omie | BIGINT | ID do cliente no Omie |
| nome_cliente | TEXT | Nome do cliente |
| numero_documento | TEXT | Número do documento |
| tipo_documento | TEXT | Tipo do documento |
| valor_documento | NUMERIC(15,2) | Valor do documento |
| valor_pago | NUMERIC(15,2) | Valor pago |
| data_vencimento | DATE | Data de vencimento |
| data_emissao | DATE | Data de emissão |
| data_previsao | DATE | Data de previsão |
| status_titulo | TEXT | Status do título |
| observacao | TEXT | Observações |
| synced_at | TIMESTAMPTZ | Data da última sincronização |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |

## Scripts Disponíveis

### 1. Criar Tabelas no Supabase
```bash
npx tsx src/scripts/setup-db-postgres.ts
```
Cria todas as tabelas necessárias no banco de dados Supabase.

### 2. Testar Conexão Supabase
```bash
npx tsx src/scripts/test-supabase.ts
```
Valida a conexão com o Supabase e verifica se as tabelas foram criadas corretamente.

### 3. Testar API Omie
```bash
npx tsx src/scripts/test-omie.ts
```
Testa a conexão com a API Omie usando as credenciais configuradas e exibe estatísticas.

### 4. Importar Tokens e Sincronizar Clientes
```bash
npx tsx src/scripts/omie-import.ts
```
- Importa os tokens do Omie para a tabela `erp_tokens`
- Sincroniza todos os clientes do Omie para a tabela `omie_clients`
- Usa upsert, então pode ser executado múltiplas vezes sem duplicação

### 5. Integração AES / F360 (titulos)
```bash
pnpm run import:aes
```
- Lê `avant/integracao/f360/primeirocliente.csv`, trata campos opcionais (`categoria`, `centro de custo`) e agrega lançamentos por `Plano de Contas`.
- Insere os resultados em `dre_entries` e `cashflow_entries` usando as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
- Opcionalmente publica cada título no webhook F360 informado por `F360_WEBHOOK_TITULOS`, `F360_TOKEN` e `F360_CNPJ`.
  - O script infere centros/categoria mesmo que o CSV venha com campos vazios (ex.: `Observações`, palavras-chave pessoais ou `Plano de Contas`).
  - Cada parcela gera um rateio com competência em `MM-01`, centro de custo `'AES Geral'` ou derivado e plano de contas preenchido automaticamente.

Configure seu `.env.local` antes de rodar:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
F360_TOKEN=65864535-8a5c-4a4c-ab8e-4f1f4196bfa6
F360_CNPJ=02723552000153
F360_WEBHOOK_TITULOS=https://api.f360.one/webhook/titulos
```

Ao final, o script grava um snapshot em `var/snapshots/aes_integration_<timestamp>.json` com totais de registros, valores e quantidade de payloads enviados.

### 6. Volpe Agent — dados 2025 (F360)
```bash
pnpm run volpe:agent
```
- Usa o token `F360_LOGIN_TOKEN` + `F360_BASE_URL` para acessar a API pública (`PublicLoginAPI/DoLogin`).
- Lê os CNPJs listados em `avant/integracao/f360/volpe.csv`/`.xls` e solicita DRE/DFC para todo o ano de `2025` (período configurável via `F360_QUERY_PARAMS`).
- Valida os lançamentos recebidos, insere os registros em `dre_entries`/`cashflow_entries` e gera `var/snapshots/volpe_agent_<timestamp>.json` contendo totais por empresa e alertas.

Variáveis esperadas:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
F360_LOGIN_TOKEN=
F360_BASE_URL=https://api.f360.one
F360_DRE_PATH=PublicAPI/ConsultarDRE
F360_DFC_PATH=PublicAPI/ConsultarDFC
F360_GROUP=Grupo Volpe
F360_QUERY_PARAMS={"periodoInicio":"2025-01-01","periodoFim":"2025-12-31","ano":"2025"}
VOLPE_LANCAMENTOS_PATH=
VOLPE_TOKEN_LOGIN=
VOLPE_TOKEN_SENHA=
VOLPE_TOKEN_TOKEN=
```

Opcionalmente, use:
```env
F360_TOKEN=223b065a-1873-4cfe-a36b-f092c602a03e
F360_TITULOS_PATH=f360-titulos
F360_DRY_RUN=true
```
#### Montagem local dos lançamentos Volpe

- Coloque o arquivo de lançamentos (XLSX/CSV/JSON) em `avant/integracao/f360/volpe_lancamentos.xlsx|csv|json` ou aponte `VOLPE_LANCAMENTOS_PATH` para qualquer caminho. O script identifica automaticamente o primeiro arquivo existente.
- Cada linha deve conter pelo menos `CNPJ`, `Valor` (ou `amount`), `Data` (ou `date`) e um identificador de conta (`Plano de Contas`, `Conta`, `Categoria`). O campo `Tipo`/`natureza` indica se é receita (in) ou despesa (out); valores negativos também são tratados como despesas.
- O agente agrupa os lançamentos por CNPJ/conta/data e publica os resultados em `dre_entries` (natureza receita/despesa) e `cashflow_entries` (`kind` in/out). Enquanto houver lançamentos locais válidos para cada CNPJ, ele pula as chamadas à API pública F360.
 - Para agilizar a configuração, o `VOLPE_TOKEN.txt` em `avant/integracao/f360` já traz o login e o token compartilhado. Atualize `VOLPE_TOKEN_LOGIN`, `VOLPE_TOKEN_SENHA` (para referência) e preencha `VOLPE_TOKEN_TOKEN` com o valor `223b065a-1873-4cfe-a36b-f092c602a03e` (ou outro token gerado pelo F360). O script também aceita `F360_LOGIN_TOKEN` quando ele for exposto diretamente.
 
O Grupo Volpe compartilha **um único login F360** capaz de abrir todos os 13 CNPJs listados; configure `F360_LOGIN_TOKEN`, `F360_DRE_PATH` e `F360_DFC_PATH` uma vez para que o agente aplique os dados para cada empresa.
O Grupo Volpe compartilha **um único login F360** capaz de abrir todos os 13 CNPJs listados; configure `F360_LOGIN_TOKEN`, `F360_DRE_PATH` e `F360_DFC_PATH` uma vez para que o agente aplique os dados para cada empresa.

### 7. Importar planilhas exportadas do `avant/exportado`

Uma alternativa aos endpoints públicos é usar os arquivos que você exportou manualmente para `avant/exportado/`. Cada planilha nomeada com o CNPJ traz os lançamentos do DFC, enquanto `DRE<cnpj>.xlsx` contém o demonstrativo consolidado da matriz.

- Execute:
```bash
pnpm run import:volpe-exportado
```
- O script percorre `avant/exportado/`, agrega os lançamentos por conta, centro e categoria, infere naturezas e envia os registros para `dre_entries` e `cashflow_entries`.
- O snapshot resultante é salvo em `var/snapshots/volpe_exportado_<timestamp>.json`.
- Use `manualf360.txt` dentro de `avant/exportado/` como referência das URLs e endpoints públicos utilizados pela F360, caso queira migrar para chamadas via API no futuro.

## Uso do Cliente Supabase no Código

### Cliente Básico (Browser)
```typescript
import { supabase } from '@/lib/supabaseClient';

// Buscar todos os clientes
const { data: clients, error } = await supabase
  .from('omie_clients')
  .select('*')
  .eq('company_name', 'MANA POKE HOLDING LTDA');
```

### Cliente Admin (Server-side)
```typescript
import { createAdminClient } from '@/lib/supabaseClient';

const adminClient = createAdminClient();

// Inserir novos tokens
const { data, error } = await adminClient
  .from('erp_tokens')
  .insert({
    company_name: 'Nova Empresa',
    erp_type: 'omie',
    app_key: 'xxx',
    app_secret: 'yyy',
    cnpj: '00000000000000'
  });
```

## Segurança

- **Row Level Security (RLS)** está habilitado em todas as tabelas
- Apenas o `service_role` tem acesso total aos dados
- As chaves de API Omie são armazenadas de forma segura na tabela `erp_tokens`
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no código client-side

## Estrutura de Arquivos

```
src/
├── lib/
│   └── supabaseClient.ts          # Cliente Supabase configurado
├── scripts/
│   ├── create-tables.sql          # SQL para criar tabelas manualmente
│   ├── setup-db-postgres.ts       # Script para criar tabelas via PostgreSQL
│   ├── test-supabase.ts           # Teste de conexão Supabase
│   ├── test-omie.ts               # Teste de integração Omie
│   ├── omie-import.ts             # Importação de tokens e sincronização
│   └── debug-omie-response.ts     # Debug da resposta da API Omie
```

## Empresas Configuradas

Atualmente, as seguintes empresas estão configuradas para sincronização:

1. **MANA POKE HOLDING LTDA** (780 clientes)
2. **MED SOLUTIONS S.A. - SKY DERM** (15.281 clientes)
3. **BRX IMPORTADORA - 0001-20 (ASR NEGOCIOS)**
4. **BEAUTY SOLUTIONS COMERCIO DE PRODUTOS COSMETICOS E CORRELATOS S.A.**

## Próximos Passos

- [ ] Implementar sincronização de contas a receber
- [ ] Criar dashboard para visualização dos dados
- [ ] Adicionar paginação para sincronizar todos os clientes
- [ ] Implementar sincronização incremental (apenas mudanças)
- [ ] Adicionar logs de sincronização
- [ ] Criar API endpoints para acesso aos dados

## Troubleshooting

### Erro: "Missing Supabase environment variables"
Verifique se o arquivo `.env.local` existe e contém todas as variáveis necessárias.

### Erro: "Could not find the table..."
Execute o script de setup do banco: `npx tsx src/scripts/setup-db-postgres.ts`

### Erro: "duplicate key value violates unique constraint"
Os tokens já foram importados. Isso é esperado na segunda execução.

### Erro API Omie: "Tag [FILTROS] não faz parte..."
O parâmetro `filtros` foi removido. Certifique-se de usar a versão atualizada do script.

## Suporte

Para problemas ou dúvidas, consulte:
- [Documentação API Omie](https://developer.omie.com.br/)
- [Documentação Supabase](https://supabase.com/docs)
