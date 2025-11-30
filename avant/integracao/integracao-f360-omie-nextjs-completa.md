# Guia Técnico Completo: Integração F360 + Omie ERP com Next.js, Supabase e RAG

**Versão:** 2.0  
**Data:** 20 de Novembro de 2025  
**Arquitetura:** Next.js 14+ (App Router) + Supabase + Redis + PostgreSQL + RAG com OpenAI

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Autenticação - F360 e Omie](#2-autenticação)
3. [Schema Completo do Banco de Dados](#3-schema-completo-do-banco-de-dados)
4. [Implementação Next.js com Cache Redis](#4-implementação-nextjs-com-cache-redis)
5. [Jobs Agendados para Sincronização](#5-jobs-agendados-para-sincronização)
6. [Sistema RAG Avançado](#6-sistema-rag-avançado)
7. [Dashboard Customizado](#7-dashboard-customizado)
8. [Alertas Inteligentes](#8-alertas-inteligentes)
9. [Deploy e Produção](#9-deploy-e-produção)

---

## 1. Visão Geral da Arquitetura

### 1.1 Stack Tecnológica

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14+)                   │
│  • App Router • Server Components • Server Actions           │
│  • TailwindCSS • Shadcn/ui • Recharts                       │
└─────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────┐
│                    CACHE LAYER (Redis)                       │
│  • Upstash Redis • Cache Strategy • TTL Management          │
└─────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND SERVICES (Next.js API)               │
│  • F360 Client • Omie Client • Sync Services                │
│  • Webhook Handlers • Job Queue (Bull/BullMQ)               │
└─────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (Supabase PostgreSQL)                  │
│  • pgvector Extension • Row Level Security                   │
│  • Real-time Subscriptions • Edge Functions                 │
└─────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────┐
│                  RAG SYSTEM (OpenAI + pgvector)             │
│  • Embeddings • Semantic Search • LLM Integration           │
└─────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL APIs (F360 + Omie)                     │
│  • F360 Finanças • Omie ERP • Webhooks                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Fluxo de Dados

```
Usuário → Next.js UI → Redis Check → Cache Hit? 
                                    ↓ Yes: Return
                                    ↓ No: Continue
                     → API Route → Database Query
                                    ↓
                     → Store in Redis → Return
                     
Webhook Event → Vercel Webhook Endpoint → Process → Update DB → Invalidate Cache
                     
Cron Job → Vercel Cron → Sync Service → Fetch APIs → Transform → Store → Generate Embeddings
```

---

## 2. Autenticação

### 2.1 F360 Finanças

#### 2.1.1 Obtenção do Token

**Portal F360:**
1. Acesse: Menu → Cadastro → Webservices
2. Clique em "Criar"
3. Selecione "API Pública da F360"
4. Defina nome da integração
5. Escolha permissões (Acesso Total recomendado)
6. Copie o token (exibido apenas uma vez!)

#### 2.1.2 Estrutura de Autenticação

```typescript
// lib/f360/client.ts
import axios, { AxiosInstance } from 'axios';

export interface F360Config {
  apiToken: string;
  baseURL?: string;
}

export class F360Client {
  private axiosInstance: AxiosInstance;
  private jwtToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private config: F360Config) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL || 'https://financas.f360.com.br',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async authenticate(): Promise<string> {
    // Verifica se token ainda é válido
    if (this.jwtToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.jwtToken;
    }

    try {
      const response = await this.axiosInstance.post('/PublicLoginAPI/DoLogin', {
        token: this.config.apiToken,
      });

      this.jwtToken = response.data.Token;
      
      // JWT geralmente expira em 1 hora
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000); // 55 min
      
      return this.jwtToken;
    } catch (error) {
      console.error('F360 Authentication Error:', error);
      throw new Error('Failed to authenticate with F360');
    }
  }

  private async getHeaders() {
    const token = await this.authenticate();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Método genérico para requisições
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: any
  ): Promise<T> {
    const headers = await this.getHeaders();
    
    const response = await this.axiosInstance.request<T>({
      method,
      url: endpoint,
      headers,
      data,
      params,
    });

    return response.data;
  }
}
```

#### 2.1.3 Endpoints F360

```typescript
// lib/f360/endpoints.ts
export const F360_ENDPOINTS = {
  // Fluxo de Caixa
  FLUXO_CAIXA: {
    SALDO: '/api/v1/fluxo-caixa/saldo',
    PROJECAO: '/api/v1/fluxo-caixa/projecao',
    MOVIMENTACOES: '/api/v1/fluxo-caixa/movimentacoes',
  },
  
  // Contas Bancárias
  CONTAS_BANCARIAS: {
    LISTAR: '/api/v1/contas-bancarias',
    EXTRATO: '/api/v1/contas-bancarias/extrato',
  },
  
  // Títulos (Contas a Pagar/Receber)
  TITULOS: {
    RECEBER: '/api/v1/titulos/receber',
    PAGAR: '/api/v1/titulos/pagar',
    CRIAR: '/webhook/identificador-unico/f360-titulos',
  },
  
  // DRE
  RELATORIOS: {
    DRE: '/api/v1/relatorios/dre',
    INDICADORES: '/api/v1/indicadores',
  },
  
  // Vendas
  VENDAS: {
    LISTAR: '/api/v1/vendas',
    ANALISE_VENDEDORES: '/api/v1/vendas/analise-vendedores',
    CUPOM_FISCAL: '/webhook/identificador-unico/f360-cupom-fiscal',
  },
  
  // Clientes
  CLIENTES: {
    LISTAR: '/api/v1/clientes',
    ANALISE: '/api/v1/clientes/analise',
  },
} as const;
```

### 2.2 Omie ERP

#### 2.2.1 Obtenção das Credenciais

**Portal Omie:**
1. Faça login no Omie
2. Acesse: https://developer.omie.com.br/
3. Clique em "Aplicativos"
4. Selecione seu aplicativo
5. Visualize `app_key` e `app_secret`

**Importante:**
- Apenas administradores têm acesso às credenciais
- Protocolo: **SOAP ou JSON** (recomendamos JSON)
- Método: **POST** para todas as requisições
- Rate Limit: **60 req/min** e **1000 req/hora**

#### 2.2.2 Estrutura de Autenticação

```typescript
// lib/omie/client.ts
import axios, { AxiosInstance } from 'axios';

export interface OmieConfig {
  appKey: string;
  appSecret: string;
  baseURL?: string;
}

export interface OmieResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export class OmieClient {
  private axiosInstance: AxiosInstance;

  constructor(private config: OmieConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL || 'https://app.omie.com.br/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async call<T = any>(
    endpoint: string,
    method: string,
    params: any[] = []
  ): Promise<OmieResponse<T>> {
    try {
      const response = await this.axiosInstance.post(endpoint, {
        app_key: this.config.appKey,
        app_secret: this.config.appSecret,
        call: method,
        param: params,
      });

      return { data: response.data };
    } catch (error: any) {
      console.error('Omie API Error:', error.response?.data);
      return {
        error: {
          code: error.response?.data?.faultcode || 'UNKNOWN',
          message: error.response?.data?.faultstring || 'Unknown error',
        },
      };
    }
  }

  // Wrapper para paginação automática
  async callWithPagination<T = any>(
    endpoint: string,
    method: string,
    baseParams: any = {},
    maxPages: number = 100
  ): Promise<T[]> {
    const allResults: T[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore && currentPage <= maxPages) {
      const response = await this.call<any>(endpoint, method, [
        {
          ...baseParams,
          pagina: currentPage,
          registros_por_pagina: 50,
        },
      ]);

      if (response.error) {
        console.error(`Pagination error on page ${currentPage}:`, response.error);
        break;
      }

      const pageData = response.data;
      
      // Estrutura varia por endpoint - adapte conforme necessário
      const records = Array.isArray(pageData) 
        ? pageData 
        : pageData?.lista_clientes || pageData?.pedido_venda_produto || [];

      if (records.length === 0) {
        hasMore = false;
      } else {
        allResults.push(...records);
        currentPage++;
      }

      // Respeita rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return allResults;
  }
}
```

#### 2.2.3 Endpoints Omie

```typescript
// lib/omie/endpoints.ts
export const OMIE_ENDPOINTS = {
  // Clientes
  CLIENTES: {
    endpoint: '/geral/clientes/',
    methods: {
      LISTAR: 'ListarClientes',
      CONSULTAR: 'ConsultarCliente',
      INCLUIR: 'IncluirCliente',
      ALTERAR: 'AlterarCliente',
      EXCLUIR: 'ExcluirCliente',
    },
  },
  
  // Produtos
  PRODUTOS: {
    endpoint: '/geral/produtos/',
    methods: {
      LISTAR: 'ListarProdutos',
      CONSULTAR: 'ConsultarProduto',
      INCLUIR: 'IncluirProduto',
      ALTERAR: 'AlterarProduto',
    },
  },
  
  // Pedidos de Venda
  PEDIDOS_VENDA: {
    endpoint: '/produtos/pedido/',
    methods: {
      LISTAR: 'ListarPedidos',
      CONSULTAR: 'ConsultarPedido',
      INCLUIR: 'IncluirPedido',
      ALTERAR: 'AlterarPedidoVenda',
      FATURAR: 'FaturarPedido',
    },
  },
  
  // Contas a Receber
  CONTAS_RECEBER: {
    endpoint: '/financas/contareceber/',
    methods: {
      LISTAR: 'ListarContasReceber',
      CONSULTAR: 'ConsultarContaReceber',
      INCLUIR: 'IncluirContaReceber',
      ALTERAR: 'AlterarContaReceber',
      BAIXAR: 'BaixarContaReceber',
      CANCELAR_BAIXA: 'CancelarBaixaContaReceber',
    },
  },
  
  // Contas a Pagar
  CONTAS_PAGAR: {
    endpoint: '/financas/contapagar/',
    methods: {
      LISTAR: 'ListarContasPagar',
      CONSULTAR: 'ConsultarContaPagar',
      INCLUIR: 'IncluirContaPagar',
      ALTERAR: 'AlterarContaPagar',
      BAIXAR: 'BaixarContaPagar',
    },
  },
  
  // Ordens de Serviço
  ORDENS_SERVICO: {
    endpoint: '/servicos/os/',
    methods: {
      LISTAR: 'ListarOS',
      CONSULTAR: 'ConsultarOS',
      INCLUIR: 'IncluirOS',
      ALTERAR: 'AlterarOS',
    },
  },
  
  // Estoque
  ESTOQUE: {
    endpoint: '/estoque/consulta/',
    methods: {
      CONSULTAR: 'ConsultarEstoque',
      LISTAR_MOVIMENTOS: 'ListarMovimentos',
    },
  },
  
  // Notas Fiscais
  NOTAS_FISCAIS: {
    endpoint: '/produtos/nfconsultar/',
    methods: {
      LISTAR: 'ListarNF',
      CONSULTAR: 'ConsultarNF',
    },
  },
} as const;
```

---

## 3. Schema Completo do Banco de Dados

### 3.1 Setup Inicial Supabase

```sql
-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. Criar schema para isolamento
CREATE SCHEMA IF NOT EXISTS erp_integration;

-- 3. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 Tabelas F360

```sql
-- ========================================
-- TABELAS F360 FINANÇAS
-- ========================================

-- 3.2.1 Empresas
CREATE TABLE erp_integration.f360_empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_f360_empresas_cnpj ON erp_integration.f360_empresas(cnpj);

-- 3.2.2 Fluxo de Caixa
CREATE TABLE erp_integration.f360_fluxo_caixa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_cnpj VARCHAR(18) NOT NULL REFERENCES erp_integration.f360_empresas(cnpj),
    data DATE NOT NULL,
    saldo_abertura DECIMAL(15,2),
    entradas DECIMAL(15,2),
    saidas DECIMAL(15,2),
    geracao_caixa DECIMAL(15,2),
    saldo_projetado DECIMAL(15,2),
    atrasado DECIMAL(15,2),
    inadimplencia DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536),
    
    UNIQUE(empresa_cnpj, data)
);

CREATE INDEX idx_f360_fluxo_empresa ON erp_integration.f360_fluxo_caixa(empresa_cnpj);
CREATE INDEX idx_f360_fluxo_data ON erp_integration.f360_fluxo_caixa(data);
CREATE INDEX idx_f360_fluxo_embedding ON erp_integration.f360_fluxo_caixa 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3.2.3 Contas Bancárias
CREATE TABLE erp_integration.f360_contas_bancarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_cnpj VARCHAR(18) NOT NULL REFERENCES erp_integration.f360_empresas(cnpj),
    conta_id VARCHAR(50) UNIQUE NOT NULL,
    nome_conta VARCHAR(255) NOT NULL,
    banco VARCHAR(100),
    agencia VARCHAR(20),
    numero_conta VARCHAR(30),
    saldo_atual DECIMAL(15,2),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_f360_contas_empresa ON erp_integration.f360_contas_bancarias(empresa_cnpj);

-- 3.2.4 Extratos Bancários
CREATE TABLE erp_integration.f360_extratos_bancarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_cnpj VARCHAR(18) NOT NULL REFERENCES erp_integration.f360_empresas(cnpj),
    conta_bancaria_id VARCHAR(50) REFERENCES erp_integration.f360_contas_bancarias(conta_id),
    data DATE NOT NULL,
    historico TEXT,
    documento VARCHAR(100),
    valor_debito DECIMAL(15,2),
    valor_credito DECIMAL(15,2),
    saldo DECIMAL(15,2),
    conciliado BOOLEAN DEFAULT FALSE,
    categoria VARCHAR(255),
    centro_custo VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

CREATE INDEX idx_f360_extrato_empresa ON erp_integration.f360_extratos_bancarios(empresa_cnpj);
CREATE INDEX idx_f360_extrato_data ON erp_integration.f360_extratos_bancarios(data);
CREATE INDEX idx_f360_extrato_conta ON erp_integration.f360_extratos_bancarios(conta_bancaria_id);

-- 3.2.5 Títulos (Contas a Pagar/Receber)
CREATE TABLE erp_integration.f360_titulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_cnpj VARCHAR(18) NOT NULL REFERENCES erp_integration.f360_empresas(cnpj),
    titulo_id VARCHAR(50) UNIQUE,
    numero_titulo VARCHAR(100),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receber', 'pagar')),
    fornecedor_cliente_id VARCHAR(50),
    fornecedor_cliente_nome VARCHAR(255),
    fornecedor_cliente_cpf_cnpj VARCHAR(18),
    valor DECIMAL(15,2) NOT NULL,
    valor_aberto DECIMAL(15,2),
    data_emissao DATE,
    data_vencimento DATE NOT NULL,
    data_liquidacao DATE,
    status VARCHAR(20),
    meio_pagamento VARCHAR(100),
    tipo_documento VARCHAR(100),
    conta_bancaria VARCHAR(255),
    plano_contas VARCHAR(255),
    centro_custo VARCHAR(255),
    historico TEXT,
    numero_parcela INTEGER,
    total_parcelas INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

CREATE INDEX idx_f360_titulos_empresa ON erp_integration.f360_titulos(empresa_cnpj);
CREATE INDEX idx_f360_titulos_tipo ON erp_integration.f360_titulos(tipo);
CREATE INDEX idx_f360_titulos_vencimento ON erp_integration.f360_titulos(data_vencimento);
CREATE INDEX idx_f360_titulos_status ON erp_integration.f360_titulos(status);

-- 3.2.6 DRE (Demonstrativo de Resultado do Exercício)
CREATE TABLE erp_integration.f360_dre (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_cnpj VARCHAR(18) NOT NULL REFERENCES erp_integration.f360_empresas(cnpj),
    mes_referencia VARCHAR(7) NOT NULL,
    receitas_operacionais DECIMAL(15,2),
    deducoes_receitas DECIMAL(15,2),
    impostos_faturamento DECIMAL(15,2),
    despesas_operacionais DECIMAL(15,2),
    margem_contribuicao DECIMAL(15,2),
    despesas_pessoal DECIMAL(15,2),
    despesas_administrativas DECIMAL(15,2),
    despesas_comerciais DECIMAL(15,2),
    despesas_ti DECIMAL(15,2),
    ebitda DECIMAL(15,2),
    receitas_financeiras DECIMAL(15,2),
    despesas_financeiras DECIMAL(15,2),
    imposto_renda_csll DECIMAL(15,2),
    resultado_liquido DECIMAL(15,2),
    detalhes_json JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536),
    
    UNIQUE(empresa_cnpj, mes_referencia)
);

CREATE INDEX idx_f360_dre_empresa ON erp_integration.f360_dre(empresa_cnpj);
CREATE INDEX idx_f360_dre_mes ON erp_integration.f360_dre(mes_referencia);

-- 3.2.7 Vendas
CREATE TABLE erp_integration.f360_vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_cnpj VARCHAR(18) NOT NULL REFERENCES erp_integration.f360_empresas(cnpj),
    numero_cupom VARCHAR(100),
    data DATE NOT NULL,
    vendedor_id VARCHAR(50),
    vendedor_nome VARCHAR(255),
    cliente_id VARCHAR(50),
    cliente_nome VARCHAR(255),
    cliente_cpf VARCHAR(14),
    valor_total DECIMAL(15,2),
    quantidade_itens INTEGER,
    ticket_medio DECIMAL(15,2),
    meio_pagamento VARCHAR(100),
    bandeira VARCHAR(100),
    numero_parcelas INTEGER,
    produtos_json JSONB,
    cancelada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

CREATE INDEX idx_f360_vendas_empresa ON erp_integration.f360_vendas(empresa_cnpj);
CREATE INDEX idx_f360_vendas_data ON erp_integration.f360_vendas(data);
CREATE INDEX idx_f360_vendas_vendedor ON erp_integration.f360_vendas(vendedor_id);

-- 3.2.8 Vendedores (Análise Agregada)
CREATE TABLE erp_integration.f360_vendedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_cnpj VARCHAR(18) NOT NULL REFERENCES erp_integration.f360_empresas(cnpj),
    vendedor_id VARCHAR(50) NOT NULL,
    nome VARCHAR(255),
    valor_total_vendas DECIMAL(15,2),
    quantidade_vendas INTEGER,
    ticket_medio DECIMAL(15,2),
    total_clientes INTEGER,
    periodo_inicio DATE,
    periodo_fim DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(empresa_cnpj, vendedor_id, periodo_inicio, periodo_fim)
);

-- 3.2.9 Clientes
CREATE TABLE erp_integration.f360_clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_cnpj VARCHAR(18) NOT NULL REFERENCES erp_integration.f360_empresas(cnpj),
    cliente_id VARCHAR(50) NOT NULL,
    nome VARCHAR(255),
    cpf_cnpj VARCHAR(18),
    email VARCHAR(255),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    total_compras DECIMAL(15,2),
    quantidade_compras INTEGER,
    ticket_medio DECIMAL(15,2),
    primeira_compra DATE,
    ultima_compra DATE,
    classificacao_abc VARCHAR(1),
    recorrente BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536),
    
    UNIQUE(empresa_cnpj, cliente_id)
);

CREATE INDEX idx_f360_clientes_empresa ON erp_integration.f360_clientes(empresa_cnpj);
CREATE INDEX idx_f360_clientes_classificacao ON erp_integration.f360_clientes(classificacao_abc);

-- 3.2.10 Indicadores
CREATE TABLE erp_integration.f360_indicadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_cnpj VARCHAR(18) NOT NULL REFERENCES erp_integration.f360_empresas(cnpj),
    mes_referencia VARCHAR(7) NOT NULL,
    receita_bruta DECIMAL(15,2),
    impostos DECIMAL(15,2),
    lucro_bruto DECIMAL(15,2),
    ebitda DECIMAL(15,2),
    lucro_liquido DECIMAL(15,2),
    burn_rate DECIMAL(15,2),
    runway VARCHAR(10),
    margem_bruta_percentual DECIMAL(10,4),
    margem_liquida_percentual DECIMAL(10,4),
    margem_ebitda_percentual DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(empresa_cnpj, mes_referencia)
);
```

### 3.3 Tabelas Omie

```sql
-- ========================================
-- TABELAS OMIE ERP
-- ========================================

