# GUIA ÚNICO – Importação "F360 Geral" em um único arquivo

**Versão:** 2.0 (Atualizada para alinhar com estrutura atual do projeto)  
**Data:** 2025-01-XX

---

## 0. Contexto

A integração é baseada nas APIs públicas do Cielo Conciliador / F360.
Documentação oficial:
Cielo Conciliador – Visão geral e APIs públicas

Você vai:

1. Obter um token público no painel da Cielo/F360.
2. Trocar esse token por um JWT usando `PublicLoginAPI/DoLogin`.
3. Com esse JWT, gerar um relatório contábil geral (JSON).
4. Baixar o Plano de Contas.
5. Unificar tudo num único JSON "F360 geral".
6. **Mapear e salvar no Supabase** (tabelas normalizadas).

Esse fluxo vale tanto para:

- Token "empresa única" (um CNPJ)
- Token "grupo" (várias empresas/CNPJs sob o mesmo cliente)

A diferença é como você configura e anota o token no seu sistema e como você interpreta/usa o campo `CNPJEmpresas` e os CNPJs na resposta.

---

## 1. Configurando os tokens no painel F360/Cielo

No painel do Cielo Conciliador:

1. Acesse o menu de integrações:
   - Menu de Cadastro → Integrações → +CRIAR
2. Selecione Webservice API Pública da F360.
3. Defina:
   - Nome de identificação da chave (por ex.: `F360_EMPRESA_UNICA_X`, `F360_GRUPO_Y`)
   - Tipo de acesso (permissões ou acesso total).
   - Status: Ativo.
4. Ao finalizar, o painel mostra o token (atenção: só aparece uma vez).

Esse token é o que você usa no endpoint `PublicLoginAPI/DoLogin` para obter o JWT.

---

## 2. Armazenamento de Tokens no Supabase

### ⚠️ REGRA CRÍTICA DO PROJETO

**Tokens F360 NUNCA vão no `.env.local`**

- ✅ **Onde armazenar**: Tabela `companies.token_f360` (para empresas individuais) ou `companies.group_token` (para grupos)
- ❌ **NUNCA colocar**: `F360_TOKEN`, `F360_CNPJ`, `F360_WEBHOOK_*` no `.env.local`

### Estrutura no Banco de Dados

#### Para Empresa Única (SINGLE)

```sql
-- Tabela: companies
INSERT INTO companies (
  cnpj,
  razao_social,
  token_f360,
  erp_type,
  is_group,
  active
) VALUES (
  '11111111000111',
  'Empresa XPTO Ltda',
  'TOKEN_PUBLICO_AQUI',  -- Token F360
  'F360',
  false,  -- Não é grupo
  true
);
```

#### Para Grupo (GROUP)

```sql
-- 1. Criar empresa grupo
INSERT INTO companies (
  cnpj,
  razao_social,
  group_token,  -- Token compartilhado do grupo
  erp_type,
  is_group,
  active
) VALUES (
  '00000000000000',  -- CNPJ virtual ou do grupo
  'Grupo ABC',
  'TOKEN_PUBLICO_GRUPO_AQUI',
  'F360',
  true,  -- É grupo
  true
) RETURNING id;

-- 2. Criar empresas filhas
INSERT INTO companies (
  cnpj,
  razao_social,
  parent_company_id,  -- Referência ao grupo
  erp_type,
  is_group,
  active
) VALUES 
  ('22222222000122', 'Loja 1', <id_grupo>, 'F360', false, true),
  ('33333333000133', 'Loja 2', <id_grupo>, 'F360', false, true);
```

### Estrutura de Dados Sugerida (para referência)

Embora os tokens sejam armazenados diretamente em `companies`, você pode manter uma estrutura de referência:

```typescript
interface F360Integration {
  // Identificação
  companyId: string;  // UUID da empresa em companies
  cnpj: string;
  
  // Configuração
  mode: 'SINGLE' | 'GROUP';
  f360PublicToken: string;  // Buscar de companies.token_f360 ou companies.group_token
  
  // Empresas esperadas (para validação)
  expectedCompanies: Array<{
    cnpj: string;
    alias?: string;
  }>;
  
  // Metadados
  label: string;
  isActive: boolean;
}
```

