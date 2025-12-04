/**
 * F360 Import Service - Serviço unificado para importação F360
 * Suporta tokens SINGLE (empresa única) e GROUP (grupo de empresas)
 */

import { createClient } from '@supabase/supabase-js'

const F360_BASE_URL = 'https://financas.f360.com.br'

interface F360LoginResponse {
  Token: string
}

interface F360PlanoContas {
  PlanoDeContasId: string
  Nome: string
  CodigoObrigacaoContabil?: string
  Tipo: 'A receber' | 'A pagar'
}

interface F360ContaBancaria {
  Id: string
  Nome: string
  CNPJ?: string
  cnpj?: string
}

interface F360RelatorioEntry {
  DataDoLcto?: string
  ContaADebito?: string
  ContaACredito?: string
  ValorLcto?: number
  CNPJEmpresa?: string
  DataCompetencia?: string
  NomePlanoDeContas?: string
  IdPlanoDeContas?: string
  Tipo?: boolean
  Liquidacao?: string
  ComplemHistorico?: string
  CentroDeCusto?: string
  NumeroTitulo?: string
  [key: string]: unknown
}

interface F360Response<T> {
  Result?: T[]
  Ok?: boolean
  data?: T[]
  value?: T[]
}

type ImportMode = 'SINGLE' | 'GROUP'

interface ImportResult {
  success: boolean
  mode: ImportMode
  companiesFound: number
  chartOfAccountsCount: number
  dreEntriesCount: number
  dfcEntriesCount: number
  accountingEntriesCount: number
  errors: string[]
}

/**
 * Cliente HTTP para API F360 com retry e rate limiting
 */
export class F360Client {
  private jwtToken: string | null = null
  private jwtExpiry: number = 0
  private loginToken: string
  private baseUrl: string

  constructor(loginToken: string, baseUrl: string = F360_BASE_URL) {
    this.loginToken = loginToken
    this.baseUrl = baseUrl
  }

  /**
   * Login na API F360 e obtenção do JWT
   */
  async login(maxRetries = 3): Promise<string> {
    // Verificar se JWT ainda é válido (com margem de 5 minutos)
    if (this.jwtToken && Date.now() < this.jwtExpiry - 5 * 60 * 1000) {
      return this.jwtToken
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/PublicLoginAPI/DoLogin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FinApp/1.0',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ token: this.loginToken }),
        })

        if (!response.ok) {
          const text = await response.text()
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            continue
          }
          throw new Error(`F360 Login failed: ${response.status} - ${text}`)
        }

        const data: F360LoginResponse = await response.json()
        this.jwtToken = data.Token || null

        if (!this.jwtToken) {
          throw new Error('Token JWT não retornado na resposta')
        }

        // JWT geralmente expira em 1 hora
        this.jwtExpiry = Date.now() + 3600 * 1000
        return this.jwtToken
      } catch (error) {
        if (attempt === maxRetries) {
          throw error
        }
      }
    }

    throw new Error('Login failed after all retries')
  }

  /**
   * Requisição genérica para API F360 com retry
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries = 3
  ): Promise<T> {
    const jwt = await this.login()

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
            'User-Agent': 'FinApp/1.0',
            'Accept': 'application/json',
            ...options.headers,
          },
        })

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          const errorMsg = `F360 ${endpoint}: ${response.status} - ${text}`

          // Retry em caso de erro 429 (rate limit) ou 500+
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }

          throw new Error(errorMsg)
        }

        return response.json()
      } catch (error) {
        if (attempt === maxRetries) {
          throw error
        }
      }
    }

    throw new Error('Request failed after all retries')
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
   * Listar Contas Bancárias (usado para descobrir CNPJs em grupos)
   */
  async getContasBancarias(): Promise<F360ContaBancaria[]> {
    const response = await this.request<F360Response<F360ContaBancaria>>(
      '/ContaBancariaPublicAPI/ListarContasBancarias'
    )
    return response.Result || response.data || []
  }

  /**
   * Gerar Relatório Contábil
   */
  async gerarRelatorio(params: {
    dataInicio: string
    dataFim: string
    modeloContabil?: 'provisao' | 'obrigacao'
    modeloRelatorio?: 'tradicional' | 'gerencial'
    extensaoArquivo?: 'json' | 'csv'
    cnpjEmpresas?: string[]
  }): Promise<string> {
    const body = {
      Data: params.dataInicio,
      DataFim: params.dataFim,
      ModeloContabil: params.modeloContabil || 'provisao',
      ModeloRelatorio: params.modeloRelatorio || 'gerencial',
      ExtensaoDeArquivo: params.extensaoArquivo || 'json',
      EnviarNotificacaoPorWebhook: false,
      URLNotificacao: '',
      Contas: '',
      CNPJEmpresas: params.cnpjEmpresas || [],
    }

    const response = await this.request<{ Result?: string; Ok?: boolean }>(
      '/PublicRelatorioAPI/GerarRelatorio',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    )

    if (!response.Ok || !response.Result) {
      throw new Error(`Falha ao gerar relatório: ${JSON.stringify(response)}`)
    }

    return response.Result
  }

  /**
   * Verificar status do relatório
   */
  async verificarStatusRelatorio(relatorioId: string): Promise<string> {
    try {
      await this.request(`/PublicRelatorioAPI/Download?id=${relatorioId}`)
      return 'Finalizado'
    } catch (error: any) {
      if (error.message?.includes("status 'Aguardando'")) return 'Aguardando'
      if (error.message?.includes("status 'Processando'")) return 'Processando'
      if (error.message?.includes("status 'Erro'")) return 'Erro'
      throw error
    }
  }

  /**
   * Baixar relatório gerado
   */
  async baixarRelatorio(
    relatorioId: string,
    maxTentativas = 30
  ): Promise<F360RelatorioEntry[]> {
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      const status = await this.verificarStatusRelatorio(relatorioId)

      if (status === 'Finalizado') {
        const response = await this.request<F360RelatorioEntry[]>(
          `/PublicRelatorioAPI/Download?id=${relatorioId}`
        )

        if (Array.isArray(response)) {
          return response
        }
        if (typeof response === 'object') {
          return [response as F360RelatorioEntry]
        }
        throw new Error('Formato de resposta inesperado')
      }

      if (status === 'Aguardando' || status === 'Processando') {
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }

      if (status === 'Erro') {
        throw new Error('Relatório falhou no processamento')
      }
    }

    throw new Error('Relatório não disponível após todas as tentativas')
  }
}