-- 3.3.1 Clientes Omie
CREATE TABLE erp_integration.omie_clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_cliente_omie BIGINT UNIQUE NOT NULL,
    codigo_cliente_integracao VARCHAR(100),
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj_cpf VARCHAR(18),
    email VARCHAR(255),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    endereco VARCHAR(255),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    ativo BOOLEAN DEFAULT TRUE,
    tags JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

CREATE INDEX idx_omie_clientes_codigo ON erp_integration.omie_clientes(codigo_cliente_omie);
CREATE INDEX idx_omie_clientes_cnpj ON erp_integration.omie_clientes(cnpj_cpf);

-- 3.3.2 Produtos Omie
CREATE TABLE erp_integration.omie_produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_produto BIGINT UNIQUE NOT NULL,
    codigo_produto_integracao VARCHAR(100),
    descricao VARCHAR(255) NOT NULL,
    codigo_interno VARCHAR(100),
    ncm VARCHAR(10),
    unidade VARCHAR(10),
    valor_unitario DECIMAL(15,2),
    estoque_atual DECIMAL(15,3),
    estoque_minimo DECIMAL(15,3),
    ativo BOOLEAN DEFAULT TRUE,
    caracteristicas JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

CREATE INDEX idx_omie_produtos_codigo ON erp_integration.omie_produtos(codigo_produto);