**Como buscar token do banco:**

```typescript
// Para empresa única
const company = await supabase
  .from('companies')
  .select('token_f360, cnpj, razao_social')
  .eq('cnpj', cnpj)
  .eq('is_group', false)
  .single();

const token = company.data.token_f360;

// Para grupo
const group = await supabase
  .from('companies')
  .select('group_token, id')
  .eq('is_group', true)
  .eq('id', groupId)
  .single();

const token = group.data.group_token;
```

---

## 3. Login via API (mesmo fluxo para SINGLE e GROUP)

Endpoint base:
```
https://financas.f360.com.br
```

Endpoint de login:

```
POST /PublicLoginAPI/DoLogin
Header: Content-Type: application/json
Body:
{
  "token": "SEU_TOKEN_PUBLICO_AQUI"
}
```

Resposta (exemplo):

```json
{
  "Token": "JWT_GRANDE_AQUI"
}
```

Esse `Token` é o JWT que você vai usar como:

```
Authorization: Bearer JWT_GRANDE_AQUI
```

**Nota:** Isso independe se o token representa uma empresa ou um grupo. A diferença está na forma como você filtra/usa depois.

**Implementação existente:** `src/services/f360Service.ts`

```typescript
const f360Service = new F360Service(token);
await f360Service.login(); // Retorna JWT
```

---

## 4. Gerando o relatório contábil geral (todas as movimentações)

### 4.1 Parâmetros importantes

Endpoint:
```
POST /PublicRelatorioAPI/GerarRelatorio
```

Headers:
```
Authorization: Bearer JWT_GRANDE_AQUI
Content-Type: application/json
```

Body típico para JSON "gerencial":

```json
{
  "Data": "2025-01-01",
  "DataFim": "2025-01-31",
  "ModeloContabil": "provisao",
  "ModeloRelatorio": "gerencial",
  "ExtensaoDeArquivo": "json",
  "EnviarNotificacaoPorWebhook": false,
  "URLNotificacao": "",
  "Contas": "",
  "CNPJEmpresas": []
}
```

**Chaves importantes:**

- `Data` / `DataFim`: período desejado (formato: `yyyy-MM-dd`)
- `ModeloContabil`:
  - `"provisao"` → contabilização pela emissão
  - `"obrigacao"` → pela data de pagamento
- `ModeloRelatorio`:
  - `"tradicional"` → sem rateio de centros de custos
  - `"gerencial"` → com rateio (melhor para análise gerencial/RAG)
- `ExtensaoDeArquivo`: `"json"` (recomendado)
- `CNPJEmpresas`:
  - `[]` (vazio) ⇒ traz todas as empresas/lojas associadas àquele token
  - Se você quiser limitar: passa uma lista de CNPJs

**Resposta:**

```json
{
  "Result": "60db204089d59e0aec5d8756",
  "Ok": true
}
```

`Result` é o ID do relatório gerado.

### 4.2 Download do relatório

Endpoint:
```
GET /PublicRelatorioAPI/Download?id=60db204089d59e0aec5d8756
```

Headers:
```
Authorization: Bearer JWT_GRANDE_AQUI
Content-Type: application/json
```

Resposta: conteúdo do arquivo (JSON ou CSV, de acordo com o que você pediu).

Esse JSON é a base das movimentações que vão alimentar seu "arquivo geral".

**Implementação existente:**

```typescript
const relatorio = await f360Service.gerarRelatorio({
  dataInicio: '2025-01-01',
  dataFim: '2025-01-31',
  modeloContabil: 'provisao',
  modeloRelatorio: 'gerencial',
  extensaoArquivo: 'json',
  cnpjEmpresas: [] // ou ['11111111000111']
});

// Depois fazer download manual ou aguardar webhook
```

---

## 5. Baixando o Plano de Contas