/**
 * Importador para token de empresa única (SINGLE)
 */
export class F360SingleImporter {
  private client: F360Client
  private supabase: ReturnType<typeof createClient>
  private companyCnpj: string
  private companyId: string

  constructor(
    client: F360Client,
    supabase: ReturnType<typeof createClient>,
    companyCnpj: string,
    companyId: string
  ) {
    this.client = client
    this.supabase = supabase
    this.companyCnpj = companyCnpj
    this.companyId = companyId
  }

  /**
   * Importar plano de contas
   */
  async importChartOfAccounts(): Promise<number> {
    const planos = await this.client.getPlanoContas(this.companyCnpj)

    if (planos.length === 0) return 0

    const inserts = planos.map((plano) => ({
      company_id: this.companyId,
      code: plano.PlanoDeContasId || '',
      name: plano.Nome || '',
      type: plano.Tipo === 'A receber' ? 'RECEITA' : 'DESPESA',
      parent_code: null,
      level: 1,
      accepts_entries: true,
    }))

    const { error } = await this.supabase
      .from('chart_of_accounts')
      .upsert(inserts, { onConflict: 'company_id,code' })

    if (error) throw error

    return inserts.length
  }

  /**
   * Processar e salvar entradas do relatório
   */
  async processRelatorioEntries(
    entries: F360RelatorioEntry[]
  ): Promise<{ dre: number; dfc: number; accounting: number }> {
    const dreEntries: any[] = []
    const dfcEntries: any[] = []
    const accountingEntries: any[] = []

    for (const entry of entries) {
      // Normalizar CNPJ (remover formatação)
      const cnpj = this.normalizeCnpj(entry.CNPJEmpresa || this.companyCnpj)
      
      // Data de competência ou data do lançamento
      const competenciaDate = entry.DataCompetencia
        ? this.parseDate(entry.DataCompetencia)
        : entry.DataDoLcto
        ? this.parseDate(entry.DataDoLcto)
        : new Date()

      const valor = parseFloat(String(entry.ValorLcto || 0))
      if (valor === 0) continue

      // Determinar natureza (receita/despesa)
      const natureza = entry.Tipo === false ? 'despesa' : 'receita'

      // DRE Entry
      const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'
      dreEntries.push({
        company_id: this.companyId,
        company_cnpj: cnpj,
        date: competenciaDate.toISOString().split('T')[0],
        account: account,
        account_code: entry.IdPlanoDeContas || null,
        natureza: natureza,
        valor: valor,
        description: entry.ComplemHistorico || entry.NumeroTitulo || '',
        source_erp: 'F360',
        source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
      })

      // DFC Entry (se tiver data de liquidação)
      if (entry.Liquidacao) {
        const liquidacaoDate = this.parseDate(entry.Liquidacao)
        dfcEntries.push({
          company_id: this.companyId,
          company_cnpj: cnpj,
          date: liquidacaoDate.toISOString().split('T')[0],
          kind: natureza === 'receita' ? 'in' : 'out',
          category: account,
          amount: valor,
          bank_account: null,
          description: entry.ComplemHistorico || entry.NumeroTitulo || '',
          source_erp: 'F360',
          source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
        })
      }

      // Accounting Entry (lançamento bruto)
      accountingEntries.push({
        company_id: this.companyId,
        entry_date: competenciaDate.toISOString().split('T')[0],
        competence_date: competenciaDate.toISOString().split('T')[0],
        description: entry.ComplemHistorico || entry.NumeroTitulo || '',
        account_code: entry.IdPlanoDeContas || account,
        debit_amount: natureza === 'despesa' ? valor : 0,
        credit_amount: natureza === 'receita' ? valor : 0,
        cost_center: entry.CentroDeCusto || null,
        source_erp: 'F360',
        source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
      })
    }

    // Salvar no banco
    let dreCount = 0
    let dfcCount = 0
    let accountingCount = 0

    if (dreEntries.length > 0) {
      const { error } = await this.supabase
        .from('dre_entries')
        .upsert(dreEntries, { onConflict: 'company_cnpj,date,account,natureza' })
      if (error) throw error
      dreCount = dreEntries.length
    }

    if (dfcEntries.length > 0) {
      const { error } = await this.supabase
        .from('dfc_entries')
        .upsert(dfcEntries, { onConflict: 'company_cnpj,date,kind,category,bank_account' })
      if (error) throw error
      dfcCount = dfcEntries.length
    }

    if (accountingEntries.length > 0) {
      const { error } = await this.supabase.from('accounting_entries').insert(accountingEntries)
      if (error) throw error
      accountingCount = accountingEntries.length
    }

    return { dre: dreCount, dfc: dfcCount, accounting: accountingCount }
  }