-- 3.3.3 Pedidos de Venda Omie
CREATE TABLE erp_integration.omie_pedidos_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_pedido BIGINT UNIQUE NOT NULL,
    codigo_pedido_integracao VARCHAR(100),
    numero_pedido VARCHAR(100),
    codigo_cliente BIGINT REFERENCES erp_integration.omie_clientes(codigo_cliente_omie),
    data_pedido DATE NOT NULL,
    data_previsao DATE,
    valor_total_produtos DECIMAL(15,2),
    valor_total_pedido DECIMAL(15,2),
    quantidade_itens INTEGER,
    etapa VARCHAR(50),
    codigo_status VARCHAR(50),
    descricao_status VARCHAR(255),
    itens_json JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

CREATE INDEX idx_omie_pedidos_codigo ON erp_integration.omie_pedidos_venda(codigo_pedido);
CREATE INDEX idx_omie_pedidos_cliente ON erp_integration.omie_pedidos_venda(codigo_cliente);
CREATE INDEX idx_omie_pedidos_data ON erp_integration.omie_pedidos_venda(data_pedido);

-- 3.3.4 Contas a Receber Omie
CREATE TABLE erp_integration.omie_contas_receber (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_lancamento_omie BIGINT UNIQUE NOT NULL,
    codigo_lancamento_integracao VARCHAR(100),
    codigo_cliente BIGINT REFERENCES erp_integration.omie_clientes(codigo_cliente_omie),
    data_vencimento DATE NOT NULL,
    data_previsao DATE,
    data_emissao DATE,
    valor_documento DECIMAL(15,2) NOT NULL,
    codigo_categoria VARCHAR(50),
    numero_documento VARCHAR(100),
    status_titulo VARCHAR(50),
    data_baixa DATE,
    valor_baixa DECIMAL(15,2),
    observacao TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

CREATE INDEX idx_omie_contas_receber_codigo ON erp_integration.omie_contas_receber(codigo_lancamento_omie);
CREATE INDEX idx_omie_contas_receber_cliente ON erp_integration.omie_contas_receber(codigo_cliente);
CREATE INDEX idx_omie_contas_receber_vencimento ON erp_integration.omie_contas_receber(data_vencimento);

-- 3.3.5 Contas a Pagar Omie
CREATE TABLE erp_integration.omie_contas_pagar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_lancamento_omie BIGINT UNIQUE NOT NULL,
    codigo_lancamento_integracao VARCHAR(100),
    codigo_fornecedor BIGINT,
    fornecedor_nome VARCHAR(255),
    data_vencimento DATE NOT NULL,
    data_previsao DATE,
    data_emissao DATE,
    valor_documento DECIMAL(15,2) NOT NULL,
    codigo_categoria VARCHAR(50),
    numero_documento VARCHAR(100),
    status_titulo VARCHAR(50),
    data_baixa DATE,
    valor_baixa DECIMAL(15,2),
    observacao TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

CREATE INDEX idx_omie_contas_pagar_codigo ON erp_integration.omie_contas_pagar(codigo_lancamento_omie);
CREATE INDEX idx_omie_contas_pagar_vencimento ON erp_integration.omie_contas_pagar(data_vencimento);

-- 3.3.6 Ordens de Serviço Omie
CREATE TABLE erp_integration.omie_ordens_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_os BIGINT UNIQUE NOT NULL,
    codigo_os_integracao VARCHAR(100),
    numero_os VARCHAR(100),
    codigo_cliente BIGINT REFERENCES erp_integration.omie_clientes(codigo_cliente_omie),
    data_previsao DATE,
    etapa VARCHAR(50),
    valor_total_servicos DECIMAL(15,2),
    quantidade_servicos INTEGER,
    observacoes TEXT,
    servicos_json JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

CREATE INDEX idx_omie_os_codigo ON erp_integration.omie_ordens_servico(codigo_os);
CREATE INDEX idx_omie_os_cliente ON erp_integration.omie_ordens_servico(codigo_cliente);

-- 3.3.7 Movimentações de Estoque Omie
CREATE TABLE erp_integration.omie_movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_movimento BIGINT UNIQUE NOT NULL,
    codigo_produto BIGINT REFERENCES erp_integration.omie_produtos(codigo_produto),
    data_movimento DATE NOT NULL,
    tipo_movimento VARCHAR(50),
    quantidade DECIMAL(15,3),
    valor_unitario DECIMAL(15,2),
    valor_total DECIMAL(15,2),
    observacao TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_omie_estoque_produto ON erp_integration.omie_movimentacoes_estoque(codigo_produto);
CREATE INDEX idx_omie_estoque_data ON erp_integration.omie_movimentacoes_estoque(data_movimento);
```

### 3.4 Tabelas de Controle e Sincronização

```sql
-- ========================================
-- TABELAS DE CONTROLE
-- ========================================

-- 3.4.1 Logs de Sincronização
CREATE TABLE erp_integration.sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sistema VARCHAR(20) NOT NULL CHECK (sistema IN ('f360', 'omie')),
    entidade VARCHAR(100) NOT NULL,
    operacao VARCHAR(20) NOT NULL CHECK (operacao IN ('sync', 'webhook', 'manual')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'partial')),
    registros_processados INTEGER,
    registros_erro INTEGER,
    tempo_execucao_ms INTEGER,
    erro_detalhes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_sistema ON erp_integration.sync_logs(sistema);
CREATE INDEX idx_sync_logs_entidade ON erp_integration.sync_logs(entidade);
CREATE INDEX idx_sync_logs_created ON erp_integration.sync_logs(created_at);

-- 3.4.2 Controle de Última Sincronização
CREATE TABLE erp_integration.sync_control (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sistema VARCHAR(20) NOT NULL,
    entidade VARCHAR(100) NOT NULL,
    ultima_sincronizacao TIMESTAMP,
    proxima_sincronizacao TIMESTAMP,
    intervalo_minutos INTEGER DEFAULT 60,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(sistema, entidade)
);

-- 3.4.3 Fila de Webhooks
CREATE TABLE erp_integration.webhook_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sistema VARCHAR(20) NOT NULL,
    evento VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
    tentativas INTEGER DEFAULT 0,
    max_tentativas INTEGER DEFAULT 3,
    erro_mensagem TEXT,
    processado_em TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_queue_status ON erp_integration.webhook_queue(status);
CREATE INDEX idx_webhook_queue_created ON erp_integration.webhook_queue(created_at);

-- 3.4.4 Cache Redis Metadata
CREATE TABLE erp_integration.cache_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    entidade VARCHAR(100),
    ttl_seconds INTEGER,
    ultimo_refresh TIMESTAMP,
    hits INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3.4.5 Configurações do Sistema
