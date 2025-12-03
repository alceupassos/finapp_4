Agora tenho informações técnicas suficientes para fornecer uma resposta completa. Deixe-me compilar todas as informações sobre a API e Webhooks do F360 Finanças.

# API e Webhooks do ERP F360 Finanças: Documentação Técnica Completa

O **F360 Finanças** oferece duas formas principais de integração: **Webhooks** para entrada de dados externos no sistema e **API Pública** para consulta e manipulação de informações. A URL base de produção para todos os endpoints da API é `https://financas.f360.com.br`[1][2].

***

## Autenticação e Configuração da Chave de API

Para utilizar a API Pública da F360, é necessário criar uma chave de API através da plataforma[2]:

1. Acesse a tela de **Webservices** no módulo F360 Finanças
2. Clique em **Criar** e selecione **API Pública da F360**
3. Informe o nome do fornecedor e defina o tipo de acesso (total ou específico)
4. A chave será exibida apenas uma vez após a criação

A documentação técnica oficial está disponível em: `https://documenter.getpostman.com/view/68066/Tz5m8Kcb`[2]

### Login e Obtenção do Token JWT

```bash
curl --location --globoff 'https://financas.f360.com.br/PublicLoginAPI/DoLogin' \
--header 'Content-Type: application/json' \
--data '{ "token": "<SUA_CHAVE_API>" }'
```

**Resposta:**
```json
{
  "Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

O token JWT retornado deve ser usado no header `Authorization: Bearer <token>` em todas as requisições subsequentes[1].

***

## Webhooks - Endpoints para Entrada de Dados

Os webhooks permitem enviar notificações HTTP em tempo real para o F360 Finanças, como registros de venda e entrada de cupons[3][4].

### Modelo de URL dos Webhooks

```
https://webhook.f360.com.br/{identificador-unico-do-servico}/{servico-consumido}
```

O **identificador-unico-do-servico** é gerado pela F360 mediante solicitação, e o **servico-consumido** define o tipo de operação[3].

***

### Webhook 1: Criação de Cupons Fiscais (f360-cupom-fiscal)

**Endpoint:** `POST https://webhook.f360.com.br/{identificador}/f360-cupom-fiscal`

**Exemplo de Requisição:**
```bash
curl --location --request POST 'https://webhook.f360.com.br/identificador-unico/f360-cupom-fiscal' \
--header 'Content-Type: application/json' \
--data-raw '{
  "NomeSistema": "Meu PDV",
  "Values": [
    {
      "NumeroCupom": "123456",
      "CNPJEmitente": "01234567000199",
      "Cliente": {
        "Nome": "João da Silva",
        "Cpf": "123.456.789-10"
      },
      "MeioPagamento": [
        {
          "FormaPagamento": "Dinheiro",
          "Valor": 71.12,
          "Bandeira": "",
          "Autorizacao": "",
          "NSU": "",
          "QtdParcelas": "1",
          "Vencimento": "2022-05-26T15:08:26"
        }
      ],
      "Data": "2022-05-26T15:08:26"
    }
  ]
}'
```

**Campos do Cupom Fiscal:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| NumeroCupom | long | Sim | Número do cupom da venda[3] |
| CNPJEmitente | string | Sim | CNPJ da loja sem pontos e traços[3] |
| Cliente | object | Não | Nome e CPF do cliente[3] |
| Data | string | Sim | Formato "yyyy-MM-ddTHH:mm:ss"[3] |
| VendaCancelada | bool | Não | true/false (padrão: false)[3] |
| ValorFrete | double | Não | Valor do frete da venda[3] |

**Campos do Objeto MeioPagamento:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| FormaPagamento | string | Sim | Forma de pagamento[3] |
| Valor | double | Sim | Valor líquido pago[3] |
| Bandeira | string | Não | Bandeira do cartão (veja tabela)[3] |
| NSU | long | Não | Código de rastreio do pagamento[3] |
| Autorizacao | string | Não | Código de autorização[3] |
| QtdParcelas | int | Não | Quantidade de parcelas (padrão: 1)[3] |
| Vencimento | string | Sim | Data de vencimento[3] |