  private normalizeCnpj(cnpj: string): string {
    return cnpj.replace(/\D/g, '')
  }

  private parseDate(dateStr: string): Date {
    // Tenta vários formatos
    if (dateStr.includes('T')) {
      return new Date(dateStr)
    }
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/')
      return new Date(`${year}-${month}-${day}`)
    }
    return new Date(dateStr)
  }
}

/**
 * Importador para token de grupo (GROUP)
 */
export class F360GroupImporter {
  private client: F360Client
  private supabase: ReturnType<typeof createClient>
  private groupToken: string
  private expectedCnpjs: string[]

  constructor(
    client: F360Client,
    supabase: ReturnType<typeof createClient>,
    groupToken: string,
    expectedCnpjs: string[]
  ) {
    this.client = client
    this.supabase = supabase
    this.groupToken = groupToken
    this.expectedCnpjs = expectedCnpjs
  }

  /**
   * Descobrir CNPJs associados ao token via contas bancárias
   */
  async discoverCompanies(): Promise<Array<{ cnpj: string; name?: string }>> {
    const contas = await this.client.getContasBancarias()
    const cnpjs = new Set<string>()

    for (const conta of contas) {
      const cnpj = this.normalizeCnpj(conta.CNPJ || conta.cnpj || '')
      if (cnpj && cnpj.length === 14) {
        cnpjs.add(cnpj)
      }
    }

    return Array.from(cnpjs).map((cnpj) => ({ cnpj }))
  }

  /**
   * Mapear CNPJ para company_id no banco
   */
  async getCompanyId(cnpj: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('companies')
      .select('id')
      .eq('cnpj', cnpj)
      .single()

    if (error || !data) return null
    return data.id
  }