CREATE TABLE erp_integration.system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(20) CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    descricao TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO erp_integration.system_config (chave, valor, tipo, descricao) VALUES
('f360.sync.enabled', 'true', 'boolean', 'Habilitar sincronização F360'),
('omie.sync.enabled', 'true', 'boolean', 'Habilitar sincronização Omie'),
('rag.model', 'text-embedding-3-small', 'string', 'Modelo de embedding OpenAI'),
('cache.ttl.default', '3600', 'number', 'TTL padrão do cache em segundos'),
('sync.interval.minutes', '60', 'number', 'Intervalo de sincronização em minutos');
```

### 3.5 Funções RPC para Busca Vetorial

```sql
-- ========================================
-- FUNÇÕES DE BUSCA VETORIAL (RAG)
-- ========================================

-- 3.5.1 Busca em F360 Fluxo de Caixa
CREATE OR REPLACE FUNCTION erp_integration.match_f360_fluxo_caixa(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    filter_cnpj varchar DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    empresa_cnpj VARCHAR,
    data DATE,
    entradas DECIMAL,
    saidas DECIMAL,
    saldo_projetado DECIMAL,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fc.id,
        fc.empresa_cnpj,
        fc.data,
        fc.entradas,
        fc.saidas,
        fc.saldo_projetado,
        1 - (fc.embedding <=> query_embedding) AS similarity
    FROM erp_integration.f360_fluxo_caixa fc
    WHERE 
        (filter_cnpj IS NULL OR fc.empresa_cnpj = filter_cnpj)
        AND fc.embedding IS NOT NULL
        AND 1 - (fc.embedding <=> query_embedding) > match_threshold
    ORDER BY fc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 3.5.2 Busca em F360 Títulos
CREATE OR REPLACE FUNCTION erp_integration.match_f360_titulos(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    filter_cnpj varchar DEFAULT NULL,
    filter_tipo varchar DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    empresa_cnpj VARCHAR,
    tipo VARCHAR,
    numero_titulo VARCHAR,
    fornecedor_cliente_nome VARCHAR,
    valor DECIMAL,
    data_vencimento DATE,
    status VARCHAR,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.empresa_cnpj,
        t.tipo,
        t.numero_titulo,
        t.fornecedor_cliente_nome,
        t.valor,
        t.data_vencimento,
        t.status,
        1 - (t.embedding <=> query_embedding) AS similarity
    FROM erp_integration.f360_titulos t
    WHERE 
        (filter_cnpj IS NULL OR t.empresa_cnpj = filter_cnpj)
        AND (filter_tipo IS NULL OR t.tipo = filter_tipo)
        AND t.embedding IS NOT NULL
        AND 1 - (t.embedding <=> query_embedding) > match_threshold
    ORDER BY t.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 3.5.3 Busca em Omie Clientes
CREATE OR REPLACE FUNCTION erp_integration.match_omie_clientes(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    codigo_cliente_omie BIGINT,
    razao_social VARCHAR,
    nome_fantasia VARCHAR,
    cnpj_cpf VARCHAR,
    cidade VARCHAR,
    estado VARCHAR,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.codigo_cliente_omie,
        c.razao_social,
        c.nome_fantasia,
        c.cnpj_cpf,
        c.cidade,
        c.estado,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM erp_integration.omie_clientes c
    WHERE 
        c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 3.5.4 Busca Geral em Todos os Sistemas
CREATE OR REPLACE FUNCTION erp_integration.semantic_search_all(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count_per_table int DEFAULT 5
)
RETURNS TABLE (
    source_table VARCHAR,
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Fluxo de Caixa
    SELECT 
        'f360_fluxo_caixa'::VARCHAR AS source_table,
        fc.id,
        CONCAT('Fluxo de Caixa - ', fc.data, ': Entradas R$ ', fc.entradas, ', Saídas R$ ', fc.saidas) AS content,
        jsonb_build_object(
            'empresa_cnpj', fc.empresa_cnpj,
            'data', fc.data,
            'saldo_projetado', fc.saldo_projetado
        ) AS metadata,
        1 - (fc.embedding <=> query_embedding) AS similarity
    FROM erp_integration.f360_fluxo_caixa fc
    WHERE fc.embedding IS NOT NULL
        AND 1 - (fc.embedding <=> query_embedding) > match_threshold
    ORDER BY fc.embedding <=> query_embedding
    LIMIT match_count_per_table
    
    UNION ALL
    
    -- Títulos
    SELECT 
        'f360_titulos'::VARCHAR,
        t.id,
        CONCAT('Título ', t.tipo, ' - ', t.numero_titulo, ': ', t.fornecedor_cliente_nome, ' R$ ', t.valor) AS content,
        jsonb_build_object(
            'empresa_cnpj', t.empresa_cnpj,
            'tipo', t.tipo,
            'vencimento', t.data_vencimento,
            'status', t.status
        ) AS metadata,
        1 - (t.embedding <=> query_embedding) AS similarity
    FROM erp_integration.f360_titulos t
    WHERE t.embedding IS NOT NULL
        AND 1 - (t.embedding <=> query_embedding) > match_threshold
    ORDER BY t.embedding <=> query_embedding
    LIMIT match_count_per_table
    
    UNION ALL
    
    -- Clientes Omie
    SELECT 
        'omie_clientes'::VARCHAR,
        c.id,
        CONCAT('Cliente: ', c.razao_social, ' (', c.nome_fantasia, ') - ', c.cidade, '/', c.estado) AS content,
        jsonb_build_object(
            'codigo_cliente_omie', c.codigo_cliente_omie,
            'cnpj_cpf', c.cnpj_cpf,
            'email', c.email
        ) AS metadata,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM erp_integration.omie_clientes c
    WHERE c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count_per_table
    
    ORDER BY similarity DESC;
END;
$$;
```

### 3.6 Triggers e Automatizações

```sql
-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger para updated_at em todas as tabelas
CREATE TRIGGER update_f360_empresas_updated_at BEFORE UPDATE ON erp_integration.f360_empresas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_f360_fluxo_caixa_updated_at BEFORE UPDATE ON erp_integration.f360_fluxo_caixa
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_f360_contas_bancarias_updated_at BEFORE UPDATE ON erp_integration.f360_contas_bancarias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repetir para todas as tabelas com updated_at...

-- Trigger para invalidar cache quando dados mudam
CREATE OR REPLACE FUNCTION invalidate_cache_on_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Adiciona entrada na fila para invalidar cache
    INSERT INTO erp_integration.cache_metadata (cache_key, entidade, ultimo_refresh)
    VALUES (
        'invalidate:' || TG_TABLE_NAME || ':' || NEW.id::text,
        TG_TABLE_NAME,
        NOW()
    )
    ON CONFLICT (cache_key) DO UPDATE
    SET ultimo_refresh = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em tabelas principais
CREATE TRIGGER cache_invalidation_f360_titulos
AFTER INSERT OR UPDATE ON erp_integration.f360_titulos
FOR EACH ROW EXECUTE FUNCTION invalidate_cache_on_change();

-- Repetir para outras tabelas críticas...
```

---

## 4. Implementação Next.js com Cache Redis

### 4.1 Setup do Projeto

```bash
# Criar projeto Next.js
npx create-next-app@latest erp-integration --typescript --tailwind --app
cd erp-integration

# Instalar dependências
npm install @supabase/supabase-js @upstash/redis axios date-fns zod
npm install -D @types/node

# Bibliotecas adicionais
npm install openai bull bullmq ioredis
npm install @tanstack/react-query recharts lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast
```

### 4.2 Variáveis de Ambiente

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://sua-instancia.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu-token

# F360
F360_API_TOKEN=seu-token-f360

# Omie
OMIE_APP_KEY=sua-app-key
OMIE_APP_SECRET=seu-app-secret

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Webhooks
WEBHOOK_SECRET=seu-webhook-secret-aleatorio

# Cron Jobs (Vercel Cron)
CRON_SECRET=seu-cron-secret
```

### 4.3 Cliente Redis com Cache Strategy

```typescript
// lib/redis/client.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Estratégia de cache
export const CACHE_TTL = {
  SHORT: 60 * 5, // 5 minutos
  MEDIUM: 60 * 30, // 30 minutos
  LONG: 60 * 60, // 1 hora
  VERY_LONG: 60 * 60 * 24, // 24 horas
} as const;

export const CACHE_KEYS = {
  F360: {
    FLUXO_CAIXA: (cnpj: string, data: string) => `f360:fluxo:${cnpj}:${data}`,
    TITULOS_RECEBER: (cnpj: string) => `f360:receber:${cnpj}`,
    TITULOS_PAGAR: (cnpj: string) => `f360:pagar:${cnpj}`,
    DRE: (cnpj: string, mes: string) => `f360:dre:${cnpj}:${mes}`,
    VENDAS: (cnpj: string, periodo: string) => `f360:vendas:${cnpj}:${periodo}`,
  },
  OMIE: {
    CLIENTES: (page: number) => `omie:clientes:page:${page}`,
    PRODUTOS: (page: number) => `omie:produtos:page:${page}`,
    PEDIDOS: (mes: string) => `omie:pedidos:${mes}`,
    CONTAS_RECEBER: (mes: string) => `omie:receber:${mes}`,
  },
} as const;

// Helpers de cache
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  // Tentar pegar do cache
  const cached = await redis.get<T>(key);
  
  if (cached) {
    console.log(`✅ Cache HIT: ${key}`);
    return cached;
  }

  console.log(`❌ Cache MISS: ${key}`);
  
  // Buscar dado
  const data = await fetcher();
  
  // Armazenar no cache
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
}

export async function invalidateCache(pattern: string): Promise<number> {
  const keys = await redis.keys(pattern);
  
  if (keys.length === 0) return 0;
  
  await redis.del(...keys);
  console.log(`🗑️  Invalidated ${keys.length} cache keys matching: ${pattern}`);
  
  return keys.length;
}

export async function invalidateCacheMultiple(patterns: string[]): Promise<void> {
  await Promise.all(patterns.map(pattern => invalidateCache(pattern)));
}
```

### 4.4 Custom Hook para Cache

```typescript
// hooks/use-cached-query.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

interface UseCachedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  endpoint: string;
  params?: Record<string, any>;
}

export function useCachedQuery<T>({
  queryKey,
  endpoint,
  params,
  ...options
}: UseCachedQueryOptions<T>) {
  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      const searchParams = new URLSearchParams(params);
      const url = `${endpoint}?${searchParams}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    cacheTime: 1000 * 60 * 30, // 30 minutos
    ...options,
  });
}
```

### 4.5 API Routes com Cache

```typescript
// app/api/f360/fluxo-caixa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { F360Client } from '@/lib/f360/client';
import { getCached, CACHE_KEYS, CACHE_TTL } from '@/lib/redis/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cnpj = searchParams.get('cnpj');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');

    if (!cnpj || !dataInicio || !dataFim) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const cacheKey = CACHE_KEYS.F360.FLUXO_CAIXA(cnpj, `${dataInicio}_${dataFim}`);

    const data = await getCached(
      cacheKey,
      async () => {
        const f360 = new F360Client({ apiToken: process.env.F360_API_TOKEN! });
        await f360.authenticate();

        return f360.request('GET', '/api/v1/fluxo-caixa/projecao', undefined, {
          cnpj,
          periodoInicio: dataInicio,
          periodoFim: dataFim,
        });
      },
      CACHE_TTL.MEDIUM
    );

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Fluxo de Caixa API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.6 Server Actions com Cache

