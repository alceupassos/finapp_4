# Documentação Completa da API Omie

## Visão Geral

A API Omie foi desenvolvida para oferecer flexibilidade e eficiência na integração de sistemas e automatização de processos, permitindo que você conecte suas soluções diretamente ao Omie ERP. A API utiliza o protocolo de comunicação SOAP e JSON, com todas as solicitações realizadas pelo método POST.

**Portal Oficial:** https://developer.omie.com.br

---

## 1. Autenticação

### 1.1 Credenciais Necessárias

Toda requisição à API Omie requer os seguintes dados de autenticação:

- **App Key:** Chave pública de identificação da aplicação
- **App Secret:** Chave privada/senha de autenticação da aplicação

### 1.2 Obtendo as Credenciais

#### Método 1: Via "Meus Aplicativos"

1. Acesse o site do Omie (https://www.omie.com.br)
2. Faça login com suas credenciais
3. Na página inicial, clique no ícone de engrenagem (⚙️)
4. Selecione "Resumo do App"
5. Localize o campo "Chave de Integração (API)"
6. Copie o **App Key** e clique em "Exibir" para visualizar o **App Secret**

#### Método 2: Via Portal Developer

1. Acesse https://developer.omie.com.br
2. Faça login com suas credenciais
3. Clique no botão "Aplicativos"
4. Selecione o aplicativo desejado para expandir as informações
5. Encontre as credenciais **App Key** e **App Secret**

**Nota Importante:** Apenas usuários administradores conseguem obter a chave de integração. Ao redefinir a chave de acesso, todas as integrações ativas deixarão de funcionar.

---

## 2. Estrutura de Requisições

### 2.1 Formato Base

```json
{
  "call": "NomeDaMétodo",
  "app_key": "XXXXXXXXXXXXXX",
  "app_secret": "XXXXXXXXXXXXXXXXX",
  "param": [
    {
      "campo1": "valor1",
      "campo2": "valor2"
    }
  ]
}
```

### 2.2 Método HTTP

- **Método:** POST
- **Content-Type:** application/json
- **Endpoint Base:** https://app.omie.com.br/api/v1/

### 2.3 Exemplo de Requisição com cURL

```bash
curl -X POST https://app.omie.com.br/api/v1/geral/clientes/ \
  -H "Content-Type: application/json" \
  -d '{
    "call": "ListarClientes",
    "app_key": "SEU_APP_KEY",
    "app_secret": "SEU_APP_SECRET",
    "param": [
      {
        "pagina": 1,
        "registros_por_pagina": 50,
        "apenas_importado_api": "N"
      }
    ]
  }'
```

---

## 3. Rate Limiting (Limites de Consumo)

O Omie implementa os seguintes limites de consumo de API (Rate Limit):

- **960 requisições por minuto por Endereço IP**
- **240 requisições por minuto por Endereço IP + App Key + Método**
- **4 requisições simultâneas por Endereço IP + App Key + Método**

Quando algum limite é ultrapassado, a API retorna o erro "Too many requests". É recomendado implementar lógica de retry com backoff exponencial.

---

## 4. Estrutura de Respostas

### 4.1 Resposta de Sucesso

```json
{
  "codigo_status": "0",
  "descricao_status": "Operação realizada com sucesso",
  "total_de_paginas": 1,
  "pagina_atual": 1,
  "total_de_registros": 10,
  "registros_por_pagina": 50,
  "clientes_cadastro": [
    {
      "codigo": "1",
      "codigo_cliente_omie": "1",
      "codigo_cliente_integracao": "ERP001",
      "nome_fantasia": "Empresa Exemplo"
    }
  ]
}
```

### 4.2 Resposta de Erro

```json
{
  "codigo_status": "-1",
  "descricao_status": "Descrição do erro ocorrido"
}
```

### 4.3 Códigos de Status

| Código | Significado |
|--------|-------------|
| 0 | Sucesso |
| -1 | Erro genérico |
| 400 | Erro na requisição (JSON inválido, parâmetros faltantes) |
| 401 | Credenciais inválidas (App Key ou App Secret) |
| 429 | Rate limit excedido |
| 500 | Erro no servidor |

---

## 5. Paginação

### 5.1 Parâmetros de Paginação

Ao listar registros, utilize os seguintes parâmetros:

```json
{
  "pagina": 1,
  "registros_por_pagina": 50,
  "apenas_importado_api": "N"
}
```

### 5.2 Campos de Resposta

- **pagina_atual:** Página atual retornada
- **total_de_paginas:** Número total de páginas disponíveis
- **total_de_registros:** Número total de registros
- **registros_por_pagina:** Quantidade de registros por página (máx. 500)

### 5.3 Exemplo de Iteração

```python
pagina = 1
total_paginas = 1

while pagina <= total_paginas:
    response = fazer_requisicao(pagina)
    total_paginas = response['total_de_paginas']
    processar_dados(response['clientes_cadastro'])
    pagina += 1
```

---

## 6. Módulos e Endpoints Disponíveis

### 6.1 Geral

#### Clientes e Fornecedores
- `ListarClientes` - Listar todos os clientes
- `ConsultarCliente` - Consultar cliente específico
- `IncluirCliente` - Criar novo cliente
- `AlterarCliente` - Alterar dados do cliente
- `ExcluirCliente` - Excluir cliente

**Endpoint:** `/geral/clientes/`

#### Produtos
- `ListarProdutos` - Listar todos os produtos
- `ConsultarProduto` - Consultar produto específico
- `IncluirProduto` - Criar novo produto
- `AlterarProduto` - Alterar dados do produto

**Endpoint:** `/geral/produtos/`

#### Categorias
- `ListarCategoria` - Listar todas as categorias
- `ConsultarCategoria` - Consultar categoria específica
- `IncluirCategoria` - Criar nova categoria
- `AlterarCategoria` - Alterar dados da categoria

**Endpoint:** `/geral/categorias/`

#### Cadastros Auxiliares
- **Vendedores:** `/geral/vendedores/`
- **Tabela de Preços:** `/geral/tabelapreco/`
- **Características de Produtos:** `/geral/produtocaracteristica/`
- **NCM:** `/geral/ncm/`
- **Meios de Pagamento:** `/geral/meiopagamento/`

### 6.2 Vendas e Nota Fiscal Eletrônica

#### Pedidos de Venda
- `ListarPedidos` - Listar pedidos de venda
- `ConsultarPedido` - Consultar pedido específico
- `IncluirPedido` - Criar novo pedido
- `AlterarPedido` - Alterar dados do pedido
- `ExcluirPedido` - Excluir pedido

**Endpoint:** `/produtos/pedido/`

#### Nota Fiscal Eletrônica (NF-e)
- `ListarNFe` - Listar notas fiscais eletrônicas
- `ImportarNFe` - Importar NF-e (XML)
- `ObterDocumentos` - Obter PDF e XML de documentos fiscais

**Endpoint:** `/nfe/` e `/nfce/`

#### Cupom Fiscal e NFC-e
- `AdicionarCupom` - Adicionar cupom fiscal/NFC-e
- `CancelarCupom` - Cancelar cupom fiscal
- `ConsultarCupom` - Consultar informações do cupom

**Endpoint:** `/cupomfiscal/`

### 6.3 Compras, Estoque e Produção

#### Pedidos de Compra
- `ListarPedidoCompra` - Listar pedidos de compra
- `IncluirPedCompra` - Criar novo pedido de compra
- `AlterarPedCompra` - Alterar pedido de compra

**Endpoint:** `/produtos/pedidocompra/`

#### Estoque
- `ConsultarEstoque` - Consultar saldo de estoque
- `ListarEstoque` - Listar estoque geral
- `MovimentarEstoque` - Realizar movimentações manuais

**Endpoint:** `/estoque/`

#### Produtos - Variações e Lotes
- **Variações:** `/geral/produtovariacao/`
- **Lotes:** `/geral/produtolote/`
- **Kit:** `/geral/produtokit/`

### 6.4 Serviços e NFS-e

#### Serviços
- `ListarCadastroServico` - Listar serviços cadastrados
- `IncluirServico` - Criar novo serviço
- `AlterarServico` - Alterar dados do serviço

**Endpoint:** `/servicos/servico/`

#### Ordens de Serviço
- `ListarOrdens` - Listar ordens de serviço
- `IncluirOrdem` - Criar nova ordem de serviço
- `AlterarOrdem` - Alterar ordem de serviço

**Endpoint:** `/servicos/ordens/`

#### Contratos de Serviço
- `ListarContratos` - Listar contratos de serviço
- `IncluirContrato` - Criar novo contrato

**Endpoint:** `/servicos/contrato/`

#### Nota Fiscal de Serviço (NFS-e)
- `IncluirNFSe` - Gerar nova NFS-e

**Endpoint:** `/nfse/`

### 6.5 Transporte

#### Conhecimento de Transporte Eletrônico (CT-e)
- `ListarCTe` - Listar conhecimentos de transporte
- `ImportarCTe` - Importar CT-e (XML)
- `CancelarCTe` - Cancelar CT-e

**Endpoint:** `/cte/`

### 6.6 Finanças

#### Contas a Pagar
- `ListarContasPagar` - Listar contas a pagar
- `ConsultarContaPagar` - Consultar conta específica
- `IncluirContaPagar` - Incluir nova conta a pagar
- `AlterarContaPagar` - Alterar conta a pagar
- `ExcluirContaPagar` - Excluir conta a pagar

**Endpoint:** `/financas/contapagar/`

#### Contas a Receber
- `ListarContasReceber` - Listar contas a receber
- `ConsultarContaReceber` - Consultar conta específica
- `IncluirContaReceber` - Incluir nova conta a receber
- `AlterarContaReceber` - Alterar conta a receber

**Endpoint:** `/financas/contareceber/`

#### Contas Correntes (Bancárias)
- `ListarContasCorrentes` - Listar contas bancárias
- `UpsertContaCorrente` - Criar ou atualizar conta

**Endpoint:** `/financas/contacorrente/`

#### Lançamentos Financeiros
- `IncluirLancamentoCC` - Incluir lançamento em conta corrente
- `AlterarLancamentoCC` - Alterar lançamento
- `ExcluirLancamentoCC` - Excluir lançamento

**Endpoint:** `/financas/contacorrente/`

---

## 7. Tratamento de Erros Comuns

### 7.1 Erros de Autenticação

**"Invalid JSON Object" ou "JSON request with SyntaxError"**
- Causa: Parâmetro faltante, aspas não fechadas, chaves/colchetes inválidos
- Solução: Validar a estrutura JSON antes de enviar

**"Os dados de autenticação informados são inválidos"**
- Causa: App Key ou App Secret inválidos
- Solução: Verificar credenciais no Portal Developer

**"OMIE - A chave de acesso está inválida ou o aplicativo está suspenso"**
- Causa: Aplicativo suspenso ou credenciais expiradas
- Solução: Verificar status do aplicativo ou regenerar chaves

**"Omie API is not enabled"**
- Causa: API não habilitada para o aplicativo
- Solução: Habilitar API nas configurações do aplicativo

### 7.2 Erros de Requisição

**"Too many requests"**
- Causa: Rate limit excedido
- Solução: Implementar backoff exponencial e respeitar limites de consumo

**"Não existem registros para a página [X]"**
- Causa: Página solicitada não existe
- Solução: Verificar total_de_paginas antes de fazer requisição

**"SOAP-ERROR: Broken response from Application Service"**
- Causa: Falha temporária de conexão
- Solução: Retentar a requisição após alguns segundos

---

## 8. Webhooks

### 8.1 Configuração de Webhooks

Webhooks permitem receber notificações em tempo real quando eventos ocorrem no Omie.

#### Ativando Webhooks

1. Acesse https://developer.omie.com.br
2. Clique em "Aplicativos"
3. Selecione o aplicativo desejado
4. Clique em "⚙️ Adicionar novo webhook"
5. Cole a URL do seu endpoint
6. Selecione os eventos que deseja receber
7. Clique em "Salvar"

### 8.2 Características Técnicas dos Webhooks

- **Método de Envio:** POST
- **Formato:** JSON
- **Agrupamento:** Eventos são agrupados por aplicativo e endpoint
- **Processamento:** Sequencial (FIFO - First In, First Out)
- **Retry:** O Omie faz tentativas de envio em caso de falha

### 8.3 Recomendações de Implementação

1. **Aceite e Armazene:** O endpoint deve retornar um código HTTP 2XX o mais rápido possível
2. **Processamento Posterior:** Armazene os dados para processamento posterior
3. **Garantia de Entrega:** Evite perda de notificações por tentativas malsucedidas

### 8.4 Eventos Disponíveis

Os webhooks podem ser configurados para os seguintes eventos:

- Criação/Alteração de Clientes
- Criação/Alteração de Produtos
- Criação/Alteração de Pedidos
- Criação/Alteração de Notas Fiscais
- Criação/Alteração de Serviços
- Criação/Alteração de Contas Financeiras
- E muitos outros...

---

## 9. Importação de Documentos Fiscais

### 9.1 Importação de NF-e

A importação de NF-e requer conversão prévia do XML.

#### Etapas de Conversão

1. **Remover Acentos:** Remover caracteres acentuados (^, ~, ´, `)
2. **Substituir Caracteres Especiais:**
   - `&` → `&amp;`
   - `<` → `&lt;`
   - `>` → `&gt;`
   - `'` → `&apos;`
   - `"` → `&quot;`

3. **Gerar MD5:** Calcular hash MD5 do XML convertido

#### Método de Requisição

```json
{
  "call": "ImportarNFe",
  "app_key": "SEU_APP_KEY",
  "app_secret": "SEU_APP_SECRET",
  "param": [
    {
      "cXmlNFe": "XML_CONVERTIDO_E_CODIFICADO",
      "cMd5Xml": "HASH_MD5_DO_XML",
      "lNaoGerarTitulo": false,
      "lNaoIncluirCliente": false,
      "lNaoIncluirProduto": true
    }
  ]
}
```

**Endpoint:** `/nfe/`

### 9.2 Importação de CT-e

Processo similar ao da NF-e, com o mesmo tratamento de caracteres especiais.

**Endpoint:** `/cte/`

### 9.3 Configurações Prévias

Antes de importar documentos, configure:
- Categoria para registros importados
- Conta corrente para movimentações
- Local de estoque
- Projeto (se aplicável)
- Vendedor associado

---

## 10. Operações CRUD Básicas

### 10.1 CREATE (Incluir)

```json
{
  "call": "IncluirCliente",
  "app_key": "SEU_APP_KEY",
  "app_secret": "SEU_APP_SECRET",
  "param": [
    {
      "nome_fantasia": "Empresa Exemplo",
      "razao_social": "Empresa Exemplo LTDA",
      "cnpj_cpf": "00.000.000/0000-00",
      "email": "contato@empresa.com"
    }
  ]
}
```

### 10.2 READ (Listar/Consultar)

```json
{
  "call": "ListarClientes",
  "app_key": "SEU_APP_KEY",
  "app_secret": "SEU_APP_SECRET",
  "param": [
    {
      "pagina": 1,
      "registros_por_pagina": 50
    }
  ]
}
```

### 10.3 UPDATE (Alterar)

```json
{
  "call": "AlterarCliente",
  "app_key": "SEU_APP_KEY",
  "app_secret": "SEU_APP_SECRET",
  "param": [
    {
      "codigo_cliente_omie": "1",
      "nome_fantasia": "Novo Nome",
      "email": "novo@empresa.com"
    }
  ]
}
```

### 10.4 DELETE (Excluir)

```json
{
  "call": "ExcluirCliente",
  "app_key": "SEU_APP_KEY",
  "app_secret": "SEU_APP_SECRET",
  "param": [
    {
      "codigo_cliente_omie": "1"
    }
  ]
}
```

---

## 11. SDK e Bibliotecas

### 11.1 SDK Python

**Instalação:**
```bash
pip install api-omie
```

**Exemplo de Uso:**
```python
from omieapi import Omie

omie_app = Omie('sua_app_key', 'seu_app_secret')
response = omie_app.listar_produtos(pagina=1)
print(response)
```

**Ativando Logs para Depuração:**
```python
omie_app = Omie('sua_app_key', 'seu_app_secret', log=True)
```

### 11.2 SDK PHP

Existem bibliotecas PHP disponíveis no Packagist para integração com a API Omie.

### 11.3 Gerador Não Oficial de Documentações

**GitHub:** https://github.com/giuliano-macedo/omie-docs

Gera documentações OpenAPI, coleções do Postman e coleções do Bruno.

---

## 12. Ferramentas de Teste

### 12.1 Portal Developer

O Portal Developer (https://developer.omie.com.br) oferece:
- Documentação interativa
- Teste de requisições
- Exemplos de código
- Visualização de respostas

### 12.2 Postman

**Configuração para JSON:**
1. Tipo: POST
2. URL: https://app.omie.com.br/api/v1/{modulo}/{endpoint}/
3. Header: Content-Type: application/json
4. Body: JSON com credenciais e parâmetros

**Configuração para SOAP:**
1. Adicionar header: SOAPAction com a mesma URL
2. Body em formato XML/SOAP
3. Content-Type: application/json

---

## 13. Boas Práticas

### 13.1 Segurança

- Nunca compartilhe App Key e App Secret
- Armazene credenciais em variáveis de ambiente
- Regenere chaves periodicamente
- Use HTTPS para todas as requisições
- Implemente validação de integridade de dados

### 13.2 Performance

- Utilize paginação para grandes volumes de dados
- Implemente cache local quando apropriado
- Respeite os limites de rate limit
- Use requisições em lote quando disponível
- Implemente retry com backoff exponencial

### 13.3 Tratamento de Erros

- Sempre verifique o código de status
- Implemente tratamento específico por tipo de erro
- Log detalhado de requisições e respostas
- Notifique responsáveis sobre falhas críticas
- Mantenha histórico de integração para auditoria

---

## 14. Casos de Uso Comuns

### 14.1 Integração de E-commerce

1. Listar produtos do Omie
2. Sincronizar preços e estoque
3. Receber pedidos do e-commerce
4. Criar pedidos de venda no Omie
5. Monitorar via webhooks

### 14.2 Sistema de CRM

1. Sincronizar clientes
2. Listar pedidos de vendas
3. Atualizar informações de contato
4. Integrar dados financeiros

### 14.3 Automação Financeira

1. Importar notas fiscais
2. Gerar contas a pagar/receber
3. Conciliação bancária
4. Relatórios financeiros

### 14.4 Gestão de Estoque

1. Consultar saldos de estoque
2. Realizar movimentações
3. Controle de lotes e validade
4. Alertas de reposição

---

## 15. Suporte e Recursos Adicionais

### 15.1 Contatos

- **Chat:** Disponível no Omie ERP
- **Email:** Suporte via portal
- **Portal de Ajuda:** https://ajuda.omie.com.br

### 15.2 Documentação Oficial

- **Portal Developer:** https://developer.omie.com.br
- **Centro de Ajuda:** https://ajuda.omie.com.br
- **API Playground:** Disponível no Portal Developer

### 15.3 Comunidade

- GitHub repositories com exemplos
- Stack Overflow (tag: omie-api)
- Fóruns de integração

---

## 16. Histórico de Versões

- **v1 (Atual):** API padrão utilizada para todas as operações
- Futuros atualizações serão informadas no Portal Developer

---

**Última Atualização:** 2025-11-12
**Versão da API:** v1
**Status:** Ativa e em produção