Para enriquecer as linhas com significado contábil:

Endpoint:
```
GET /PlanoDeContasPublicAPI/ListarPlanosContas
```

Headers:
```
Authorization: Bearer JWT_GRANDE_AQUI
Content-Type: application/json
```

Resposta (exemplo simplificado):

```json
{
  "Result": [
    {
      "PlanoDeContasId": "5da089312629530ed0249022",
      "Nome": "Ajustes a Crédito de Cartão",
      "Tipo": "A receber"
    },
    {
      "PlanoDeContasId": "5da089312629530ed0249019",
      "Nome": "Taxa Administrativa de Cartões",
      "Tipo": "A pagar"
    }
  ],
  "Ok": true
}
```

Guarde esse resultado como `chartOfAccounts`.

**Implementação existente:**

```typescript
const planoContas = await f360Service.getPlanoContas();
// Salvar em chart_of_accounts
```

---

## 6. Diferença prática: token de uma empresa vs token de grupo

### 6.1. Token de uma empresa (SINGLE)

No painel você criou uma integração que, na prática, corresponde a um cliente com um único CNPJ relevante.

No seu banco, você marca:
```sql
-- companies.is_group = false
-- companies.token_f360 = 'TOKEN_AQUI'
```

No momento de gerar o relatório, você tem duas opções:

**Mais seguro (específico):**
Passar explicitamente o CNPJ da empresa:
```json
"CNPJEmpresas": ["11111111000111"]
```

**Mais simples:**
Deixar `CNPJEmpresas: []` e aceitar que, se houver só uma empresa, tudo virá como "único conjunto de dados".

Na hora de montar o arquivo geral, você assume que toda a movimentação pertence a esse CNPJ (se o JSON não trouxer CNPJ em cada linha).

### 6.2. Token de grupo (GROUP)

No painel, o token foi criado para um "cliente" que representa várias lojas/empresas.

No banco, você anota:
```sql
-- Empresa grupo: is_group = true, group_token = 'TOKEN_AQUI'
-- Empresas filhas: parent_company_id = <id_grupo>
```

**Opções de uso:**

1. **Relatório consolidado de tudo** (sem separar por empresa):
   - Envie `CNPJEmpresas: []`
   - O relatório traz todas as movimentações do grupo.

2. **Relatório filtrado por algumas empresas:**
   - Envie algo como:
   ```json
   "CNPJEmpresas": ["22222222000122", "33333333000133"]
   ```

**O problema que você relatou:**
Em clientes de grupo, algumas respostas voltam com campo de CNPJ vazio.

Isso significa que você não pode confiar 100% no CNPJ vindo na linha e precisa tratar o "modo GROUP" na sua camada de dados.

**Estratégia recomendada:**

Para GROUP, considere que:

1. Tudo que vier daquele token pertence ao conjunto de CNPJs listados em `expectedCompanies` (ou empresas filhas do grupo no banco).

2. Se o JSON trouxer algum identificador interno de loja/unidade (campo específico do relatório), mapeie isso para `companyInternalId` no seu modelo.

3. Se não trouxer nada (caso mais chato):
   - Você ainda assim mantém o `mode: "GROUP"`.
   - Pode deixar `companyInternalId` como `null` e trabalhar a visão consolidada de grupo.
   - Se no futuro conseguir outra fonte/mapeamento, consegue enriquecer.

**Estratégias de mapeamento de CNPJ:**

```typescript
// Estratégia 1: Usar expectedCompanies
if (!entry.cnpj && integration.mode === 'SINGLE') {
  entry.cnpj = integration.expectedCompanies[0].cnpj;
}

// Estratégia 2: Identificadores internos
if (entry.companyInternalId) {
  const company = integration.expectedCompanies.find(
    c => c.internalId === entry.companyInternalId
  );
  if (company) entry.cnpj = company.cnpj;
}

// Estratégia 3: Dados consolidados
if (!entry.cnpj && integration.mode === 'GROUP') {
  // Buscar empresas filhas do grupo no banco
  const filhas = await supabase
    .from('companies')
    .select('cnpj')
    .eq('parent_company_id', groupId);
  
  // Marcar como consolidado ou distribuir proporcionalmente
  entry.cnpj = null; // ou usar um CNPJ "virtual" do grupo
  entry.isConsolidated = true;
}
```