```typescript
// app/actions/f360-actions.ts
'use server';

import { F360Client } from '@/lib/f360/client';
import { getCached, CACHE_KEYS, CACHE_TTL, invalidateCache } from '@/lib/redis/client';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getFluxoCaixa(
  cnpj: string,
  dataInicio: string,
  dataFim: string
) {
  try {
    const cacheKey = CACHE_KEYS.F360.FLUXO_CAIXA(cnpj, `${dataInicio}_${dataFim}`);

    const data = await getCached(
      cacheKey,
      async () => {
        const f360 = new F360Client({ apiToken: process.env.F360_API_TOKEN! });
        await f360.authenticate();

        const response = await f360.request('GET', '/api/v1/fluxo-caixa/projecao', undefined, {
          cnpj,
          periodoInicio: dataInicio,
          periodoFim: dataFim,
        });

        // Armazenar no Supabase
        const supabase = createClient();
        
        for (const item of response) {
          await supabase
            .from('f360_fluxo_caixa')
            .upsert({
              empresa_cnpj: cnpj,
              data: item.data,
              saldo_abertura: item.saldoAbertura,
              entradas: item.entradas,
              saidas: item.saidas,
              geracao_caixa: item.geracaoCaixa,
              saldo_projetado: item.saldoProjetado,
            });
        }

        return response;
      },
      CACHE_TTL.MEDIUM
    );

    return { success: true, data };
  } catch (error) {
    console.error('getFluxoCaixa Error:', error);
    return { success: false, error: 'Failed to fetch fluxo de caixa' };
  }
}

export async function invalidateFluxoCaixaCache(cnpj: string) {
  await invalidateCache(`f360:fluxo:${cnpj}:*`);
  revalidatePath('/dashboard/fluxo-caixa');
  return { success: true };
}
```

### 4.7 Middleware para Rate Limiting

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { redis } from '@/lib/redis/client';

