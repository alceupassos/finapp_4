/**
 * F360 Service - Cliente TypeScript para API F360 Finanças
 * Baseado na documentação oficial e testes confirmados
 */

const F360_BASE_URL = 'https://financas.f360.com.br'

interface F360LoginResponse {
  Token: string
}

interface F360PlanoContas {
  PlanoDeContasId: string
  Nome: string
  CodigoObrigacaoContabil?: string
  Tipo: 'A receber' | 'A pagar'
  CodigosPorFornecedor?: string[]
}

interface F360ContaBancaria {
  Id: string
  Nome: string
  TipoDeConta: string
  Agencia: string
  Conta: string
  DigitoConta: string
  NumeroBanco: number
}

interface F360ParcelaTitulo {
  ParcelaId: string
  TituloId: string
  NumeroTitulo: string
  TipoTitulo: 'Despesa' | 'Receita'
  ClienteFornecedor: string
  DataEmissao: string
  DataVencimento: string
  DataLiquidacao?: string
  Valor: number
  ValorLiquido: number
  PlanoDeContas?: string
  CentroDeCusto?: string
  Competencia?: string
}

interface F360Response<T> {
  Result?: T[]
  Ok?: boolean
  data?: T[]
  value?: T[]
}

export class F360Service {
  private jwtToken: string | null = null
  private jwtExpiry: number = 0
  private loginToken: string

  constructor(loginToken: string) {
    this.loginToken = loginToken
  }

  /**
   * Login na API F360 e obtenção do JWT
   */
  async login(): Promise<string | null> {
    // Verificar se JWT ainda é válido (com margem de 5 minutos)
    if (this.jwtToken && Date.now() < this.jwtExpiry - 5 * 60 * 1000) {
      return this.jwtToken
    }

    try {
      const response = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: this.loginToken }),
      })

      if (!response.ok) {
        throw new Error(`F360 Login failed: ${response.status} ${response.statusText}`)
      }

      const data: F360LoginResponse = await response.json()
      this.jwtToken = data.Token || null
      
      // JWT geralmente expira em 1 hora (3600 segundos)
      this.jwtExpiry = Date.now() + 3600 * 1000

      return this.jwtToken
    } catch (error) {
      console.error('F360 Login error:', error)
      return null
    }
  }

  /**
   * Requisição genérica para API F360
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const jwt = await this.login()
    if (!jwt) {
      throw new Error('F360 authentication failed')
    }

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${F360_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`F360 API ${endpoint}: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Listar Planos de Contas
   */
  async getPlanoContas(cnpj?: string): Promise<F360PlanoContas[]> {
    const params = cnpj ? `?cnpj=${cnpj}` : ''
    const response = await this.request<F360Response<F360PlanoContas>>(
      `/PlanoDeContasPublicAPI/ListarPlanosContas${params}`
    )
    return response.Result || response.data || []
  }

  /**
   * Listar Contas Bancárias
   */
  async getContasBancarias(): Promise<F360ContaBancaria[]> {
    const response = await this.request<F360Response<F360ContaBancaria>>(
      '/ContaBancariaPublicAPI/ListarContasBancarias'
    )
    return response.Result || response.data || []
  }

  /**
   * Listar Parcelas de Títulos
   */
  async getParcelasTitulos(params: {
    cnpj?: string
    dataInicio: string // yyyy-MM-dd
    dataFim: string // yyyy-MM-dd
    tipo?: 'Despesa' | 'Receita' | 'Ambos'
    tipoDatas?: 'Emissão' | 'Competência' | 'Vencimento' | 'Liquidação' | 'Atualização'
    pagina?: number
  }): Promise<F360ParcelaTitulo[]> {
    const queryParams = new URLSearchParams()
    if (params.cnpj) queryParams.set('cnpj', params.cnpj)
    queryParams.set('dataInicio', params.dataInicio)
    queryParams.set('dataFim', params.dataFim)
    queryParams.set('tipo', params.tipo || 'Ambos')
    queryParams.set('tipoDatas', params.tipoDatas || 'Emissão')
    queryParams.set('pagina', String(params.pagina || 1))

    const response = await this.request<F360Response<F360ParcelaTitulo>>(
      `/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos?${queryParams.toString()}`
    )
    return response.Result || response.data || []
  }

  /**
   * Gerar Relatório Contábil (DRE/DFC)
   */
  async gerarRelatorio(params: {
    dataInicio: string // yyyy-MM-dd
    dataFim: string // yyyy-MM-dd
    modeloContabil?: 'provisao' | 'obrigacao'
    modeloRelatorio?: 'tradicional' | 'gerencial'
    extensaoArquivo?: 'json' | 'csv'
    cnpjEmpresas?: string[]
  }): Promise<{ id?: string; url?: string; status?: string }> {
    const body = {
      Data: params.dataInicio,
      DataFim: params.dataFim,
      ModeloContabil: params.modeloContabil || 'provisao',
      ModeloRelatorio: params.modeloRelatorio || 'gerencial',
      ExtensaoDeArquivo: params.extensaoArquivo || 'json',
      CNPJEmpresas: params.cnpjEmpresas || [],
      EnviarNotificacaoPorWebhook: false,
      URLNotificacao: '',
    }

    return this.request(`${F360_BASE_URL}/PublicRelatorioAPI/GerarRelatorio`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Listar todas as parcelas de títulos para um período (com paginação automática)
   */
  async getAllParcelasTitulos(params: {
    cnpj?: string
    dataInicio: string
    dataFim: string
    tipo?: 'Despesa' | 'Receita' | 'Ambos'
    tipoDatas?: 'Emissão' | 'Competência' | 'Vencimento' | 'Liquidação' | 'Atualização'
  }): Promise<F360ParcelaTitulo[]> {
    const allResults: F360ParcelaTitulo[] = []
    let pagina = 1
    let hasMore = true

    while (hasMore) {
      const results = await this.getParcelasTitulos({
        ...params,
        pagina,
      })

      allResults.push(...results)

      // Se retornou menos de 100, provavelmente é a última página
      hasMore = results.length >= 100
      pagina++

      // Delay para evitar rate limiting
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    return allResults
  }
}

export default F360Service