---

## 7. Especificação do "arquivo geral F360" (único JSON)

Independente de SINGLE ou GROUP, o resultado final é um único JSON padronizado no seu lado.

### 7.1. Estrutura sugerida

```json
{
  "source": "F360_CIELO",
  "integration": {
    "companyId": "uuid-da-empresa-ou-grupo",
    "mode": "GROUP",
    "label": "F360 - Grupo ABC"
  },
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31",
    "generatedAt": "2025-02-05T10:00:00Z"
  },
  "companies": [
    {
      "internalId": "empresa_1",
      "cnpj": "22222222000122",
      "alias": "Loja 1"
    },
    {
      "internalId": "empresa_2",
      "cnpj": "33333333000133",
      "alias": "Loja 2"
    }
  ],
  "chartOfAccounts": [
    {
      "id": "5da089312629530ed0249022",
      "name": "Ajustes a Crédito de Cartão",
      "type": "A receber"
    },
    {
      "id": "5da089312629530ed0249019",
      "name": "Taxa Administrativa de Cartões",
      "type": "A pagar"
    }
  ],
  "entries": [
    {
      "date": "2025-01-03",
      "description": "Venda cartão crédito",
      "amount": 1500.0,
      "debitAccountId": "PLANO_X",
      "creditAccountId": "PLANO_Y",
      "companyInternalId": "empresa_1",
      "cnpj": "22222222000122",
      "raw": {
        "f360": {
          "...": "campos originais da linha do JSON da F360 aqui"
        }
      }
    }
  ]
}
```

**Regras:**

- **Em SINGLE:**
  - `companies` terá um único item.
  - `companyInternalId` em cada entry pode ser sempre esse único ID.
  - Se o JSON do F360 não trouxer CNPJ, você preenche pelo `expectedCompanies[0].cnpj` ou pelo CNPJ da empresa no banco.

- **Em GROUP:**
  - Se o relatório trouxer algum identificador que permita distinguir empresas, você preenche `companyInternalId` corretamente.
  - Se não vier nada (caso mais chato, como você citou):
    - Você ainda assim mantém o `mode: "GROUP"`.
    - Pode deixar `companyInternalId` como `null` e trabalhar a visão consolidada de grupo.
    - Se no futuro conseguir outra fonte/mapeamento, consegue enriquecer.

---

## 8. Mapeamento para Tabelas do Supabase

⚠️ **IMPORTANTE:** O JSON unificado é apenas um formato intermediário. Os dados devem ser salvos nas tabelas normalizadas do Supabase.

### 8.1. Tabelas de Destino

| Dados do JSON | Tabela Supabase | Observações |
|---------------|-----------------|-------------|
| `chartOfAccounts[]` | `chart_of_accounts` | Plano de contas |
| `entries[]` (DRE) | `dre_entries` | Entradas de DRE |
| `entries[]` (DFC) | `dfc_entries` | Entradas de DFC |
| `entries[]` (Lançamentos) | `accounting_entries` | Lançamentos contábeis brutos |
| `companies[]` | `companies` | Verificar/atualizar empresas |
| Dados bancários | `bank_accounts`, `bank_transactions` | Se disponível no relatório |

### 8.2. Fluxo de Mapeamento