export async function middleware(request: NextRequest) {
  // Rate limiting por IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitKey = `ratelimit:${ip}`;

  const requests = await redis.incr(rateLimitKey);
  
  if (requests === 1) {
    await redis.expire(rateLimitKey, 60); // 1 minuto
  }

  if (requests > 100) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## 5. Jobs Agendados para Sincronização

### 5.1 Setup com Vercel Cron

```typescript
// app/api/cron/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncF360Data } from '@/lib/sync/f360-sync';
import { syncOmieData } from '@/lib/sync/omie-sync';

export async function GET(request: NextRequest) {
  // Verificar autorização do cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🚀 Starting scheduled sync...');

    // Sincronizar F360
    const f360Result = await syncF360Data();
    console.log('✅ F360 sync complete:', f360Result);

    // Sincronizar Omie
    const omieResult = await syncOmieData();
    console.log('✅ Omie sync complete:', omieResult);

    return NextResponse.json({
      success: true,
      f360: f360Result,
      omie: omieResult,
    });
  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 }
    );
  }
}
```

### 5.2 Configuração Vercel Cron

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/sync-f360",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/sync-omie",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/cron/generate-embeddings",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### 5.3 Serviço de Sincronização F360

```typescript
// lib/sync/f360-sync.ts
import { F360Client } from '@/lib/f360/client';
import { createClient } from '@/lib/supabase/server';
import { invalidateCacheMultiple } from '@/lib/redis/client';
import { format, subDays } from 'date-fns';

export interface SyncResult {
  entity: string;
  recordsProcessed: number;
  recordsError: number;
  duration: number;
}

export async function syncF360Data(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const supabase = createClient();
  
  // Buscar empresas ativas
  const { data: empresas } = await supabase
    .from('f360_empresas')
    .select('cnpj')
    .eq('ativo', true);

  if (!empresas || empresas.length === 0) {
    return results;
  }

  const f360 = new F360Client({ apiToken: process.env.F360_API_TOKEN! });
  await f360.authenticate();

  for (const empresa of empresas) {
    const cnpj = empresa.cnpj;

    // Sincronizar Fluxo de Caixa
    results.push(await syncFluxoCaixa(f360, supabase, cnpj));

    // Sincronizar Títulos
    results.push(await syncTitulos(f360, supabase, cnpj));

    // Sincronizar Vendas
    results.push(await syncVendas(f360, supabase, cnpj));

    // Invalidar caches relacionados
    await invalidateCacheMultiple([
      `f360:fluxo:${cnpj}:*`,
      `f360:receber:${cnpj}`,
      `f360:pagar:${cnpj}`,
      `f360:vendas:${cnpj}:*`,
    ]);
  }

  return results;
}

async function syncFluxoCaixa(
  f360: F360Client,
  supabase: any,
  cnpj: string
): Promise<SyncResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const dataInicio = format(subDays(new Date(), 90), 'yyyy-MM-dd');
    const dataFim = format(new Date(), 'yyyy-MM-dd');

    const response = await f360.request('GET', '/api/v1/fluxo-caixa/projecao', undefined, {
      cnpj,
      periodoInicio: dataInicio,
      periodoFim: dataFim,
    });

    for (const item of response) {
      try {
        await supabase.from('f360_fluxo_caixa').upsert({
          empresa_cnpj: cnpj,
          data: item.data,
          saldo_abertura: item.saldoAbertura,
          entradas: item.entradas,
          saidas: item.saidas,
          geracao_caixa: item.geracaoCaixa,
          saldo_projetado: item.saldoProjetado,
        });
        processed++;
      } catch (error) {
        console.error('Error upserting fluxo caixa:', error);
        errors++;
      }
    }
  } catch (error) {
    console.error('syncFluxoCaixa error:', error);
  }

  return {
    entity: 'f360_fluxo_caixa',
    recordsProcessed: processed,
    recordsError: errors,
    duration: Date.now() - startTime,
  };
}

async function syncTitulos(
  f360: F360Client,
  supabase: any,
  cnpj: string
): Promise<SyncResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const dataInicio = format(subDays(new Date(), 90), 'yyyy-MM-dd');
    const dataFim = format(subDays(new Date(), -90), 'yyyy-MM-dd');

    // Contas a Receber
    const receber = await f360.request('GET', '/api/v1/titulos/receber', undefined, {
      cnpj,
      dataVencimentoInicio: dataInicio,
      dataVencimentoFim: dataFim,
      status: 'todos',
    });

    for (const titulo of receber.data) {
      try {
        await supabase.from('f360_titulos').upsert({
          empresa_cnpj: cnpj,
          titulo_id: titulo.id,
          numero_titulo: titulo.numeroTitulo,
          tipo: 'receber',
          fornecedor_cliente_id: titulo.cliente.id,
          fornecedor_cliente_nome: titulo.cliente.nome,
          fornecedor_cliente_cpf_cnpj: titulo.cliente.cpfCnpj,
          valor: titulo.valor,
          valor_aberto: titulo.valorAberto,
          data_emissao: titulo.dataEmissao,
          data_vencimento: titulo.dataVencimento,
          data_liquidacao: titulo.dataLiquidacao,
          status: titulo.status,
          meio_pagamento: titulo.meioPagamento,
        });
        processed++;
      } catch (error) {
        console.error('Error upserting titulo:', error);
        errors++;
      }
    }

    // Contas a Pagar
    const pagar = await f360.request('GET', '/api/v1/titulos/pagar', undefined, {
      cnpj,
      dataVencimentoInicio: dataInicio,
      dataVencimentoFim: dataFim,
      status: 'todos',
    });

    for (const titulo of pagar.data) {
      try {
        await supabase.from('f360_titulos').upsert({
          empresa_cnpj: cnpj,
          titulo_id: titulo.id,
          numero_titulo: titulo.numeroTitulo,
          tipo: 'pagar',
          fornecedor_cliente_nome: titulo.fornecedor.nome,
          valor: titulo.valor,
          valor_aberto: titulo.valorAberto,
          data_vencimento: titulo.dataVencimento,
          status: titulo.status,
        });
        processed++;
      } catch (error) {
        errors++;
      }
    }
  } catch (error) {
    console.error('syncTitulos error:', error);
  }

  return {
    entity: 'f360_titulos',
    recordsProcessed: processed,
    recordsError: errors,
    duration: Date.now() - startTime,
  };
}

async function syncVendas(
  f360: F360Client,
  supabase: any,
  cnpj: string
): Promise<SyncResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const dataInicio = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const dataFim = format(new Date(), 'yyyy-MM-dd');

    const response = await f360.request('GET', '/api/v1/vendas', undefined, {
      cnpj,
      dataInicio,
      dataFim,
    });

    for (const venda of response.data) {
      try {
        await supabase.from('f360_vendas').upsert({
          empresa_cnpj: cnpj,
          numero_cupom: venda.numeroCupom,
          data: venda.data,
          vendedor_id: venda.vendedor?.id,
          vendedor_nome: venda.vendedor?.nome,
          cliente_id: venda.cliente?.id,
          cliente_nome: venda.cliente?.nome,
          cliente_cpf: venda.cliente?.cpf,
          valor_total: venda.valorTotal,
          meio_pagamento: venda.meioPagamento,
          produtos_json: venda.produtos,
        });
        processed++;
      } catch (error) {
        errors++;
      }
    }
  } catch (error) {
    console.error('syncVendas error:', error);
  }

  return {
    entity: 'f360_vendas',
    recordsProcessed: processed,
    recordsError: errors,
    duration: Date.now() - startTime,
  };
}

// Log de sincronização
async function logSync(supabase: any, results: SyncResult[]) {
  for (const result of results) {
    await supabase.from('sync_logs').insert({
      sistema: 'f360',
      entidade: result.entity,
      operacao: 'sync',
      status: result.recordsError > 0 ? 'partial' : 'success',
      registros_processados: result.recordsProcessed,
      registros_erro: result.recordsError,
      tempo_execucao_ms: result.duration,
    });
  }
}
```

### 5.4 Serviço de Sincronização Omie

```typescript
// lib/sync/omie-sync.ts
import { OmieClient } from '@/lib/omie/client';
import { createClient } from '@/lib/supabase/server';
import { OMIE_ENDPOINTS } from '@/lib/omie/endpoints';
import { invalidateCacheMultiple } from '@/lib/redis/client';

export async function syncOmieData(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const supabase = createClient();

  const omie = new OmieClient({
    appKey: process.env.OMIE_APP_KEY!,
    appSecret: process.env.OMIE_APP_SECRET!,
  });

  // Sincronizar Clientes
  results.push(await syncOmieClientes(omie, supabase));

  // Sincronizar Produtos
  results.push(await syncOmieProdutos(omie, supabase));

  // Sincronizar Pedidos de Venda
  results.push(await syncOmiePedidos(omie, supabase));

  // Sincronizar Contas a Receber
  results.push(await syncOmieContasReceber(omie, supabase));

  // Invalidar caches
  await invalidateCacheMultiple([
    'omie:clientes:*',
    'omie:produtos:*',
    'omie:pedidos:*',
    'omie:receber:*',
  ]);

  return results;
}

async function syncOmieClientes(
  omie: OmieClient,
  supabase: any
): Promise<SyncResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const clientes = await omie.callWithPagination(
      OMIE_ENDPOINTS.CLIENTES.endpoint,
      OMIE_ENDPOINTS.CLIENTES.methods.LISTAR,
      {}
    );

    for (const cliente of clientes) {
      try {
        await supabase.from('omie_clientes').upsert({
          codigo_cliente_omie: cliente.codigo_cliente_omie,
          codigo_cliente_integracao: cliente.codigo_cliente_integracao,
          razao_social: cliente.razao_social,
          nome_fantasia: cliente.nome_fantasia,
          cnpj_cpf: cliente.cnpj_cpf,
          email: cliente.email,
          telefone: cliente.telefone1_numero,
          cidade: cliente.cidade,
          estado: cliente.estado,
        });
        processed++;
      } catch (error) {
        errors++;
      }
    }
  } catch (error) {
    console.error('syncOmieClientes error:', error);
  }

  return {
    entity: 'omie_clientes',
    recordsProcessed: processed,
    recordsError: errors,
    duration: Date.now() - startTime,
  };
}

async function syncOmieProdutos(
  omie: OmieClient,
  supabase: any
): Promise<SyncResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const produtos = await omie.callWithPagination(
      OMIE_ENDPOINTS.PRODUTOS.endpoint,
      OMIE_ENDPOINTS.PRODUTOS.methods.LISTAR,
      {}
    );

    for (const produto of produtos) {
      try {
        await supabase.from('omie_produtos').upsert({
          codigo_produto: produto.codigo_produto,
          codigo_produto_integracao: produto.codigo_produto_integracao,
          descricao: produto.descricao,
          codigo_interno: produto.codigo,
          ncm: produto.ncm,
          unidade: produto.unidade,
          valor_unitario: produto.valor_unitario,
        });
        processed++;
      } catch (error) {
        errors++;
      }
    }
  } catch (error) {
    console.error('syncOmieProdutos error:', error);
  }

  return {
    entity: 'omie_produtos',
    recordsProcessed: processed,
    recordsError: errors,
    duration: Date.now() - startTime,
  };
}

async function syncOmiePedidos(
  omie: OmieClient,
  supabase: any
): Promise<SyncResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const pedidos = await omie.callWithPagination(
      OMIE_ENDPOINTS.PEDIDOS_VENDA.endpoint,
      OMIE_ENDPOINTS.PEDIDOS_VENDA.methods.LISTAR,
      {
        apenas_importado_api: 'N',
      }
    );

    for (const pedido of pedidos) {
      try {
        await supabase.from('omie_pedidos_venda').upsert({
          codigo_pedido: pedido.codigo_pedido,
          codigo_pedido_integracao: pedido.codigo_pedido_integracao,
          numero_pedido: pedido.numero_pedido,
          codigo_cliente: pedido.cabecalho.codigo_cliente,
          data_pedido: pedido.cabecalho.data_previsao,
          valor_total_produtos: pedido.total_pedido.valor_mercadorias,
          valor_total_pedido: pedido.total_pedido.valor_total_pedido,
          quantidade_itens: pedido.det?.length || 0,
          etapa: pedido.infoCadastro.etapa,
          codigo_status: pedido.infoCadastro.codigo_status,
          itens_json: pedido.det,
        });
        processed++;
      } catch (error) {
        errors++;
      }
    }
  } catch (error) {
    console.error('syncOmiePedidos error:', error);
  }

  return {
    entity: 'omie_pedidos_venda',
    recordsProcessed: processed,
    recordsError: errors,
    duration: Date.now() - startTime,
  };
}

async function syncOmieContasReceber(
  omie: OmieClient,
  supabase: any
): Promise<SyncResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const contas = await omie.callWithPagination(
      OMIE_ENDPOINTS.CONTAS_RECEBER.endpoint,
      OMIE_ENDPOINTS.CONTAS_RECEBER.methods.LISTAR,
      {}
    );

    for (const conta of contas) {
      try {
        await supabase.from('omie_contas_receber').upsert({
          codigo_lancamento_omie: conta.codigo_lancamento_omie,
          codigo_lancamento_integracao: conta.codigo_lancamento_integracao,
          codigo_cliente: conta.codigo_cliente_fornecedor,
          data_vencimento: conta.data_vencimento,
          data_emissao: conta.data_emissao,
          valor_documento: conta.valor_documento,
          codigo_categoria: conta.codigo_categoria,
          numero_documento: conta.numero_documento_fiscal,
          status_titulo: conta.status_titulo,
        });
        processed++;
      } catch (error) {
        errors++;
      }
    }
  } catch (error) {
    console.error('syncOmieContasReceber error:', error);
  }

  return {
    entity: 'omie_contas_receber',
    recordsProcessed: processed,
    recordsError: errors,
    duration: Date.now() - startTime,
  };
}
```

---

## 6. Sistema RAG Avançado

### 6.1 Serviço de Embeddings

```typescript
// lib/rag/embeddings.ts
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

export async function generateEmbeddingsForTable(
  tableName: string,
  textColumn: string,
  whereClause?: string
) {
  const supabase = createClient();
  
  let query = supabase.from(tableName).select('id, ' + textColumn);
  
  if (whereClause) {
    query = query.or(whereClause);
  }

  const { data, error } = await query.is('embedding', null).limit(100);

  if (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return { processed: 0, errors: 1 };
  }

  let processed = 0;
  let errors = 0;

  for (const record of data || []) {
    try {
      const text = record[textColumn];
      if (!text) continue;

      const embedding = await generateEmbedding(text);

      await supabase
        .from(tableName)
        .update({ embedding })
        .eq('id', record.id);

      processed++;
    } catch (error) {
      console.error(`Error generating embedding for ${record.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}

// Job para gerar embeddings
export async function generateAllEmbeddings() {
  const results = [];

  // F360 Tables
  results.push({
    table: 'f360_fluxo_caixa',
    ...(await generateEmbeddingsForF360FluxoCaixa()),
  });

  results.push({
    table: 'f360_titulos',
    ...(await generateEmbeddingsForF360Titulos()),
  });

  // Omie Tables
  results.push({
    table: 'omie_clientes',
    ...(await generateEmbeddingsForOmieClientes()),
  });

  return results;
}

async function generateEmbeddingsForF360FluxoCaixa() {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('f360_fluxo_caixa')
    .select('*')
    .is('embedding', null)
    .limit(100);

  let processed = 0;
  let errors = 0;

  for (const record of data || []) {
    try {
      const text = `
        Fluxo de Caixa - Data: ${record.data}
        Empresa: ${record.empresa_cnpj}
        Saldo de Abertura: R$ ${record.saldo_abertura?.toFixed(2)}
        Entradas: R$ ${record.entradas?.toFixed(2)}
        Saídas: R$ ${record.saidas?.toFixed(2)}
        Geração de Caixa: R$ ${record.geracao_caixa?.toFixed(2)}
        Saldo Projetado: R$ ${record.saldo_projetado?.toFixed(2)}
      `.trim();

      const embedding = await generateEmbedding(text);

      await supabase
        .from('f360_fluxo_caixa')
        .update({ embedding })
        .eq('id', record.id);

      processed++;
    } catch (error) {
      errors++;
    }
  }

  return { processed, errors };
}

async function generateEmbeddingsForF360Titulos() {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('f360_titulos')
    .select('*')
    .is('embedding', null)
    .limit(100);

  let processed = 0;
  let errors = 0;

  for (const record of data || []) {
    try {
      const text = `
        Título ${record.tipo === 'receber' ? 'a Receber' : 'a Pagar'}
        Número: ${record.numero_titulo}
        ${record.fornecedor_cliente_nome ? 'Cliente/Fornecedor: ' + record.fornecedor_cliente_nome : ''}
        Valor: R$ ${record.valor?.toFixed(2)}
        Vencimento: ${record.data_vencimento}
        Status: ${record.status}
        ${record.historico ? 'Histórico: ' + record.historico : ''}
      `.trim();

      const embedding = await generateEmbedding(text);

      await supabase
        .from('f360_titulos')
        .update({ embedding })
        .eq('id', record.id);

      processed++;
    } catch (error) {
      errors++;
    }
  }

  return { processed, errors };
}

async function generateEmbeddingsForOmieClientes() {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('omie_clientes')
    .select('*')
    .is('embedding', null)
    .limit(100);

  let processed = 0;
  let errors = 0;

  for (const record of data || []) {
    try {
      const text = `
        Cliente: ${record.razao_social}
        Nome Fantasia: ${record.nome_fantasia || ''}
        CNPJ/CPF: ${record.cnpj_cpf || ''}
        Cidade: ${record.cidade || ''}
        Estado: ${record.estado || ''}
        Email: ${record.email || ''}
        Telefone: ${record.telefone || ''}
      `.trim();

      const embedding = await generateEmbedding(text);

      await supabase
        .from('omie_clientes')
        .update({ embedding })
        .eq('id', record.id);

      processed++;
    } catch (error) {
      errors++;
    }
  }

  return { processed, errors };
}
```

### 6.2 Serviço de Busca Semântica

```typescript
// lib/rag/search.ts
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from './embeddings';

export interface SemanticSearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  source_table: string;
}

