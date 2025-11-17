# 📡 Integração F360 - Estrutura e Download de Dados

## 🎯 Visão Geral

O sistema F360 é o ERP financeiro que contém:
- 📊 Lançamentos financeiros (A Receber / A Pagar)
- 📋 Plano de Contas
- 🏢 Centro de Custos
- 💰 Dados de liquidação e competência

---

## 🔑 Autenticação F360

### Credenciais por Empresa

Cada empresa (CNPJ) possui suas próprias credenciais:

```bash
# Variáveis de Ambiente
F360_TOKEN=65864535-8a5c-4a4c-ab8e-4f1f4196bfa6
F360_CNPJ=02723552000153
F360_WEBHOOK_TITULOS=https://api.f360.one/webhook/titulos

# Para Grupo Volpe (Matriz)
VOLPE_TOKEN_LOGIN=volpe.matriz@ifinance.com.br
VOLPE_TOKEN_SENHA=v3T$cABl5.
VOLPE_TOKEN_TOKEN=223b065a-1873-4cfe-a36b-f092c602a03e
```

### Estrutura de Autenticação

```javascript
const f360Config = {
  baseURL: 'https://api.f360.com.br',
  login: 'volpe.matriz@ifinance.com.br',
  senha: 'v3T$cABl5.',
  token: '223b065a-1873-4cfe-a36b-f092c602a03e'
}
```

---

## 📥 Métodos de Download de Dados

### Opção 1: Export Manual (Atual)

**Como funciona:**
1. Login no F360 via browser
2. Navegar para relatórios
3. Selecionar "Relatório Unificado"
4. Export para Excel (.xlsx)
5. Salvar arquivo como `{CNPJ}.xlsx`

**Estrutura do Arquivo:**

```
Arquivo: 26888098000159.xlsx
Aba: "Relatório Unificado"

Colunas:
- __EMPTY (A): Tipo (A Receber / A Pagar)
- __EMPTY_3 (D): Data Emissão
- __EMPTY_4 (E): Data Vencimento
- __EMPTY_5 (F): Data Liquidação
- __EMPTY_7 (H): Centro de Custo
- __EMPTY_8 (I): Valor Líquido
- __EMPTY_9 (J): Categoria
- __EMPTY_10 (K): Observações
- __EMPTY_11 (L): Competência (MM/YYYY)
- __EMPTY_12 (M): Plano de Contas (XXX-X - Nome)
- __EMPTY_13 (N): Cliente/Fornecedor
```

**PlanoDeContas.xlsx:**
```
Aba: "Plano de Contas"
Colunas:
- Plano de Contas (Visualizacao/Edicao): "102-1 - Vendas de Produtos"
```

**CentroDeCustos.xlsx:**
```
Aba: Primeira aba
Colunas:
- Centro de Custos: "Administrativo"
```

---

### Opção 2: API F360 (Recomendado)

#### 🔹 Endpoint: Autenticação

```http
POST https://api.f360.com.br/v1/auth/login
Content-Type: application/json

{
  "email": "volpe.matriz@ifinance.com.br",
  "password": "v3T$cABl5."
}

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

#### 🔹 Endpoint: Listar Títulos (Lançamentos)

```http
GET https://api.f360.com.br/v1/titulos
Authorization: Bearer {access_token}
X-F360-CNPJ: 26888098000159

Query Parameters:
- data_inicio: 2024-01-01
- data_fim: 2024-12-31
- tipo: all | a_receber | a_pagar
- status: all | pendente | liquidado | cancelado
- page: 1
- per_page: 100
```

**Response:**
```json
{
  "data": [
    {
      "id": 12345,
      "tipo": "a_receber",
      "data_emissao": "2024-01-15",
      "data_vencimento": "2024-02-15",
      "data_liquidacao": "2024-02-10",
      "competencia": "2024-01",
      "valor_bruto": 1000.00,
      "valor_liquido": 950.00,
      "plano_contas": {
        "codigo": "102-1",
        "nome": "Vendas de Produtos - PIX"
      },
      "centro_custo": {
        "codigo": "ADM",
        "nome": "Administrativo"
      },
      "cliente": "Cliente XYZ Ltda",
      "categoria": "Venda",
      "observacoes": "Pagamento via PIX"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 45,
    "total_records": 4500
  }
}
```

#### 🔹 Endpoint: Plano de Contas

```http
GET https://api.f360.com.br/v1/plano-contas
Authorization: Bearer {access_token}
X-F360-CNPJ: 26888098000159
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "codigo": "102-1",
      "nome": "Vendas de Produtos",
      "tipo": "receita",
      "categoria": "Receitas Operacionais",
      "ativo": true,
      "subconta_de": null
    },
    {
      "id": 2,
      "codigo": "102-1-001",
      "nome": "Vendas de Produtos - PIX",
      "tipo": "receita",
      "categoria": "Receitas Operacionais",
      "ativo": true,
      "subconta_de": 1
    }
  ]
}
```

#### 🔹 Endpoint: Centro de Custos

```http
GET https://api.f360.com.br/v1/centro-custos
Authorization: Bearer {access_token}
X-F360-CNPJ: 26888098000159
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "codigo": "ADM",
      "nome": "Administrativo",
      "ativo": true
    },
    {
      "id": 2,
      "codigo": "VEN",
      "nome": "Vendas",
      "ativo": true
    }
  ]
}
```

---

### Opção 3: Webhook F360 (Tempo Real)

#### Configuração

```javascript
// Registrar webhook no F360
POST https://api.f360.com.br/v1/webhooks
{
  "url": "https://seu-servidor.com/webhook/f360/titulos",
  "eventos": ["titulo.criado", "titulo.atualizado", "titulo.liquidado"],
  "ativo": true
}
```

#### Payload Recebido

```json
{
  "evento": "titulo.liquidado",
  "timestamp": "2024-01-15T10:30:00Z",
  "cnpj": "26888098000159",
  "dados": {
    "titulo_id": 12345,
    "tipo": "a_receber",
    "valor_liquido": 950.00,
    "data_liquidacao": "2024-01-15",
    "plano_contas_codigo": "102-1",
    "centro_custo_codigo": "ADM"
  }
}
```

---

## 🛠️ Script de Download Automatizado

### Implementação Sugerida:

```javascript
#!/usr/bin/env node
/**
 * Download automático de dados F360
 */