```typescript
// Pseudocódigo de mapeamento
async function salvarF360Geral(f360Geral: F360GeralJSON) {
  // 1. Verificar/atualizar empresas
  for (const company of f360Geral.companies) {
    await upsertCompany({
      cnpj: company.cnpj,
      razao_social: company.alias || company.cnpj,
      // ... outros campos
    });
  }
  
  // 2. Salvar plano de contas
  for (const account of f360Geral.chartOfAccounts) {
    await upsertChartOfAccount({
      company_id: f360Geral.integration.companyId,
      code: account.id,
      name: account.name,
      type: account.type,
      // ...
    });
  }
  
  // 3. Salvar entradas (DRE, DFC, Lançamentos)
  for (const entry of f360Geral.entries) {
    // Determinar tipo de entrada
    if (entry.type === 'DRE') {
      await insertDRE({
        company_cnpj: entry.cnpj,
        company_id: await getCompanyId(entry.cnpj),
        date: entry.date,
        account: entry.debitAccountId || entry.creditAccountId,
        account_code: entry.debitAccountId || entry.creditAccountId,
        valor: entry.amount,
        natureza: entry.natureza, // 'receita', 'despesa', etc
        description: entry.description,
        source_erp: 'F360',
        source_id: entry.raw.f360.id,
      });
    } else if (entry.type === 'DFC') {
      await insertDFC({
        company_cnpj: entry.cnpj,
        company_id: await getCompanyId(entry.cnpj),
        date: entry.date,
        kind: entry.kind, // 'in' ou 'out'
        category: entry.category,
        amount: entry.amount,
        bank_account: entry.bankAccount,
        description: entry.description,
        source_erp: 'F360',
        source_id: entry.raw.f360.id,
      });
    } else {
      // Lançamento contábil bruto
      await insertAccountingEntry({
        company_id: await getCompanyId(entry.cnpj),
        entry_date: entry.date,
        competence_date: entry.competenceDate || entry.date,
        description: entry.description,
        account_code: entry.debitAccountId || entry.creditAccountId,
        debit_amount: entry.debitAmount || 0,
        credit_amount: entry.creditAmount || 0,
        source_erp: 'F360',
        source_id: entry.raw.f360.id,
      });
    }
  }
}
```

### 8.3. Validações Antes de Salvar

```typescript
async function validarAntesDeSalvar(f360Geral: F360GeralJSON) {
  // 1. CNPJs devem existir em companies
  for (const company of f360Geral.companies) {
    const exists = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', company.cnpj)
      .single();
    
    if (!exists.data) {
      throw new Error(`CNPJ ${company.cnpj} não encontrado em companies`);
    }
  }
  
  // 2. Datas devem estar no formato correto
  const startDate = new Date(f360Geral.period.start);
  const endDate = new Date(f360Geral.period.end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Datas inválidas no período');
  }
  
  // 3. Valores numéricos devem ser válidos
  for (const entry of f360Geral.entries) {
    if (isNaN(entry.amount) || entry.amount === null) {
      throw new Error(`Valor inválido na entrada: ${entry.description}`);
    }
  }
  
  // 4. IDs de plano de contas devem existir (ou serão criados)
  // Validação opcional, pois podem ser criados durante o processo
}
```

### 8.4. Tratamento de Duplicatas

O banco já possui constraints UNIQUE:

```sql
-- dre_entries
CONSTRAINT unique_dre_entry UNIQUE (company_cnpj, date, account, natureza)

-- dfc_entries
CONSTRAINT unique_dfc_entry UNIQUE (company_cnpj, date, kind, category, bank_account)
```

Use `UPSERT` ou `INSERT ... ON CONFLICT`:

```typescript
// Exemplo com Supabase
await supabase
  .from('dre_entries')
  .upsert({
    company_cnpj: entry.cnpj,
    date: entry.date,
    account: entry.account,
    natureza: entry.natureza,
    valor: entry.amount,
    // ... outros campos
  }, {
    onConflict: 'company_cnpj,date,account,natureza'
  });
```

---

## 9. Fluxo operacional resumido (SINGLE e GROUP no mesmo passo a passo)

1. **Carregar da sua base a integração F360 desejada:**
   - Buscar empresa/grupo de `companies`
   - Obter `token_f360` ou `group_token`
   - Buscar empresas filhas se for grupo (`parent_company_id`)

2. **Login na API F360:**
   - `POST /PublicLoginAPI/DoLogin` com o token
   - Guardar JWT retornado