  /**
   * Processar relatório de grupo e distribuir por empresa
   */
  async processGroupRelatorio(
    entries: F360RelatorioEntry[]
  ): Promise<{ dre: number; dfc: number; accounting: number }> {
    // Criar mapa de CNPJ -> company_id
    const cnpjToCompanyId = new Map<string, string>()

    for (const cnpj of this.expectedCnpjs) {
      const companyId = await this.getCompanyId(this.normalizeCnpj(cnpj))
      if (companyId) {
        cnpjToCompanyId.set(this.normalizeCnpj(cnpj), companyId)
      }
    }

    // Processar entradas
    const dreEntries: any[] = []
    const dfcEntries: any[] = []
    const accountingEntries: any[] = []

    for (const entry of entries) {
      const entryCnpj = this.normalizeCnpj(entry.CNPJEmpresa || '')
      
      // Se não tiver CNPJ na entrada, usar primeira empresa esperada (consolidado)
      const targetCnpj = entryCnpj && cnpjToCompanyId.has(entryCnpj)
        ? entryCnpj
        : this.normalizeCnpj(this.expectedCnpjs[0])

      const companyId = cnpjToCompanyId.get(targetCnpj)
      if (!companyId) continue

      const competenciaDate = entry.DataCompetencia
        ? this.parseDate(entry.DataCompetencia)
        : entry.DataDoLcto
        ? this.parseDate(entry.DataDoLcto)
        : new Date()

      const valor = parseFloat(String(entry.ValorLcto || 0))
      if (valor === 0) continue

      const natureza = entry.Tipo === false ? 'despesa' : 'receita'
      const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'

      // DRE Entry
      dreEntries.push({
        company_id: companyId,
        company_cnpj: targetCnpj,
        date: competenciaDate.toISOString().split('T')[0],
        account: account,
        account_code: entry.IdPlanoDeContas || null,
        natureza: natureza,
        valor: valor,
        description: entry.ComplemHistorico || entry.NumeroTitulo || '',
        source_erp: 'F360',
        source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
      })

      // DFC Entry
      if (entry.Liquidacao) {
        const liquidacaoDate = this.parseDate(entry.Liquidacao)
        dfcEntries.push({
          company_id: companyId,
          company_cnpj: targetCnpj,
          date: liquidacaoDate.toISOString().split('T')[0],
          kind: natureza === 'receita' ? 'in' : 'out',
          category: account,
          amount: valor,
          bank_account: null,
          description: entry.ComplemHistorico || entry.NumeroTitulo || '',
          source_erp: 'F360',
          source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
        })
      }

      // Accounting Entry
      accountingEntries.push({
        company_id: companyId,
        entry_date: competenciaDate.toISOString().split('T')[0],
        competence_date: competenciaDate.toISOString().split('T')[0],
        description: entry.ComplemHistorico || entry.NumeroTitulo || '',
        account_code: entry.IdPlanoDeContas || account,
        debit_amount: natureza === 'despesa' ? valor : 0,
        credit_amount: natureza === 'receita' ? valor : 0,
        cost_center: entry.CentroDeCusto || null,
        source_erp: 'F360',
        source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
      })
    }

    // Salvar no banco
    let dreCount = 0
    let dfcCount = 0
    let accountingCount = 0

    if (dreEntries.length > 0) {
      const { error } = await this.supabase
        .from('dre_entries')
        .upsert(dreEntries, { onConflict: 'company_cnpj,date,account,natureza' })
      if (error) throw error
      dreCount = dreEntries.length
    }

    if (dfcEntries.length > 0) {
      const { error } = await this.supabase
        .from('dfc_entries')
        .upsert(dfcEntries, { onConflict: 'company_cnpj,date,kind,category,bank_account' })
      if (error) throw error
      dfcCount = dfcEntries.length
    }

    if (accountingEntries.length > 0) {
      const { error } = await this.supabase.from('accounting_entries').insert(accountingEntries)
      if (error) throw error
      accountingCount = accountingEntries.length
    }

    return { dre: dreCount, dfc: dfcCount, accounting: accountingCount }
  }

  private normalizeCnpj(cnpj: string): string {
    return cnpj.replace(/\D/g, '')
  }

  private parseDate(dateStr: string): Date {
    if (dateStr.includes('T')) {
      return new Date(dateStr)
    }
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/')
      return new Date(`${year}-${month}-${day}`)
    }
    return new Date(dateStr)
  }
}

/**
 * Serviço principal de importação F360
 */
export class F360ImportService {
  private client: F360Client
  private supabase: ReturnType<typeof createClient>

