# Índice Completo da API F360 Finanças

## Base URL
```
https://financas.f360.com.br
```

## Autenticação

### Endpoint: `POST /PublicLoginAPI/DoLogin`

**Descrição**: Autentica usando token F360 e retorna JWT válido por 1 hora.

**Request**:
```json
{
  "token": "uuid-token-f360"
}
```

**Response**:
```json
{
  "Token": "jwt-token-string"
}
```

**Mapeamento**: Não mapeia para tabela, apenas autenticação.

**Uso no código**: [`src/services/f360Service.ts`](src/services/f360Service.ts) linha 65-95

---

## Endpoints de Dados

### 1. Plano de Contas

#### Endpoint: `GET /PlanoDeContasPublicAPI/ListarPlanosContas`

**Descrição**: Lista plano de contas contábeis da empresa.

**Parâmetros Query**:
- `cnpj` (opcional): CNPJ da empresa (14 dígitos, sem formatação)

**Response**:
```json
{
  "Result": [
    {
      "PlanoDeContasId": "string",
      "Nome": "string",
      "CodigoObrigacaoContabil": "string",
      "Tipo": "A receber" | "A pagar"
    }
  ]
}
```

**Mapeamento para Supabase**:
- Tabela: `chart_of_accounts`
- Campos:
  - `code` ← `PlanoDeContasId`
  - `name` ← `Nome`
  - `type` ← `Tipo === 'A receber' ? 'RECEITA' : 'DESPESA'`
  - `company_id` ← Buscar por CNPJ na tabela `companies`
  - `parent_code` ← `null` (inicialmente)
  - `level` ← `1` (inicialmente)
  - `accepts_entries` ← `true`

**Uso no código**: [`src/services/f360Service.ts`](src/services/f360Service.ts) linha 133-139

**Regras de Transformação**:
- Normalizar CNPJ removendo formatação antes de buscar `company_id`
- Usar `UPSERT` com constraint `(company_id, code)` para evitar duplicatas

---

### 2. Contas Bancárias

#### Endpoint: `GET /ContaBancariaPublicAPI/ListarContasBancarias`

**Descrição**: Lista contas bancárias cadastradas no F360.

**Parâmetros Query**: Nenhum (retorna todas as contas do token)

**Response**:
```json
{
  "Result": [
    {
      "Id": "string",
      "Nome": "string",
      "TipoDeConta": "string",
      "Agencia": "string",
      "Conta": "string",
      "DigitoConta": "string",
      "NumeroBanco": 123,
      "CNPJ": "string" // Pode estar presente em tokens GROUP
    }
  ]
}
```

**Mapeamento para Supabase**:
- Tabela: `bank_accounts`
- Campos:
  - `f360_account_id` ← `Id`
  - `nome` ← `Nome`
  - `tipo_conta` ← `TipoDeConta`
  - `banco_numero` ← `NumeroBanco`
  - `agencia` ← `Agencia`
  - `conta` ← `Conta`
  - `digito_conta` ← `DigitoConta`
  - `company_cnpj` ← `CNPJ` ou CNPJ do token (SINGLE)
  - `company_id` ← Buscar por CNPJ na tabela `companies`
  - `saldo_atual` ← `0` (será atualizado por transações)
  - `active` ← `true`

**Uso no código**: [`src/services/f360Service.ts`](src/services/f360Service.ts) linha 144-149

**Regras de Transformação**:
- Para tokens GROUP: extrair CNPJ de cada conta bancária
- Para tokens SINGLE: usar CNPJ do token
- Usar `UPSERT` com constraint `(company_id, f360_account_id)`

---

### 3. Parcelas de Títulos

#### Endpoint: `GET /ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos`

**Descrição**: Lista parcelas de títulos (receitas e despesas) com paginação.

**Parâmetros Query**:
- `cnpj` (opcional): CNPJ da empresa
- `dataInicio` (obrigatório): Data inicial (yyyy-MM-dd)
- `dataFim` (obrigatório): Data final (yyyy-MM-dd)
- `tipo` (opcional): `'Despesa' | 'Receita' | 'Ambos'` (padrão: `'Ambos'`)
- `tipoDatas` (opcional): `'Emissão' | 'Competência' | 'Vencimento' | 'Liquidação' | 'Atualização'` (padrão: `'Emissão'`)
- `pagina` (opcional): Número da página (padrão: 1)

