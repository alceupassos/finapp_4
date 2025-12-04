import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const F360_BASE_URL = 'https://financas.f360.com.br'

interface F360LoginResponse {
  Token: string
}

interface F360ContaBancaria {
  Id: string
  Nome: string
  CNPJ?: string
  cnpj?: string
}

interface F360Response<T> {
  Result?: T[]
  Ok?: boolean
  data?: T[]
}

Deno.serve(async (req: Request) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token F360 é obrigatório' }),
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

    // Listar contas bancárias para descobrir CNPJs
    const contasResponse = await fetch(`${F360_BASE_URL}/ContaBancariaPublicAPI/ListarContasBancarias`, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    })

    if (!contasResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Falha ao listar contas bancárias' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const contasData = await contasResponse.json() as F360Response<F360ContaBancaria>
    const contas = contasData.Result || contasData.data || []

    // Extrair CNPJs únicos
    const cnpjs = new Set<string>()
    for (const conta of contas) {
      const cnpj = (conta.CNPJ || conta.cnpj || '').replace(/\D/g, '')
      if (cnpj && cnpj.length === 14) {
        cnpjs.add(cnpj)
      }
    }

    const uniqueCnpjs = Array.from(cnpjs)
    const mode = uniqueCnpjs.length <= 1 ? 'SINGLE' : 'GROUP'

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        companiesFound: uniqueCnpjs.length,
        cnpjs: uniqueCnpjs,
        accounts: contas.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
});