  constructor(
    token: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.client = new F360Client(token)
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Detectar modo automaticamente (SINGLE ou GROUP)
   */
  async detectMode(): Promise<{ mode: ImportMode; companies: Array<{ cnpj: string; name?: string }> }> {
    const companies = await this.client.getContasBancarias()
    const cnpjs = new Set<string>()

    for (const conta of companies) {
      const cnpj = (conta.CNPJ || conta.cnpj || '').replace(/\D/g, '')
      if (cnpj && cnpj.length === 14) {
        cnpjs.add(cnpj)
      }
    }

    const uniqueCnpjs = Array.from(cnpjs)
    return {
      mode: uniqueCnpjs.length <= 1 ? 'SINGLE' : 'GROUP',
      companies: uniqueCnpjs.map((cnpj) => ({ cnpj })),
    }
  }

  /**
   * Importar dados para empresa única
   */
  async importSingle(
    companyCnpj: string,
    dataInicio: string,
    dataFim: string
  ): Promise<ImportResult> {
    const errors: string[] = []

    try {
      // Buscar company_id
      const { data: company, error: companyError } = await this.supabase
        .from('companies')
        .select('id')
        .eq('cnpj', companyCnpj.replace(/\D/g, ''))
        .single()

      if (companyError || !company) {
        throw new Error(`Empresa não encontrada: ${companyCnpj}`)
      }

      const importer = new F360SingleImporter(
        this.client,
        this.supabase,
        companyCnpj,
        company.id
      )

      // Importar plano de contas
      let chartOfAccountsCount = 0
      try {
        chartOfAccountsCount = await importer.importChartOfAccounts()
      } catch (error: any) {
        errors.push(`Erro ao importar plano de contas: ${error.message}`)
      }

      // Gerar e baixar relatório
      const relatorioId = await this.client.gerarRelatorio({
        dataInicio,
        dataFim,
        modeloContabil: 'provisao',
        modeloRelatorio: 'gerencial',
        extensaoArquivo: 'json',
        cnpjEmpresas: [companyCnpj],
      })

      const entries = await this.client.baixarRelatorio(relatorioId)

      // Processar entradas
      const { dre, dfc, accounting } = await importer.processRelatorioEntries(entries)

      return {
        success: true,
        mode: 'SINGLE',
        companiesFound: 1,
        chartOfAccountsCount,
        dreEntriesCount: dre,
        dfcEntriesCount: dfc,
        accountingEntriesCount: accounting,
        errors,
      }
    } catch (error: any) {
      errors.push(error.message)
      return {
        success: false,
        mode: 'SINGLE',
        companiesFound: 0,
        chartOfAccountsCount: 0,
        dreEntriesCount: 0,
        dfcEntriesCount: 0,
        accountingEntriesCount: 0,
        errors,
      }
    }
  }

  /**
   * Importar dados para grupo de empresas
   */
  async importGroup(
    expectedCnpjs: string[],
    dataInicio: string,
    dataFim: string
  ): Promise<ImportResult> {
    const errors: string[] = []

    try {
      const importer = new F360GroupImporter(
        this.client,
        this.supabase,
        this.client['loginToken'],
        expectedCnpjs
      )

      // Descobrir empresas
      const discovered = await importer.discoverCompanies()
      const companiesFound = discovered.length

      // Gerar relatório para todas empresas (CNPJEmpresas vazio)
      const relatorioId = await this.client.gerarRelatorio({
        dataInicio,
        dataFim,
        modeloContabil: 'provisao',
        modeloRelatorio: 'gerencial',
        extensaoArquivo: 'json',
        cnpjEmpresas: [], // Vazio = todas empresas do grupo
      })

      const entries = await this.client.baixarRelatorio(relatorioId)

      // Processar entradas
      const { dre, dfc, accounting } = await importer.processGroupRelatorio(entries)

      // Importar plano de contas para primeira empresa (compartilhado)
      let chartOfAccountsCount = 0
      if (expectedCnpjs.length > 0) {
        try {
          const planos = await this.client.getPlanoContas()
          const firstCompanyId = await importer.getCompanyId(
            expectedCnpjs[0].replace(/\D/g, '')
          )

          if (firstCompanyId && planos.length > 0) {
            const inserts = planos.map((plano) => ({
              company_id: firstCompanyId,
              code: plano.PlanoDeContasId || '',
              name: plano.Nome || '',
              type: plano.Tipo === 'A receber' ? 'RECEITA' : 'DESPESA',
              parent_code: null,
              level: 1,
              accepts_entries: true,
            }))

            const { error } = await this.supabase
              .from('chart_of_accounts')
              .upsert(inserts, { onConflict: 'company_id,code' })

            if (!error) chartOfAccountsCount = inserts.length
          }
        } catch (error: any) {
          errors.push(`Erro ao importar plano de contas: ${error.message}`)
        }
      }

      return {
        success: true,
        mode: 'GROUP',
        companiesFound,
        chartOfAccountsCount,
        dreEntriesCount: dre,
        dfcEntriesCount: dfc,
        accountingEntriesCount: accounting,
        errors,
      }
    } catch (error: any) {
      errors.push(error.message)
      return {
        success: false,
        mode: 'GROUP',
        companiesFound: 0,
        chartOfAccountsCount: 0,
        dreEntriesCount: 0,
        dfcEntriesCount: 0,
        accountingEntriesCount: 0,
        errors,
      }
    }
  }
}

