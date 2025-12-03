# Integração F360 - Documentação Técnica

## Visão Geral

A integração com o F360 (Fintera 360) permite sincronizar dados financeiros (DRE e DFC) através de duas abordagens principais:

1. **API Pública** - Para consulta de dados e cadastros
2. **Webhooks** - Para inserção de títulos e cupons fiscais

A integração suporta múltiplas empresas e processamento em lote, especialmente útil para grupos empresariais como o Grupo Volpe.

---

## Arquitetura da Integração

```
┌─────────────────┐
│   F360 Finanças │
└────────┬────────┘
         │
         ├─── API Pública (GET) ────┐
         │                          │
         └─── Webhooks (POST) ──────┤
                                    │
                         ┌───────────▼───────────┐
                         │   Supabase Edge       │
                         │   Functions           │
                         └───────────┬───────────┘
                                     │
                         ┌───────────▼───────────┐
                         │   Supabase Database    │
                         │   - dre_entries        │
                         │   - cashflow_entries   │
                         │   - integration_f360    │
                         └───────────────────────┘
```

---

## Autenticação

### 1. API Pública (Login + JWT)

A API Pública do F360 utiliza autenticação em duas etapas:

#### Passo 1: Login
**Endpoint:** `POST https://financas.f360.com.br/PublicLoginAPI/DoLogin`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "token": "{{F360_LOGIN_TOKEN}}"
}
```

**Resposta:**
```json
{
  "Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

O token retornado é um JWT válido por um período limitado (geralmente 1 hora).

#### Passo 2: Uso do JWT
Todas as requisições subsequentes à API Pública devem incluir:

**Header:**
```
Authorization: Bearer {JWT_TOKEN}
```

### 2. Webhooks (Token Direto)

Para webhooks, utiliza-se o token do cliente diretamente:

**Base URL:** `https://webhook.f360.com.br/{F360_TOKEN}/...`

**Headers:**
```
Authorization: Bearer {F360_TOKEN}
Content-Type: application/json
```

---

## Endpoints da API Pública

### Base URL
```
https://financas.f360.com.br/
```

### Endpoints Disponíveis

#### 1. Plano de Contas
**GET** `/api/planoDeContas?cnpj={CNPJ}`

Retorna todas as contas contábeis cadastradas para o CNPJ informado.

**Exemplo:**
```bash
curl -X GET "https://financas.f360.com.br/api/planoDeContas?cnpj=12345678000190" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

#### 2. Centros de Custo
**GET** `/api/centrosCusto?cnpj={CNPJ}`

Retorna todos os centros de custo cadastrados.

**Exemplo:**
```bash
curl -X GET "https://financas.f360.com.br/api/centrosCusto?cnpj=12345678000190" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

#### 3. Contas Bancárias
**GET** `/ContaBancariaPublicAPI/ListarContasBancarias`

Lista todas as contas bancárias disponíveis.

**Exemplo:**
```bash
curl -X GET "https://financas.f360.com.br/ContaBancariaPublicAPI/ListarContasBancarias" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Resposta:**
```json
{
  "Result": [
    {
      "Id": "454061eb0d9a9413f8067ad6",
      "Nome": "NOME DA CONTA TESTE",
      "TipoDeConta": "Conta Corrente",
      "Agencia": "1234",
      "Conta": "1234567",
      "DigitoConta": "12",
      "NumeroBanco": 33
    }
  ],
  "Ok": true
}
```

#### 4. Parcelas de Títulos
**GET** `/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos`

Lista títulos com paginação. **Limite:** 100 itens por página, máximo 31 dias por requisição.

**Parâmetros:**
- `cnpj` (obrigatório)
- `dataInicio` (formato: yyyy-MM-dd)
- `dataFim` (formato: yyyy-MM-dd)
- `pagina` (padrão: 1)

**Exemplo:**
```bash
curl -X GET "https://financas.f360.com.br/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos?cnpj=12345678000190&dataInicio=2025-01-01&dataFim=2025-01-31&pagina=1" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Importante:** Para períodos maiores que 31 dias, é necessário fazer múltiplas requisições incrementando as datas.

#### 5. Gerar Relatório para Contabilidade
**POST** `/PublicRelatorioAPI/GerarRelatorio`

Gera relatórios contábeis em formato JSON ou CSV.

**Body:**
```json
{
  "Data": "2025-01-01",
  "Fim": "2025-12-31",
  "ModeloContabil": "provisao",
  "ModeloRelatorio": "gerencial",
  "ExtensaoDeArquivo": "json",
  "CNPJEmpresas": ["12345678000190"],
  "EnviarNotificacaoPorWebbook": "true",
  "URLNotificaticao": "https://seu-webhook.com/notificacao"
}
```

**Parâmetros:**
- `ModeloContabil`: `"provisao"` (data de emissão) ou `"obrigacao"` (data de pagamento)
- `ModeloRelatorio`: `"tradicional"` (sem rateio) ou `"gerencial"` (com rateio de centros de custo)
- `ExtensaoDeArquivo`: `"json"` ou `"csv"`

**Nota:** O processamento é feito em background. Use `URLNotificaticao` para receber notificação quando o relatório estiver pronto.

---

## Endpoints de Webhooks

### Base URL
```
https://webhook.f360.com.br/{F360_TOKEN}/
```

### 1. Cupom Fiscal
**POST** `/f360-cupom-fiscal`

Insere cupons fiscais no F360.

**Payload:**
```json
{
  "Values": [
    {
      "CNPJEmitente": "12345678000190",
      "Data": "2025-01-15",
      "NumeroCupom": "12345",
      "ValorTotal": 150.00,
      "MeioPagamento": "Cartão de Crédito"
    }
  ]
}
```

**Idempotência:** `CNPJEmitente + dia(Data) + NumeroCupom`

### 2. Títulos (Contas a Pagar/Receber)
**POST** `/f360-{id}-titulos`

Insere títulos no F360. O `{id}` varia conforme a coleção do Postman.

**Payload:**
```json
{
  "Values": [
    {
      "cnpj": "12345678000190",
      "tipoTitulo": "Receber",
      "numeroTitulo": "TIT-001",
      "clienteFornecedor": "Cliente XYZ",
      "emissao": "2025-01-15",
      "valor": 1000.00,
      "tipoDocumento": "Nota Fiscal",
      "contaBancaria": "Conta Principal",
      "meioPagamento": "Boleto",
      "historico": "Venda de produtos",
      "parcelas": [
        {
          "numeroParcela": 1,
          "valor": 1000.00,
          "vencimento": "2025-02-15",
          "liquidacao": "2025-02-10",
          "rateios": [
            {
              "competencia": "01-01",
              "centroDeCusto": "Vendas",
              "planoDeContas": "Receita de Vendas",
              "numeroParcela": 1
            }
          ]
        }
      ]
    }
  ]
}
```

**Idempotência:** `cnpj + tipoTitulo + numeroTitulo`

---

## Implementação no Projeto

### Estrutura de Arquivos

```
src/services/integration/
├── f360.ts                    # Parser de Excel F360
└── index.ts                   # Integração principal

scripts/
├── f360_aes_integration.mjs   # Script de integração AES
├── f360_publish_events.mjs    # Publicação de eventos
├── f360_publish_batch.mjs     # Publicação em lote
├── volpe_agent.mjs            # Agente para Grupo Volpe
└── import_from_f360.mjs       # Importação de dados

supabase/functions/
└── sync-f360/                 # Edge Function de sincronização
    ├── index.ts
    └── common/
        └── f360-sync.ts
```

### Funções Principais

#### 1. Login F360
```typescript
async function loginF360(baseUrl: string, loginToken: string): Promise<string | null> {
  const url = new URL(baseUrl)
  const loginPath = url.origin + '/PublicLoginAPI/DoLogin'
  const res = await fetch(loginPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: loginToken })
  })
  if (!res.ok) throw new Error(`F360 login: ${res.status}`)
  const payload = await res.json()
  return payload.Token || payload.token || null
}
```

#### 2. Fetch F360 API
```typescript
async function fetchF360(
  baseUrl: string,
  jwt: string,
  endpoint: string,
  params?: Record<string, any>
): Promise<any[]> {
  const url = new URL(
    endpoint.startsWith('http') 
      ? endpoint 
      : `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`
  )
  
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${jwt}` }
  })
  
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${endpoint} ${res.status}: ${text}`)
  }
  
  const data = await res.json()
  if (Array.isArray(data)) return data
  return Array.isArray(data.value) ? data.value : data.data || []
}
```

