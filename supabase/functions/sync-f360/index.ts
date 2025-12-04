import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const F360_BASE_URL = 'https://financas.f360.com.br'

interface F360LoginResponse {
  Token: string
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
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/sync-f360', '')

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Rota: POST /sync-f360 (sincronizar empresa única)
    if (req.method === 'POST' && path === '' || path === '/') {
      const { cnpj, dataInicio, dataFim } = await req.json()

      if (!cnpj) {
        return new Response(
          JSON.stringify({ error: 'CNPJ é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Buscar empresa e token
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, cnpj, token_f360')
        .eq('cnpj', cnpj.replace(/\D/g, ''))
        .single()

      if (companyError || !company || !company.token_f360) {
        return new Response(
          JSON.stringify({ error: 'Empresa não encontrada ou sem token F360' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Login F360
      const loginResponse = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: company.token_f360 }),
      })

      if (!loginResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Falha no login F360' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { Token: jwt } = await loginResponse.json() as F360LoginResponse

      // Gerar relatório
      const relatorioBody = {
        Data: dataInicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        DataFim: dataFim || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        ModeloContabil: 'provisao',
        ModeloRelatorio: 'gerencial',
        ExtensaoDeArquivo: 'json',
        EnviarNotificacaoPorWebhook: false,
        URLNotificacao: '',
        Contas: '',
        CNPJEmpresas: [cnpj.replace(/\D/g, '')],
      }

      const relatorioResponse = await fetch(`${F360_BASE_URL}/PublicRelatorioAPI/GerarRelatorio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(relatorioBody),
      })

      if (!relatorioResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Falha ao gerar relatório' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { Result: relatorioId } = await relatorioResponse.json() as { Result?: string; Ok?: boolean }

      if (!relatorioId) {
        return new Response(
          JSON.stringify({ error: 'ID do relatório não retornado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Aguardar processamento e baixar relatório
      let relatorioData: F360RelatorioEntry[] = []
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        try {
          const downloadResponse = await fetch(`${F360_BASE_URL}/PublicRelatorioAPI/Download?id=${relatorioId}`, {
            headers: { 'Authorization': `Bearer ${jwt}` },
          })

          if (downloadResponse.ok) {
            relatorioData = await downloadResponse.json() as F360RelatorioEntry[]
            break
          }
        } catch {
          // Continuar tentando
        }
      }

      if (relatorioData.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Relatório não disponível após aguardar' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Processar e salvar entradas
      const dreEntries: any[] = []
      const dfcEntries: any[] = []
      const accountingEntries: any[] = []

      for (const entry of relatorioData) {
        const valor = parseFloat(String(entry.ValorLcto || 0))
        if (valor === 0) continue

        const competenciaDate = entry.DataCompetencia
          ? new Date(entry.DataCompetencia.split('/').reverse().join('-'))
          : entry.DataDoLcto
          ? new Date(entry.DataDoLcto.split('/').reverse().join('-'))
          : new Date()

        const natureza = entry.Tipo === false ? 'despesa' : 'receita'
        const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'

        dreEntries.push({
          company_id: company.id,
          company_cnpj: cnpj.replace(/\D/g, ''),
          date: competenciaDate.toISOString().split('T')[0],
          account: account,
          account_code: entry.IdPlanoDeContas || null,
          natureza: natureza,
          valor: valor,
          description: entry.ComplemHistorico || entry.NumeroTitulo || '',
          source_erp: 'F360',
          source_id: entry.NumeroTitulo || entry.IdPlanoDeContas || null,
        })

        if (entry.Liquidacao) {
          const liquidacaoDate = new Date(entry.Liquidacao)
          dfcEntries.push({
            company_id: company.id,
            company_cnpj: cnpj.replace(/\D/g, ''),
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

        accountingEntries.push({
          company_id: company.id,
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
      if (dreEntries.length > 0) {
        await supabase.from('dre_entries').upsert(dreEntries, {
          onConflict: 'company_cnpj,date,account,natureza',
        })
      }

      if (dfcEntries.length > 0) {
        await supabase.from('dfc_entries').upsert(dfcEntries, {
          onConflict: 'company_cnpj,date,kind,category,bank_account',
        })
      }

      if (accountingEntries.length > 0) {
        await supabase.from('accounting_entries').insert(accountingEntries)
      }

      // Registrar log
      await supabase.from('import_logs').insert({
        company_id: company.id,
        import_type: 'MANUAL',
        status: 'SUCESSO',
        records_processed: relatorioData.length,
        records_imported: dreEntries.length + dfcEntries.length + accountingEntries.length,
      })

      return new Response(
        JSON.stringify({
          success: true,
          cnpj,
          dreEntries: dreEntries.length,
          dfcEntries: dfcEntries.length,
          accountingEntries: accountingEntries.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rota: POST /sync-f360/group (sincronizar grupo)
    if (req.method === 'POST' && path === '/group') {
      const { token, expectedCnpjs, dataInicio, dataFim } = await req.json()

      if (!token || !expectedCnpjs || !Array.isArray(expectedCnpjs)) {
        return new Response(
          JSON.stringify({ error: 'Token e expectedCnpjs são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Login F360
      const loginResponse = await fetch(`${F360_BASE_URL}/PublicLoginAPI/DoLogin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!loginResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Falha no login F360' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { Token: jwt } = await loginResponse.json() as F360LoginResponse

      // Gerar relatório para todas empresas (CNPJEmpresas vazio)
      const relatorioBody = {
        Data: dataInicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        DataFim: dataFim || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        ModeloContabil: 'provisao',
        ModeloRelatorio: 'gerencial',
        ExtensaoDeArquivo: 'json',
        EnviarNotificacaoPorWebhook: false,
        URLNotificacao: '',
        Contas: '',
        CNPJEmpresas: [], // Vazio = todas empresas do grupo
      }

      const relatorioResponse = await fetch(`${F360_BASE_URL}/PublicRelatorioAPI/GerarRelatorio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(relatorioBody),
      })

      if (!relatorioResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Falha ao gerar relatório' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { Result: relatorioId } = await relatorioResponse.json() as { Result?: string; Ok?: boolean }

      if (!relatorioId) {
        return new Response(
          JSON.stringify({ error: 'ID do relatório não retornado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Aguardar e baixar relatório
      let relatorioData: F360RelatorioEntry[] = []
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        try {
          const downloadResponse = await fetch(`${F360_BASE_URL}/PublicRelatorioAPI/Download?id=${relatorioId}`, {
            headers: { 'Authorization': `Bearer ${jwt}` },
          })

          if (downloadResponse.ok) {
            relatorioData = await downloadResponse.json() as F360RelatorioEntry[]
            break
          }
        } catch {
          // Continuar tentando
        }
      }

      if (relatorioData.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Relatório não disponível após aguardar' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Criar mapa de CNPJ -> company_id
      const cnpjToCompanyId = new Map<string, string>()
      for (const cnpj of expectedCnpjs) {
        const normalizedCnpj = cnpj.replace(/\D/g, '')
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('cnpj', normalizedCnpj)
          .single()

        if (company) {
          cnpjToCompanyId.set(normalizedCnpj, company.id)
        }
      }

      // Processar entradas
      const dreEntries: any[] = []
      const dfcEntries: any[] = []
      const accountingEntries: any[] = []

      for (const entry of relatorioData) {
        const entryCnpj = (entry.CNPJEmpresa || '').replace(/\D/g, '')
        const targetCnpj = entryCnpj && cnpjToCompanyId.has(entryCnpj)
          ? entryCnpj
          : expectedCnpjs[0].replace(/\D/g, '')

        const companyId = cnpjToCompanyId.get(targetCnpj)
        if (!companyId) continue

        const valor = parseFloat(String(entry.ValorLcto || 0))
        if (valor === 0) continue

        const competenciaDate = entry.DataCompetencia
          ? new Date(entry.DataCompetencia.split('/').reverse().join('-'))
          : entry.DataDoLcto
          ? new Date(entry.DataDoLcto.split('/').reverse().join('-'))
          : new Date()

        const natureza = entry.Tipo === false ? 'despesa' : 'receita'
        const account = entry.NomePlanoDeContas || entry.ContaADebito || entry.ContaACredito || 'Outros'

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

        if (entry.Liquidacao) {
          const liquidacaoDate = new Date(entry.Liquidacao)
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
      if (dreEntries.length > 0) {
        await supabase.from('dre_entries').upsert(dreEntries, {
          onConflict: 'company_cnpj,date,account,natureza',
        })
      }

      if (dfcEntries.length > 0) {
        await supabase.from('dfc_entries').upsert(dfcEntries, {
          onConflict: 'company_cnpj,date,kind,category,bank_account',
        })
      }

      if (accountingEntries.length > 0) {
        await supabase.from('accounting_entries').insert(accountingEntries)
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'GROUP',
          companiesFound: cnpjToCompanyId.size,
          dreEntries: dreEntries.length,
          dfcEntries: dfcEntries.length,
          accountingEntries: accountingEntries.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rota: GET /sync-f360/status
    if (req.method === 'GET' && path === '/status') {
      const { company_id } = Object.fromEntries(url.searchParams)

      if (!company_id) {
        return new Response(
          JSON.stringify({ error: 'company_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('company_id', company_id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Rota não encontrada' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
});