export async function semanticSearch(
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    filterCnpj?: string;
  } = {}
): Promise<SemanticSearchResult[]> {
  const {
    matchThreshold = 0.5,
    matchCount = 10,
    filterCnpj,
  } = options;

  const supabase = createClient();

  // Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query);

  // Buscar em múltiplas tabelas usando a função RPC
  const { data, error } = await supabase.rpc('semantic_search_all', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count_per_table: matchCount,
  });

  if (error) {
    console.error('Semantic search error:', error);
    return [];
  }

  // Filtrar por CNPJ se especificado
  if (filterCnpj) {
    return data.filter((result: any) => 
      !result.metadata.empresa_cnpj || result.metadata.empresa_cnpj === filterCnpj
    );
  }

  return data;
}

// Busca específica em F360 Títulos
export async function searchTitulos(
  query: string,
  cnpj: string,
  tipo?: 'receber' | 'pagar'
) {
  const supabase = createClient();
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('match_f360_titulos', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 10,
    filter_cnpj: cnpj,
    filter_tipo: tipo,
  });

  if (error) {
    console.error('Search titulos error:', error);
    return [];
  }

  return data;
}

// Busca específica em Omie Clientes
export async function searchClientes(query: string) {
  const supabase = createClient();
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('match_omie_clientes', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 10,
  });

  if (error) {
    console.error('Search clientes error:', error);
    return [];
  }

  return data;
}
```

### 6.3 Chat com RAG

```typescript
// lib/rag/chat.ts
import OpenAI from 'openai';
import { semanticSearch } from './search';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatWithRAG(
  userMessage: string,
  cnpj?: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  // 1. Buscar contexto relevante
  const searchResults = await semanticSearch(userMessage, {
    matchThreshold: 0.6,
    matchCount: 5,
    filterCnpj: cnpj,
  });

  // 2. Construir contexto
  const context = searchResults
    .map((result, index) => `[${index + 1}] ${result.content}`)
    .join('\n\n');

  // 3. Construir mensagens
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Você é um assistente financeiro especializado em análise de dados de ERP.
      
Você tem acesso a dados financeiros de duas fontes:
- F360 Finanças: Fluxo de caixa, contas a pagar/receber, DRE, vendas
- Omie ERP: Clientes, produtos, pedidos, ordens de serviço

Use o contexto abaixo para responder perguntas de forma precisa e objetiva.
Sempre cite os dados específicos (valores, datas) quando disponíveis.
Se não houver informação suficiente, seja honesto sobre isso.

CONTEXTO RELEVANTE:
${context}`,
    },
    ...conversationHistory,
    {
      role: 'user',
      content: userMessage,
    },
  ];

  // 4. Chamar LLM
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0].message.content || 'Desculpe, não consegui gerar uma resposta.';
}

// API Route para chat
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { chatWithRAG } from '@/lib/rag/chat';

export async function POST(request: NextRequest) {
  try {
    const { message, cnpj, history } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await chatWithRAG(message, cnpj, history);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 6.4 Cron para Gerar Embeddings

```typescript
// app/api/cron/generate-embeddings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAllEmbeddings } from '@/lib/rag/embeddings';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🚀 Starting embedding generation...');

    const results = await generateAllEmbeddings();

    console.log('✅ Embedding generation complete:', results);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('❌ Embedding generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Embedding generation failed' },
      { status: 500 }
    );
  }
}
```

---

## 7. Dashboard Customizado

### 7.1 Componente de Dashboard Principal

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { FluxoCaixaWidget } from '@/components/dashboard/fluxo-caixa-widget';
import { TitulosWidget } from '@/components/dashboard/titulos-widget';
import { VendasWidget } from '@/components/dashboard/vendas-widget';
import { DREWidget } from '@/components/dashboard/dre-widget';
import { ChatWidget } from '@/components/dashboard/chat-widget';
import { LoadingCard } from '@/components/ui/loading-card';

export default async function DashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>

      {/* Grid de Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Fluxo de Caixa */}
        <Suspense fallback={<LoadingCard />}>
          <FluxoCaixaWidget cnpj="12345678000199" />
        </Suspense>

        {/* Títulos a Receber */}
        <Suspense fallback={<LoadingCard />}>
          <TitulosWidget cnpj="12345678000199" tipo="receber" />
        </Suspense>

        {/* Títulos a Pagar */}
        <Suspense fallback={<LoadingCard />}>
          <TitulosWidget cnpj="12345678000199" tipo="pagar" />
        </Suspense>

        {/* Vendas */}
        <Suspense fallback={<LoadingCard />}>
          <VendasWidget cnpj="12345678000199" />
        </Suspense>

        {/* DRE */}
        <Suspense fallback={<LoadingCard />}>
          <DREWidget cnpj="12345678000199" />
        </Suspense>
      </div>

      {/* Chat com RAG */}
      <div className="mt-8">
        <ChatWidget cnpj="12345678000199" />
      </div>
    </div>
  );
}
```

### 7.2 Widget Fluxo de Caixa

```typescript
// components/dashboard/fluxo-caixa-widget.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFluxoCaixa } from '@/app/actions/f360-actions';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface FluxoCaixaWidgetProps {
  cnpj: string;
}

export async function FluxoCaixaWidget({ cnpj }: FluxoCaixaWidgetProps) {
  const dataInicio = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const dataFim = format(new Date(), 'yyyy-MM-dd');

  const result = await getFluxoCaixa(cnpj, dataInicio, dataFim);

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Erro ao carregar dados
          </p>
        </CardContent>
      </Card>
    );
  }

  const dados = result.data;
  const ultimoDia = dados[dados.length - 1];
  const penultimoDia = dados[dados.length - 2];
  
  const variacao = ultimoDia.saldo_projetado - (penultimoDia?.saldo_projetado || 0);
  const isPositivo = variacao >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Fluxo de Caixa</span>
          {isPositivo ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(ultimoDia.saldo_projetado)}
            </p>
            <p className="text-sm text-muted-foreground">
              Saldo projetado
            </p>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados}>
                <XAxis
                  dataKey="data"
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(value)
                  }
                />
                <Line
                  type="monotone"
                  dataKey="saldo_projetado"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 7.3 Widget de Chat com RAG

```typescript
// components/dashboard/chat-widget.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWidgetProps {
  cnpj: string;
}