#### 3. Post F360 Webhook
```typescript
async function postF360Titles(
  token: string,
  endpoint: string,
  payload: any
): Promise<{ status: number; body: string }> {
  if (!token) throw new Error('F360_TOKEN ausente')
  
  const url = `https://webhook.f360.com.br/${token}/${endpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  
  const text = await res.text()
  return { status: res.status, body: text }
}
```

### Armazenamento de Tokens

Os tokens F360 são armazenados de forma criptografada na tabela `integration_f360`:

```sql
CREATE TABLE integration_f360 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  token_f360_encrypted BYTEA,  -- Token criptografado
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Descriptografia:**
```sql
-- Função para descriptografar token
SELECT decrypt_f360_token(id) FROM integration_f360 WHERE id = '...';
```

### Processamento de Dados

#### 1. Montagem de DRE
Os dados de DRE são agregados por:
- `company_cnpj` (CNPJ apenas dígitos)
- `date` (data ISO: YYYY-MM-DD)
- `account` (conta contábil)

**Upsert:**
```typescript
await restPost(
  supabaseUrl,
  anonKey,
  serviceKey,
  'dre_entries',
  dreRows,
  'company_cnpj,date,account'  // Chave de conflito
)
```

#### 2. Montagem de DFC
Os dados de DFC são agregados por:
- `company_cnpj`
- `date`
- `kind` (`in` ou `out`)
- `category`
- `amount`