import axios from 'axios'
import fs from 'fs'
import XLSX from 'xlsx'

class F360Client {
  constructor(config) {
    this.config = config
    this.token = null
  }

  async login() {
    const response = await axios.post(`${this.config.baseURL}/v1/auth/login`, {
      email: this.config.login,
      password: this.config.senha
    })
    this.token = response.data.access_token
    return this.token
  }

  async getTitulos(cnpj, dataInicio, dataFim) {
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'X-F360-CNPJ': cnpj
    }

    let allData = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await axios.get(`${this.config.baseURL}/v1/titulos`, {
        headers,
        params: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          page,
          per_page: 100
        }
      })

      allData = [...allData, ...response.data.data]
      hasMore = response.data.pagination.current_page < response.data.pagination.total_pages
      page++
    }

    return allData
  }

  async getPlanoContas(cnpj) {
    const response = await axios.get(`${this.config.baseURL}/v1/plano-contas`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-F360-CNPJ': cnpj
      }
    })
    return response.data.data
  }

  async getCentroCustos(cnpj) {
    const response = await axios.get(`${this.config.baseURL}/v1/centro-custos`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-F360-CNPJ': cnpj
      }
    })
    return response.data.data
  }

  exportToExcel(titulos, filename) {
    const data = titulos.map(t => ({
      'Tipo': t.tipo === 'a_receber' ? 'A Receber' : 'A Pagar',
      'Emissão': t.data_emissao,
      'Vencimento': t.data_vencimento,
      'Liquidação': t.data_liquidacao || '',
      'Centro de Custo': t.centro_custo?.nome || '',
      'Valor Líquido': t.valor_liquido,
      'Categoria': t.categoria || '',
      'Observações': t.observacoes || '',
      'Competência': t.competencia,
      'Plano de Contas': `${t.plano_contas.codigo} - ${t.plano_contas.nome}`,
      'Cliente/Fornecedor': t.cliente || t.fornecedor || ''
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Unificado')
    XLSX.writeFile(wb, filename)
  }
}

// Uso
async function downloadEmpresa(cnpj, nome) {
  const client = new F360Client({
    baseURL: 'https://api.f360.com.br',
    login: process.env.F360_LOGIN,
    senha: process.env.F360_SENHA
  })

  await client.login()
  
  const titulos = await client.getTitulos(cnpj, '2024-01-01', '2024-12-31')
  const planoContas = await client.getPlanoContas(cnpj)
  const centroCustos = await client.getCentroCustos(cnpj)

  client.exportToExcel(titulos, `${cnpj}.xlsx`)
  
  fs.writeFileSync(
    `PlanoDeContas_${cnpj}.json`,
    JSON.stringify(planoContas, null, 2)
  )
  
  fs.writeFileSync(
    `CentroDeCustos_${cnpj}.json`,
    JSON.stringify(centroCustos, null, 2)
  )

  console.log(`✅ ${nome} - ${titulos.length} lançamentos baixados`)
}
```

---

## 📋 Checklist de Implementação

### Fase 1: Investigação
- [ ] Confirmar endpoints da API F360
- [ ] Testar autenticação com credenciais Volpe
- [ ] Documentar schema de response real
- [ ] Verificar rate limits e paginação

### Fase 2: Desenvolvimento
- [ ] Criar classe `F360Client` 
- [ ] Implementar download de títulos
- [ ] Implementar download de plano de contas
- [ ] Implementar download de centro de custos
- [ ] Adicionar tratamento de erros
- [ ] Implementar retry logic

### Fase 3: Integração
- [ ] Modificar `processar_grupo_volpe.mjs` para usar API
- [ ] Salvar configurações F360 no Supabase
- [ ] Implementar webhook handler
- [ ] Criar job de sincronização automática

### Fase 4: Multi-Tenant
- [ ] Suportar múltiplas credenciais F360
- [ ] Armazenar plano/centro por empresa
- [ ] Versionar mudanças de plano de contas
- [ ] Dashboard de status de sincronização

---

## 🔐 Segurança

### Armazenamento de Credenciais

```sql
-- Tabela para credenciais F360 (criptografadas)
CREATE TABLE f360_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) UNIQUE,
  login TEXT NOT NULL,
  password_encrypted TEXT NOT NULL, -- Usar pgcrypto
  token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Função para criptografar
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert com criptografia
INSERT INTO f360_credentials (company_id, login, password_encrypted)
VALUES (
  'company-uuid',
  'volpe.matriz@ifinance.com.br',
  crypt('v3T$cABl5.', gen_salt('bf'))
);
```

---

**Versão:** 1.0  
**Data:** 17/11/2024  
**Status:** Documentação - Aguardando Teste de API