export function ChatWidget({ cnpj }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          cnpj,
          history: messages,
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Assistente Financeiro com IA</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ScrollArea className="h-[400px] pr-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Faça uma pergunta sobre seus dados financeiros</p>
                <p className="text-sm mt-2">
                  Exemplos: "Qual o saldo de caixa hoje?", "Quais títulos vencem essa semana?"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 8. Alertas Inteligentes

### 8.1 Serviço de Alertas

```typescript
// lib/alerts/alert-service.ts
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send-email';
import { sendWebhook } from '@/lib/webhooks/send-webhook';

export interface Alert {
  id: string;
  tipo: string;
  severidade: 'low' | 'medium' | 'high' | 'critical';
  titulo: string;
  mensagem: string;
  dados: Record<string, any>;
  empresa_cnpj: string;
  created_at: Date;
}

export async function checkAlerts() {
  const alerts: Alert[] = [];

  // Verificar títulos vencidos
  alerts.push(...(await checkTitulosVencidos()));

  // Verificar fluxo de caixa negativo
  alerts.push(...(await checkFluxoCaixaNegativo()));

  // Verificar burn rate alto
  alerts.push(...(await checkBurnRateAlto()));

  // Enviar alertas
  for (const alert of alerts) {
    await sendAlert(alert);
  }

  return alerts;
}

async function checkTitulosVencidos(): Promise<Alert[]> {
  const supabase = createClient();
  const alerts: Alert[] = [];

  const { data: titulos } = await supabase
    .from('f360_titulos')
    .select('*')
    .eq('status', 'aberto')
    .lt('data_vencimento', new Date().toISOString().split('T')[0])
    .order('data_vencimento', { ascending: true });

  if (!titulos || titulos.length === 0) return alerts;

  // Agrupar por empresa
  const porEmpresa = titulos.reduce((acc, titulo) => {
    if (!acc[titulo.empresa_cnpj]) {
      acc[titulo.empresa_cnpj] = [];
    }
    acc[titulo.empresa_cnpj].push(titulo);
    return acc;
  }, {} as Record<string, any[]>);

  for (const [cnpj, titulos] of Object.entries(porEmpresa)) {
    const valorTotal = titulos.reduce((sum, t) => sum + (t.valor_aberto || 0), 0);

    alerts.push({
      id: `titulos-vencidos-${cnpj}-${Date.now()}`,
      tipo: 'titulos_vencidos',
      severidade: valorTotal > 50000 ? 'high' : 'medium',
      titulo: 'Títulos Vencidos',
      mensagem: `Você tem ${titulos.length} título(s) vencido(s) totalizando R$ ${valorTotal.toFixed(2)}`,
      dados: {
        quantidade: titulos.length,
        valorTotal,
        titulos: titulos.slice(0, 5), // Primeiros 5
      },
      empresa_cnpj: cnpj,
      created_at: new Date(),
    });
  }

  return alerts;
}

async function checkFluxoCaixaNegativo(): Promise<Alert[]> {
  const supabase = createClient();
  const alerts: Alert[] = [];

  const { data: fluxos } = await supabase
    .from('f360_fluxo_caixa')
    .select('*')
    .lt('saldo_projetado', 0)
    .gte('data', new Date().toISOString().split('T')[0])
    .lte('data', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  if (!fluxos || fluxos.length === 0) return alerts;

  // Agrupar por empresa
  const porEmpresa = fluxos.reduce((acc, fluxo) => {
    if (!acc[fluxo.empresa_cnpj]) {
      acc[fluxo.empresa_cnpj] = [];
    }
    acc[fluxo.empresa_cnpj].push(fluxo);
    return acc;
  }, {} as Record<string, any[]>);

  for (const [cnpj, fluxos] of Object.entries(porEmpresa)) {
    const menorSaldo = Math.min(...fluxos.map(f => f.saldo_projetado));

    alerts.push({
      id: `fluxo-negativo-${cnpj}-${Date.now()}`,
      tipo: 'fluxo_caixa_negativo',
      severidade: menorSaldo < -100000 ? 'critical' : 'high',
      titulo: 'Fluxo de Caixa Negativo Projetado',
      mensagem: `Seu fluxo de caixa está projetado para ficar negativo nos próximos 7 dias. Menor saldo: R$ ${menorSaldo.toFixed(2)}`,
      dados: {
        diasNegativos: fluxos.length,
        menorSaldo,
        projecao: fluxos,
      },
      empresa_cnpj: cnpj,
      created_at: new Date(),
    });
  }

  return alerts;
}

async function checkBurnRateAlto(): Promise<Alert[]> {
  const supabase = createClient();
  const alerts: Alert[] = [];

  const { data: indicadores } = await supabase
    .from('f360_indicadores')
    .select('*')
    .order('mes_referencia', { ascending: false })
    .limit(1);

  if (!indicadores || indicadores.length === 0) return alerts;

  for (const indicador of indicadores) {
    if (indicador.burn_rate && indicador.burn_rate > 100000) {
      alerts.push({
        id: `burn-rate-${indicador.empresa_cnpj}-${Date.now()}`,
        tipo: 'burn_rate_alto',
        severidade: 'high',
        titulo: 'Burn Rate Elevado',
        mensagem: `Seu burn rate está em R$ ${indicador.burn_rate.toFixed(2)}/mês. Runway: ${indicador.runway || 'N/A'}`,
        dados: {
          burnRate: indicador.burn_rate,
          runway: indicador.runway,
          mesReferencia: indicador.mes_referencia,
        },
        empresa_cnpj: indicador.empresa_cnpj,
        created_at: new Date(),
      });
    }
  }

  return alerts;
}

async function sendAlert(alert: Alert) {
  // Salvar no banco
  const supabase = createClient();
  await supabase.from('alertas').insert({
    tipo: alert.tipo,
    severidade: alert.severidade,
    titulo: alert.titulo,
    mensagem: alert.mensagem,
    dados: alert.dados,
    empresa_cnpj: alert.empresa_cnpj,
  });

  // Enviar email (se configurado)
  if (process.env.SENDGRID_API_KEY) {
    await sendEmail({
      to: 'admin@empresa.com',
      subject: `[${alert.severidade.toUpperCase()}] ${alert.titulo}`,
      html: `
        <h2>${alert.titulo}</h2>
        <p>${alert.mensagem}</p>
        <pre>${JSON.stringify(alert.dados, null, 2)}</pre>
      `,
    });
  }

  // Enviar webhook (se configurado)
  if (process.env.ALERT_WEBHOOK_URL) {
    await sendWebhook(process.env.ALERT_WEBHOOK_URL, alert);
  }

  console.log(`🚨 Alert sent: ${alert.titulo}`);
}
```

### 8.2 Cron para Verificar Alertas

```typescript
// app/api/cron/check-alerts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAlerts } from '@/lib/alerts/alert-service';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔍 Checking alerts...');

    const alerts = await checkAlerts();

    console.log(`✅ Alert check complete. Found ${alerts.length} alerts.`);

    return NextResponse.json({
      success: true,
      alertsFound: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error('❌ Alert check error:', error);
    return NextResponse.json(
      { success: false, error: 'Alert check failed' },
      { status: 500 }
    );
  }
}
```

---

## 9. Deploy e Produção

### 9.1 Deploy na Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configurar variáveis de ambiente
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add F360_API_TOKEN
vercel env add OMIE_APP_KEY
vercel env add OMIE_APP_SECRET
vercel env add OPENAI_API_KEY
vercel env add CRON_SECRET
```

### 9.2 Configuração de Crons na Vercel

```json
// vercel.json (final)
{
  "crons": [
    {
      "path": "/api/cron/sync-f360",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/sync-omie",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/cron/generate-embeddings",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/check-alerts",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

### 9.3 Monitoramento e Logs

```typescript
// lib/monitoring/logger.ts
export function logError(context: string, error: any) {
  console.error(`[ERROR] ${context}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // Enviar para serviço de monitoramento (ex: Sentry)
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(error);
  }
}

export function logInfo(context: string, data: any) {
  console.log(`[INFO] ${context}:`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

export function logPerformance(context: string, duration: number) {
  console.log(`[PERF] ${context}: ${duration}ms`);
}
```

---

## 🎯 Conclusão

Este guia técnico completo fornece:

✅ **Integração dupla** com F360 Finanças e Omie ERP  
✅ **Arquitetura moderna** com Next.js 14+ e App Router  
✅ **Cache otimizado** com Redis (Upstash)  
✅ **Sincronização automática** via Vercel Cron  
✅ **RAG avançado** com OpenAI e pgvector  
✅ **Dashboard interativo** com visualizações  
✅ **Alertas inteligentes** baseados em regras  
✅ **Pronto para produção** com best practices

### Recursos Implementados

- [x] Autenticação F360 e Omie
- [x] Schema completo PostgreSQL + pgvector
- [x] Cache Redis com invalidação
- [x] Jobs agendados (Cron)
- [x] Sistema RAG com busca semântica
- [x] Chat com IA
- [x] Dashboard customizado
- [x] Alertas inteligentes
- [x] Webhooks
- [x] Rate limiting
- [x] Logs e monitoramento

### Próximos Passos

1. Implementar autenticação de usuários (Auth.js ou Supabase Auth)
2. Adicionar testes automatizados (Jest + React Testing Library)
3. Configurar CI/CD com GitHub Actions
4. Implementar WebSockets para atualizações em tempo real
5. Adicionar mais integrações (bancos via Open Finance, etc.)
6. Expandir dashboards com mais visualizações
7. Criar relatórios PDF automatizados
8. Implementar auditoria completa de operações

**🚀 Seu SaaS de integração ERP está pronto para escalar!**