**Response**:
```json
{
  "Result": [
    {
      "ParcelaId": "string",
      "TituloId": "string",
      "NumeroTitulo": "string",
      "TipoTitulo": "Despesa" | "Receita",
      "ClienteFornecedor": "string",
      "DataEmissao": "yyyy-MM-dd",
      "DataVencimento": "yyyy-MM-dd",
      "DataLiquidacao": "yyyy-MM-dd",
      "Valor": 123.45,
      "ValorLiquido": 123.45,
      "PlanoDeContas": "string",
      "CentroDeCusto": "string",
      "Competencia": "yyyy-MM-dd"
    }
  ]
}
```

**Mapeamento para Supabase**:

**Para DRE (`dre_entries`)**:
- `company_cnpj` ← CNPJ da empresa
- `date` ← `Competencia` ou `DataEmissao`
- `account` ← `PlanoDeContas`
- `account_code` ← `PlanoDeContasId` (se disponível)
- `natureza` ← `TipoTitulo === 'Receita' ? 'receita' : 'despesa'`
- `valor` ← `ValorLiquido`
- `description` ← `ClienteFornecedor` ou `NumeroTitulo`
- `source_erp` ← `'F360'`
- `source_id` ← `NumeroTitulo`

**Para DFC (`dfc_entries`)**:
- `company_cnpj` ← CNPJ da empresa
- `date` ← `DataLiquidacao` (apenas se existir)
- `kind` ← `TipoTitulo === 'Receita' ? 'in' : 'out'`
- `category` ← `PlanoDeContas`
- `amount` ← `ValorLiquido`
- `description` ← `ClienteFornecedor` ou `NumeroTitulo`
- `source_erp` ← `'F360'`
- `source_id` ← `NumeroTitulo`

**Para Accounting Entries (`accounting_entries`)**:
- `company_cnpj` ← CNPJ da empresa
- `entry_date` ← `DataEmissao`
- `competence_date` ← `Competencia` ou `DataEmissao`
- `description` ← `ClienteFornecedor` ou `NumeroTitulo`
- `account_code` ← `PlanoDeContas`
- `debit_amount` ← `TipoTitulo === 'Despesa' ? ValorLiquido : 0`
- `credit_amount` ← `TipoTitulo === 'Receita' ? ValorLiquido : 0`
- `cost_center` ← `CentroDeCusto`
- `source_erp` ← `'F360'`
- `source_id` ← `NumeroTitulo`

**Uso no código**: [`src/services/f360Service.ts`](src/services/f360Service.ts) linha 154-174

**Regras de Transformação**:
- Paginação: 100 registros por página, continuar até retornar menos de 100
- Delay de 200ms entre páginas para evitar rate limiting
- Filtrar apenas parcelas com `DataLiquidacao` para DFC
- Usar `UPSERT` com constraints apropriadas:
  - DRE: `(company_cnpj, date, account, natureza)`
  - DFC: `(company_cnpj, date, kind, category, bank_account)`
  - Accounting: `INSERT` (sem constraint única)

---

### 4. Relatório Contábil (DRE/DFC)

#### Endpoint: `POST /PublicRelatorioAPI/GerarRelatorio`

**Descrição**: Gera relatório contábil assíncrono (DRE/DFC). Retorna ID do relatório que deve ser consultado até estar pronto.

**Request Body**:
```json
{
  "Data": "2025-01-01",
  "DataFim": "2025-12-31",
  "ModeloContabil": "provisao" | "obrigacao",
  "ModeloRelatorio": "tradicional" | "gerencial",
  "ExtensaoDeArquivo": "json" | "csv",
  "CNPJEmpresas": ["26888098000159"],
  "EnviarNotificacaoPorWebhook": false,
  "URLNotificacao": ""
}
```

**Response**:
```json
{
  "Result": "relatorio-id-uuid",
  "Ok": true
}
```

**Mapeamento**: Não mapeia diretamente. O relatório gerado deve ser baixado via endpoint de Download.

**Uso no código**: [`src/services/f360Service.ts`](src/services/f360Service.ts) linha 179-202

---

#### Endpoint: `GET /PublicRelatorioAPI/Status?id={relatorioId}`

**Descrição**: Verifica status do relatório gerado.

**Response**:
```json
{
  "Status": "Aguardando" | "Processando" | "Finalizado" | "Erro"
}
```

**Uso no código**: [`src/services/f360ImportService.ts`](src/services/f360ImportService.ts) linha 243-253

---

#### Endpoint: `GET /PublicRelatorioAPI/Download?id={relatorioId}`