**Upsert:**
```typescript
await restPost(
  supabaseUrl,
  anonKey,
  serviceKey,
  'cashflow_entries',
  dfcRows,
  'company_cnpj,date,kind,category,amount'
)
```

---

## Processamento em Lote (Grupo Volpe)

Para processar múltiplas empresas com um único token:

### 1. Obter Lista de CNPJs

**Opção A: Via Supabase**
```typescript
const { data: companies } = await supabase
  .from('integration_f360')
  .select('cnpj')
  .eq('grupo_empresarial', 'Grupo Volpe')
```

**Opção B: Via Variável de Ambiente**
```bash
F360_CNPJS="12345678000190,98765432000110,11122233000144"
```

**Opção C: Via CSV**
```typescript
// Ler arquivo: avant/integracao/grupo_volpe_empresas.csv
```

### 2. Processar Cada Empresa

```typescript
for (const cnpj of cnpjList) {
  // 1. Buscar dados via API ou webhook
  const dados = await fetchF360(baseUrl, jwt, endpoint, { cnpj })
  
  // 2. Transformar em DRE/DFC
  const { dre, dfc } = transformToDreDfc(dados, cnpj)
  
  // 3. Inserir no Supabase
  await restPost(supabaseUrl, anonKey, serviceKey, 'dre_entries', dre, conflict)
  await restPost(supabaseUrl, anonKey, serviceKey, 'cashflow_entries', dfc, conflict)
}
```

---

## Limitações e Considerações

### Rate Limiting
- **API Pública:** F360 não documenta limites oficiais, mas recomenda-se:
  - 1-2 segundos entre requisições
  - Máximo 4 requisições simultâneas por IP + App Key + Método

### Limites de Dados
- **Parcelas de Títulos:** Máximo 31 dias por requisição
- **Paginação:** 100 itens por página
- **Webhooks:** Processar em chunks de 50 itens com delay de 300ms entre chunks

### Tratamento de Erros