3. **Gerar relatório contábil:**
   - `POST /PublicRelatorioAPI/GerarRelatorio`
   - `Authorization: Bearer JWT`
   - `ExtensaoDeArquivo: "json"`
   - `CNPJEmpresas`: `[]` = tudo (SINGLE ou GROUP) ou lista de CNPJs se quiser filtrar

4. **Baixar relatório:**
   - `GET /PublicRelatorioAPI/Download?id=<Result>` com `Authorization: Bearer JWT`
   - Receber JSON de movimentos

5. **Baixar plano de contas:**
   - `GET /PlanoDeContasPublicAPI/ListarPlanosContas`
   - Receber JSON de plano de contas

6. **Montar o arquivo geral:**
   - Criar JSON no formato único (`source`, `integration`, `period`, `companies`, `chartOfAccounts`, `entries`)
   - Em `companies`: usar empresas do banco ou `expectedCompanies`
   - Em `entries`: converter cada linha do relatório F360, ligando-a ao `chartOfAccounts` e, se possível, a uma `companyInternalId`

7. **Validar dados:**
   - Verificar CNPJs existem em `companies`
   - Validar formatos de data
   - Validar valores numéricos

8. **Salvar no Supabase:**
   - Mapear JSON para tabelas normalizadas (`dre_entries`, `dfc_entries`, `accounting_entries`, `chart_of_accounts`)
   - Usar `UPSERT` para evitar duplicatas
   - Registrar em `import_logs` para auditoria

9. **Tratamento de erros:**
   - Logar erros em `import_logs`
   - Implementar retry logic para requisições F360
   - Rollback em caso de falha parcial (opcional)

---

## 10. Tratamento de Erros e Logging

### 10.1. Logging de Importações

Use a tabela `import_logs` existente:

```typescript
async function registrarImportacao(params: {
  companyId: string;
  importType: 'MANUAL' | 'CRON_3AM' | 'CRON_1PM';
  status: 'INICIADO' | 'PROCESSANDO' | 'SUCESSO' | 'ERRO';
  recordsProcessed?: number;
  recordsImported?: number;
  recordsError?: number;
  errorMessage?: string;
  errorDetails?: object;
}) {
  await supabase.from('import_logs').insert({
    company_id: params.companyId,
    import_type: params.importType,
    status: params.status,
    records_processed: params.recordsProcessed || 0,
    records_imported: params.recordsImported || 0,
    records_error: params.recordsError || 0,
    error_message: params.errorMessage,
    error_details: params.errorDetails,
    started_at: new Date().toISOString(),
    finished_at: params.status === 'SUCESSO' || params.status === 'ERRO' 
      ? new Date().toISOString() 
      : null,
  });
}
```

### 10.2. Retry Logic