**Objeto Parcelas (opcional):**
```json
{
  "DataDeApresentacao": "2022-05-26",
  "Valor": 19.2,
  "NumeroDaParcela": 1,
  "Vencimento": "2022-06-26"
}
```

***

### Webhook 2: Criação de Títulos (f360-titulos)

**Endpoint:** `POST https://webhook.f360.com.br/{identificador}/f360-{id}-titulos/`

Usado para criar **Contas a Pagar** e **Contas a Receber**. Apenas inserção é permitida - não há alteração ou exclusão[3].

**Exemplo de Requisição:**
```bash
curl --location --globoff 'https://webhook.f360.com.br/{identificador}/f360-{id}-titulos/' \
--header 'Content-Type: application/json' \
--data '{
  "titulos": [
    {
      "cnpj": "00.000.000/0000-00",
      "tipoTitulo": "receber",
      "numeroTitulo": "123456",
      "clienteFornecedor": "João da Silva",
      "detalhesClienteFornecedor": {
        "nome": "João da Silva",
        "cpfCnpj": "00000000000"
      },
      "emissao": "2025-01-14",
      "valor": 150,
      "tipoDocumento": "boleto",
      "contaBancaria": "nome da conta bancária",
      "meioPagamento": "boleto",
      "historico": "",
      "remessaCnab": false,
      "receitaDeCaixa": false,
      "parcelas": [{
        "vencimento": "2025-02-14",
        "valor": 150,
        "numeroParcela": 1,
        "liquidacao": null,
        "codigoDeBarras": null
      }],
      "rateio": [{
        "competencia": "02-2025",
        "centroDeCusto": "centro de custo",
        "planoDeContas": "vendas de mercadorias",
        "numeroParcela": 1,
        "valor": 150
      }]
    }
  ]
}'
```

**Campos do Objeto Título:**

| Campo | Tipo | Obrigatório | Valores Aceitos |
|-------|------|-------------|-----------------|
| cnpj | string | Sim | CNPJ da empresa[3] |
| tipoTitulo | string | Sim | "Pagar" ou "Receber"[3] |
| numeroTitulo | string | Sim | Número do título[3] |
| clienteFornecedor | string | Sim | CPF/CNPJ ou nome[3] |
| emissao | string | Sim | Formato "yyyy-MM-dd"[3] |
| valor | double | Sim | Formato "0.00"[3] |
| tipoDocumento | string | Sim | Duplicata, Boleto, Nota Fiscal, Nota De Débito, Conta De Consumo, Cupom Fiscal, Outros, Previsão[3] |
| contaBancaria | string | Sim | Nome da conta cadastrada[3] |
| meioPagamento | string | Sim | Boleto, Dinheiro, Cheque, DDA, DOC/TED, Depósito em Conta, Transferência Bancária, Débito Automático, Cartão de Crédito / Débito, Outros[3] |

**Resposta de Sucesso (HTTP 200):**
```json
{
  "rastreioId": "5737a24e-8eef-4090-9c8d-6c168af2c8a4"
}
```