**Descrição**: Baixa relatório finalizado. Retorna array de entradas contábeis.

**Response** (quando `ExtensaoDeArquivo: "json"`):
```json
[
  {
    "DataDoLcto": "2025-01-15",
    "ContaADebito": "string",
    "ContaACredito": "string",
    "ValorLcto": 123.45,
    "CNPJEmpresa": "26888098000159",
    "DataCompetencia": "2025-01-15",
    "NomePlanoDeContas": "string",
    "IdPlanoDeContas": "string",
    "Tipo": true, // true = receita, false = despesa
    "Liquidacao": "2025-01-20",
    "ComplemHistorico": "string",
    "CentroDeCusto": "string",
    "NumeroTitulo": "string"
  }
]
```

**Mapeamento para Supabase**:

**Para DRE (`dre_entries`)**:
- `company_cnpj` ← `CNPJEmpresa` (normalizar)
- `date` ← `DataCompetencia` ou `DataDoLcto`
- `account` ← `NomePlanoDeContas` ou `ContaADebito` ou `ContaACredito`
- `account_code` ← `IdPlanoDeContas`
- `natureza` ← `Tipo === true ? 'receita' : 'despesa'`
- `valor` ← `ValorLcto`
- `description` ← `ComplemHistorico` ou `NumeroTitulo`
- `source_erp` ← `'F360'`
- `source_id` ← `NumeroTitulo` ou `IdPlanoDeContas`

**Para DFC (`dfc_entries`)**:
- `company_cnpj` ← `CNPJEmpresa` (normalizar)
- `date` ← `Liquidacao` (apenas se existir)
- `kind` ← `Tipo === true ? 'in' : 'out'`
- `category` ← `NomePlanoDeContas`
- `amount` ← `ValorLcto`
- `description` ← `ComplemHistorico` ou `NumeroTitulo`
- `source_erp` ← `'F360'`
- `source_id` ← `NumeroTitulo`

**Para Accounting Entries (`accounting_entries`)**:
- `company_cnpj` ← `CNPJEmpresa` (normalizar)
- `entry_date` ← `DataDoLcto`
- `competence_date` ← `DataCompetencia` ou `DataDoLcto`
- `description` ← `ComplemHistorico` ou `NumeroTitulo`
- `account_code` ← `IdPlanoDeContas` ou `NomePlanoDeContas`
- `debit_amount` ← `Tipo === false ? ValorLcto : 0`
- `credit_amount` ← `Tipo === true ? ValorLcto : 0`
- `cost_center` ← `CentroDeCusto`
- `source_erp` ← `'F360'`
- `source_id` ← `NumeroTitulo` ou `IdPlanoDeContas`

**Uso no código**: [`src/services/f360ImportService.ts`](src/services/f360ImportService.ts) linha 258-290

**Regras de Transformação**:
- Aguardar status "Finalizado" antes de baixar (polling a cada 5 segundos, máximo 30 tentativas)
- Ignorar entradas com `ValorLcto === 0`
- Para tokens GROUP: usar `CNPJEmpresa` de cada entrada
- Para tokens SINGLE: usar CNPJ do token se `CNPJEmpresa` não estiver presente
- Usar `UPSERT` com constraints apropriadas

---

## Estratégias de Importação

### Modo SINGLE (Token de Empresa Única)

**Características**:
- Token acessa apenas uma empresa
- CNPJ conhecido antecipadamente
- Respostas sempre incluem dados da mesma empresa

**Fluxo**:
1. Login com token
2. Buscar `company_id` por CNPJ na tabela `companies`
3. Importar plano de contas com `cnpj` no query
4. Importar contas bancárias (sem `cnpj` no query, usar CNPJ do token)
5. Importar parcelas/relatório com `cnpj` no query
6. Mapear todos os dados para `company_id` encontrado

**Uso no código**: [`src/services/f360ImportService.ts`](src/services/f360ImportService.ts) classe `F360SingleImporter`

---

### Modo GROUP (Token de Grupo)

**Características**:
- Token acessa múltiplas empresas
- CNPJs podem não estar presentes nas respostas
- Precisa descobrir CNPJs via `ListarContasBancarias` ou `ListarPessoas`

**Fluxo**:
1. Login com token
2. Descobrir CNPJs via `ListarContasBancarias` (extrair campo `CNPJ`)
3. Para cada CNPJ encontrado:
   - Buscar `company_id` na tabela `companies`
   - Importar dados com `cnpj` no query
   - Mapear para `company_id` correspondente