```typescript
async function chamarF360ComRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 10.3. Tratamento de Timeouts

```typescript
async function gerarRelatorioComTimeout(
  params: RelatorioParams,
  timeout = 30000
): Promise<RelatorioResponse> {
  return Promise.race([
    f360Service.gerarRelatorio(params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]) as Promise<RelatorioResponse>;
}
```

---

## 11. Exemplo Completo de Implementação

```typescript
import { F360Service } from './services/f360Service';
import { supabase } from './lib/supabase';

interface F360GeralJSON {
  source: string;
  integration: {
    companyId: string;
    mode: 'SINGLE' | 'GROUP';
    label: string;
  };
  period: {
    start: string;
    end: string;
    generatedAt: string;
  };
  companies: Array<{
    cnpj: string;
    alias?: string;
  }>;
  chartOfAccounts: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  entries: Array<{
    date: string;
    description: string;
    amount: number;
    cnpj?: string;
    // ... outros campos
  }>;
}

async function importarF360Geral(params: {
  companyId: string;
  startDate: string;
  endDate: string;
}): Promise<void> {
  // 1. Buscar empresa e token
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.companyId)
    .single();
  
  if (!company) throw new Error('Empresa não encontrada');
  
  const token = company.is_group 
    ? company.group_token 
    : company.token_f360;
  
  if (!token) throw new Error('Token F360 não encontrado');
  
  // 2. Login F360
  const f360Service = new F360Service(token);
  const jwt = await f360Service.login();
  if (!jwt) throw new Error('Falha no login F360');
  
  // 3. Gerar relatório
  const relatorio = await f360Service.gerarRelatorio({
    dataInicio: params.startDate,
    dataFim: params.endDate,
    modeloContabil: 'provisao',
    modeloRelatorio: 'gerencial',
    extensaoArquivo: 'json',
    cnpjEmpresas: [], // Tudo
  });
  
  // 4. Download relatório (aguardar processamento)
  // Nota: Pode precisar aguardar alguns segundos
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const relatorioJSON = await fetch(
    `https://financas.f360.com.br/PublicRelatorioAPI/Download?id=${relatorio.Result}`,
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
    }
  ).then(r => r.json());
  
  // 5. Baixar plano de contas
  const planoContas = await f360Service.getPlanoContas();
  
  // 6. Montar JSON unificado
  const f360Geral: F360GeralJSON = {
    source: 'F360_CIELO',
    integration: {
      companyId: company.id,
      mode: company.is_group ? 'GROUP' : 'SINGLE',
      label: company.razao_social,
    },
    period: {
      start: params.startDate,
      end: params.endDate,
      generatedAt: new Date().toISOString(),
    },
    companies: company.is_group
      ? await buscarEmpresasFilhas(company.id)
      : [{ cnpj: company.cnpj, alias: company.razao_social }],
    chartOfAccounts: planoContas.map(pc => ({
      id: pc.PlanoDeContasId,
      name: pc.Nome,
      type: pc.Tipo,
    })),
    entries: relatorioJSON.map((entry: any) => ({
      date: entry.Data,
      description: entry.Descricao,
      amount: entry.Valor,
      cnpj: entry.CNPJ || company.cnpj,
      raw: { f360: entry },
    })),
  };
  
  // 7. Validar
  await validarAntesDeSalvar(f360Geral);
  
  // 8. Salvar no Supabase
  await salvarF360Geral(f360Geral);
  
  // 9. Registrar sucesso
  await registrarImportacao({
    companyId: company.id,
    importType: 'MANUAL',
    status: 'SUCESSO',
    recordsProcessed: f360Geral.entries.length,
    recordsImported: f360Geral.entries.length,
  });
}

async function buscarEmpresasFilhas(groupId: string) {
  const { data } = await supabase
    .from('companies')
    .select('cnpj, razao_social')
    .eq('parent_company_id', groupId);
  
  return data?.map(c => ({
    cnpj: c.cnpj,
    alias: c.razao_social,
  })) || [];
}
```

---

## 12. Troubleshooting

### Problema: Token não funciona

**Solução:**
- Verificar se token está correto em `companies.token_f360` ou `companies.group_token`
- Verificar se token não expirou no painel F360
- Verificar permissões do token no painel

### Problema: Relatório não gera

**Solução:**
- Verificar formato de datas (`yyyy-MM-dd`)
- Verificar se período não é muito grande (limitar a 12 meses)
- Verificar logs de erro da API F360

### Problema: CNPJ vazio em grupos

**Solução:**
- Usar estratégias de mapeamento descritas na seção 6.2
- Buscar empresas filhas do grupo no banco
- Marcar como consolidado se não conseguir mapear

### Problema: Duplicatas ao reimportar

**Solução:**
- Usar `UPSERT` com constraints UNIQUE
- Verificar `import_logs` para ver última importação
- Limpar dados antigos antes de reimportar (se necessário)

---

## 13. Referências

- **Estrutura do banco:** `supabase/migrations/create_f360_volpe_tables.sql`
- **Serviço F360:** `src/services/f360Service.ts`
- **Regras do projeto:** `.cursorrules`
- **Documentação F360:** Cielo Conciliador – Visão geral e APIs públicas

---

**Versão:** 2.0  
**Última atualização:** 2025-01-XX  
**Status:** ✅ Alinhado com estrutura atual do projeto