**Resposta de Erro (HTTP 500):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.6.1",
  "title": "An error occurred while processing your request.",
  "status": 500,
  "traceId": "00-92255f294a1a8995227eac28b180a0a7-91d42cfdc65d5e99-00"
}
```

***

## API Pública - Endpoints de Consulta e Manipulação

### 1. Relatórios

**Gerar Relatório Contábil:**
```bash
curl --location 'https://financas.f360.com.br/PublicRelatorioAPI/GerarRelatorio' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "Data": "2021-01-01",
  "DataFim": "2021-01-17",
  "ModeloContabil": "provisao",
  "ModeloRelatorio": "gerencial",
  "ExtensaoDeArquivo": "json",
  "EnviarNotificacaoPorWebhook": false,
  "URLNotificacao": "",
  "Contas": "",
  "CNPJEmpresas": []
}'
```

**Gerar Relatório de Conciliação de Cartões:**
```bash
curl --location 'https://financas.f360.com.br/PublicRelatorioAPI/GerarRelatorioDeConciliacaoDeCartoes' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "DataInicio": "2021-11-08",
  "DataFim": "2021-11-08",
  "TipoConciliacao": "Todos",
  "EnviarNotificacaoPorWebhook": false,
  "URLNotificacao": "",
  "CNPJEmpresas": []
}'
```

**Download do Relatório:**
```bash
curl --location 'https://financas.f360.com.br/PublicRelatorioAPI/Download?id=60db204089d59e0aec5d8756' \
--header 'Authorization: Bearer <token>'
```

***

### 2. Plano de Contas

**Listar Todos os Planos de Contas:**
```bash
curl --location 'https://financas.f360.com.br/PlanoDeContasPublicAPI/ListarPlanosContas' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json'
```

**Resposta:**
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

**Criar Plano de Contas:**
```bash
curl --location 'https://financas.f360.com.br/PlanoDeContasPublicAPI/CriarPlanoDeContas' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "Nome": "Novo Plano",
  "CodigoObrigacaoContabil": "252",
  "CodigoProvisaoContabil": "111",
  "Tipo": "A receber"
}'
```

**Obter, Editar e Excluir:**
- GET: `/PlanoDeContasPublicAPI/ObterPlanoDeContas/{id}`
- PUT: `/PlanoDeContasPublicAPI/EditarPlanoDeContas/{id}`
- DELETE: `/PlanoDeContasPublicAPI/ExcluirPlanoDeContas/{id}`[1]

***

### 3. Pessoas (Clientes e Fornecedores)

**Listar Pessoas:**
```bash
curl --location 'https://financas.f360.com.br/PessoasPublicAPI/ListarPessoas?pagina=1&definicao=ambos' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json'
```

**Criar Pessoa:**
```bash
curl --location 'https://financas.f360.com.br/PessoasPublicAPI/CriarPessoa' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "Nome": "Empresa XYZ",
  "RazaoSocial": "Empresa XYZ Ltda",
  "Telefone": "(11) 99999-9999",
  "Email": "contato@empresa.com",
  "PlanoDeContaPadrao": "Vendas de Mercadorias",
  "Tipo": "Pessoa Jurídica",
  "Definicao": "Cliente",
  "CpfCnpj": "00.000.000/0001-00",
  "Endereco": {
    "Logradouro": "Rua Exemplo",
    "Numero": "123",
    "Bairro": "Centro",
    "Cidade": "São Paulo",
    "UF": "SP",
    "CEP": "01000-000"
  }
}'
```

***

### 4. Notas Fiscais

**Listar Notas:**
```bash
curl --location 'https://financas.f360.com.br/NFPublicAPI/ListarNotas?pagina=1&registro=NFe&inicio=2021-05-01&fim=2021-05-31&tipo=Emissão' \
--header 'Authorization: Bearer <token>'
```

**Obter DANFE e XML:**
```bash
# DANFE em base64
curl --location 'https://financas.f360.com.br/NFPublicAPI/ObterDanfe/{id}' \
--header 'Authorization: Bearer <token>'