4. Se CNPJ não estiver presente em entrada: usar primeiro CNPJ esperado (consolidado)

**Uso no código**: [`src/services/f360ImportService.ts`](src/services/f360ImportService.ts) classe `F360GroupImporter`

---

## Tratamento de Erros

### Erros Comuns e Soluções

1. **401 Unauthorized**
   - Causa: Token inválido ou expirado
   - Solução: Reautenticar via `DoLogin`

2. **404 Not Found (Relatório)**
   - Causa: Relatório ainda não está pronto
   - Solução: Aguardar e verificar status via `Status` endpoint

3. **Rate Limiting**
   - Causa: Muitas requisições em pouco tempo
   - Solução: Adicionar delay entre requisições (200-500ms)

4. **CNPJ ausente em resposta GROUP**
   - Causa: Token GROUP pode não retornar CNPJ em todas as respostas
   - Solução: Usar CNPJ descoberto via `ListarContasBancarias` ou mapeamento manual

---

## Constraints e Validações

### Constraints de Unicidade no Supabase

**`chart_of_accounts`**:
- `(company_id, code)` - Uma conta por código por empresa

**`dre_entries`**:
- `(company_cnpj, date, account, natureza)` - Uma entrada DRE por conta/data/natureza

**`dfc_entries`**:
- `(company_cnpj, date, kind, category, bank_account)` - Uma entrada DFC por categoria/data/tipo

**`bank_accounts`**:
- `(company_id, f360_account_id)` - Uma conta bancária por ID F360 por empresa

**`accounting_entries`**:
- Sem constraint única (permite múltiplos lançamentos idênticos)

### Validações Recomendadas

1. **Normalização de CNPJ**: Sempre remover formatação (pontos, barras, hífens)
2. **Valores Zero**: Ignorar entradas com `valor === 0` ou `amount === 0`
3. **Datas**: Validar formato yyyy-MM-dd antes de inserir
4. **Company ID**: Sempre verificar existência antes de inserir foreign key

---

## Exemplos de Uso

### Exemplo 1: Importar Plano de Contas (SINGLE)

```typescript
import { F360Service } from './services/f360Service'

const service = new F360Service('token-uuid')
const planos = await service.getPlanoContas('26888098000159')

// Mapear para chart_of_accounts
const inserts = planos.map(plano => ({
  company_id: companyId,
  code: plano.PlanoDeContasId,
  name: plano.Nome,
  type: plano.Tipo === 'A receber' ? 'RECEITA' : 'DESPESA',
  parent_code: null,
  level: 1,
  accepts_entries: true
}))

await supabase.from('chart_of_accounts').upsert(inserts, {
  onConflict: 'company_id,code'
})
```

### Exemplo 2: Importar DRE via Relatório (GROUP)

```typescript
import { F360Client } from './services/f360ImportService'

const client = new F360Client('group-token')
const relatorioId = await client.gerarRelatorio({
  dataInicio: '2025-01-01',
  dataFim: '2025-12-31',
  modeloContabil: 'provisao',
  modeloRelatorio: 'gerencial',
  extensaoArquivo: 'json',
  cnpjEmpresas: ['26888098000159', '26888098000230']
})

// Aguardar finalização
const entries = await client.baixarRelatorio(relatorioId)

// Processar e inserir em dre_entries
```

### Exemplo 3: Importar Parcelas de Títulos (Mensal)

```typescript
const service = new F360Service('token')
const parcelas = await service.getAllParcelasTitulos({
  cnpj: '26888098000159',
  dataInicio: '2025-01-01',
  dataFim: '2025-01-31',
  tipo: 'Ambos',
  tipoDatas: 'Competência'
})

// Filtrar apenas liquidadas para DFC
const dfcEntries = parcelas
  .filter(p => p.DataLiquidacao)
  .map(p => ({
    company_cnpj: '26888098000159',
    date: p.DataLiquidacao,
    kind: p.TipoTitulo === 'Receita' ? 'in' : 'out',
    category: p.PlanoDeContas,
    amount: p.ValorLiquido
  }))
```

---

## Referências

- Cliente F360: [`src/services/f360Service.ts`](src/services/f360Service.ts)
- Importador F360: [`src/services/f360ImportService.ts`](src/services/f360ImportService.ts)
- Scripts de teste: `scripts/tests/test_f360_*.mjs`
- Regras do projeto: [`.cursorrules`](.cursorrules)