```typescript
try {
  const jwt = await loginF360(baseUrl, loginToken)
  if (!jwt) {
    console.warn('F360 não autenticado — pulando chamadas de API')
    return
  }
  
  const data = await fetchF360(baseUrl, jwt, endpoint, params)
  // Processar dados...
} catch (error) {
  console.error('Erro na integração F360:', error)
  // Implementar retry com backoff exponencial
}
```

---

## Variáveis de Ambiente

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# F360 - API Pública
F360_BASE_URL=https://financas.f360.com.br
F360_LOGIN_TOKEN=seu-token-de-login

# F360 - Webhooks
F360_TOKEN=seu-token-de-webhook

# F360 - Processamento em Lote
F360_CNPJS=12345678000190,98765432000110
F360_GROUP=Grupo Volpe
```

---

## Documentação Oficial

- **Postman Collection:** https://documenter.getpostman.com/view/68066/Tz5m8Kcb
- **Como criar token:** https://f360.zendesk.com/hc/pt-br/articles/360062098714
- **Portal F360:** https://financas.f360.com.br

---

## Status Atual da Integração

### ✅ Funcionalidades Implementadas
- [x] Login e autenticação JWT
- [x] Consulta de cadastros (Plano de Contas, Centros de Custo, Contas Bancárias)
- [x] Listagem de parcelas de títulos
- [x] Webhooks para cupons fiscais
- [x] Webhooks para títulos (AP/AR)
- [x] Parser de Excel F360
- [x] Montagem de DRE/DFC
- [x] Processamento em lote
- [x] Criptografia de tokens

### ⚠️ Limitações Conhecidas
- Domínio `api.f360.com.br` não resolve DNS (usar `financas.f360.com.br`)
- Sincronização pode retornar 0 registros se:
  - Token expirado ou inválido
  - Período sem dados
  - Endpoint incorreto

### 🔄 Melhorias Futuras
- [ ] Implementar retry automático com backoff exponencial
- [ ] Cache de JWT para evitar múltiplos logins
- [ ] Monitoramento de sincronizações
- [ ] Alertas para falhas de integração
- [ ] Dashboard de status das integrações

---

## Exemplos de Uso

### Exemplo 1: Sincronizar Dados de uma Empresa

```typescript
import { loginF360, fetchF360 } from './f360-api'

const baseUrl = 'https://financas.f360.com.br'
const loginToken = process.env.F360_LOGIN_TOKEN

// 1. Login
const jwt = await loginF360(baseUrl, loginToken)

// 2. Buscar parcelas de títulos
const parcelas = await fetchF360(
  baseUrl,
  jwt,
  '/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos',
  {
    cnpj: '12345678000190',
    dataInicio: '2025-01-01',
    dataFim: '2025-01-31',
    pagina: 1
  }
)

// 3. Processar e inserir no Supabase
// ...
```

### Exemplo 2: Enviar Título via Webhook

```typescript
import { postF360Titles } from './f360-webhook'

const token = process.env.F360_TOKEN
const payload = {
  Values: [{
    cnpj: '12345678000190',
    tipoTitulo: 'Receber',
    numeroTitulo: 'TIT-001',
    valor: 1000.00,
    // ... outros campos
  }]
}

const result = await postF360Titles(token, 'f360-titulos', payload)
console.log(`Status: ${result.status}`)
```

---

## Troubleshooting

### Problema: Sincronização retorna 0 registros

**Possíveis causas:**
1. Token expirado ou inválido
2. Período sem dados
3. Endpoint incorreto
4. CNPJ não encontrado

**Solução:**
```bash
# Testar token manualmente
curl -X GET "https://financas.f360.com.br/api/planoDeContas?cnpj=SEU_CNPJ" \
  -H "Authorization: Bearer SEU_JWT"
```

### Problema: Erro 401 (Unauthorized)

**Causa:** JWT expirado ou token inválido

**Solução:** Fazer novo login para obter JWT atualizado

### Problema: Erro 404 (Not Found)

**Causa:** Endpoint incorreto ou domínio errado

**Solução:** Verificar documentação oficial e usar `financas.f360.com.br`

---

**Última atualização:** Janeiro 2025