# XML em base64
curl --location 'https://financas.f360.com.br/NFPublicAPI/ObterXML/{id}' \
--header 'Authorization: Bearer <token>'
```

***

### 5. Parcelas de Títulos

**Listar Parcelas:**
```bash
curl --location 'https://financas.f360.com.br/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos?pagina=1&tipo=Despesa&inicio=2021-06-01&fim=2021-06-30&tipoDatas=Emissão' \
--header 'Authorization: Bearer <token>'
```

**Parâmetros:**
- **tipo**: "Despesa", "Receita" ou "Ambos"
- **tipoDatas**: "Emissão", "Competência", "Vencimento", "Liquidação" ou "Atualização"
- **status**: "Todos", "Aberto", "AbertoAVencer", "AbertoVencidos", "Liquidado", "Baixado", etc.[1]

***

### 6. Parcelas de Cartões

**Listar Parcelas de Cartões:**
```bash
curl --location 'https://financas.f360.com.br/ParcelasDeCartoesPublicAPI/ListarParcelasDeCartoes?pagina=1&tipo=ambos&inicio=2021-03-01&fim=2021-03-30&tipoDatas=emissao' \
--header 'Authorization: Bearer <token>'
```

***

### 7. Extrato Bancário

**Obter Extrato:**
```bash
curl --location 'https://financas.f360.com.br/ExtratoBancarioPublicAPI/ObterExtratoBancario' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "DataInicio": "2022-08-22",
  "DataFim": "2022-08-22",
  "Status": "Todos",
  "ModeloRelatorio": "Sintetico",
  "Contas": ["3604cd42b874ab1940a81b5f"],
  "ExibirDetalhesConciliacao": false
}'
```

***

### 8. Gerar Movimentos de Cartão

**Inserir Movimentos:**
```bash
curl --location 'https://financas.f360.com.br/GerarMovimentosDeCartoesPublicAPI/GerarMovimentosDeCartoes' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "FileType": "Modelo de Importação dos Registros de Adquirente - Modelo Json 1.0",
  "Cartoes": [
    {
      "CodigoEstabelecimento": "1234567890001",
      "DataDaVenda": "17/01/2022",
      "TipoDeLancamento": "Débito",
      "TipoDeTransacao": "Venda",
      "TipoDeRegistro": "Venda",
      "DescricaoBandeira": "Visa",
      "DescricaoOperadora": "Cielo",
      "NSU": 123456789,
      "CodigoAutorizacao": "ABCDE",
      "TotalDeParcelas": 1,
      "Parcelas": [
        {
          "NumeroParcela": 1,
          "ValorBruto": 99.99,
          "ValorLiquido": 98.99,
          "Desconto": 1,
          "DataVencimento": "18/01/2022",
          "DataLiquidacao": null
        }
      ],
      "ValorBruto": 99.99
    }
  ]
}'
```

***

## Tabela de Bandeiras de Cartão Suportadas

O F360 suporta mais de 200 bandeiras e operadoras de cartão[3], incluindo:

**Principais Bandeiras:** Visa, MasterCard, Elo, Hipercard, Amex, Diners, JCB, Maestro, Electron, Hiper

**Vouchers/Benefícios:** Alelo, Sodexo, VR, Ticket, Ben Visa Vale, PlanVale, GreenCard, Coopercard

**Pagamentos Digitais:** PIX, Mercado Pago, PicPay, PagSeguro, PayPal, Ame Digital, Stone, iFood, Rappi, Uber Eats

**Operadoras:** Cielo, Rede, GetNet, Stone, PagSeguro, Adyen, Safrapay, entre outras[3]

***

## Regras de Validação para Títulos via Webhook

1. Todo título deve ter pelo menos uma parcela e um rateio[3]
2. O rateio deve corresponder a uma parcela existente[3]
3. A soma dos valores das parcelas deve corresponder ao valor do título[3]
4. A soma dos valores dos rateios da mesma parcela deve corresponder ao valor da parcela[3]
5. Lançamentos do mesmo cupom fiscal devem ser enviados em uma única request para evitar duplicações[3]

***

## Notificações via Webhook (Callback)

É possível configurar URLs de notificação para receber callbacks quando relatórios estiverem prontos[1]:

```json
{
  "EnviarNotificacaoPorWebhook": true,
  "URLNotificacao": "https://seu-servidor.com/webhook/callback"
}
```

Essa funcionalidade é essencial para integrações assíncronas, já que o processamento de relatórios é feito em background através de filas de mensagens[1].

