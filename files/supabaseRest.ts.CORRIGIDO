const BASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const MATRIZ_CNPJ = (import.meta.env.VITE_CNPJ_MATRIZ || '26888098000159') as string

function getSupabaseAccessToken(): string | null {
  const raw = localStorage.getItem('supabase_session')
  if (!raw) return null
  try { return JSON.parse(raw).access_token || null } catch { return null }
}

async function restGet(path: string, opts: { query?: Record<string, string> } = {}) {
  // ✅ FIX: Verificação de variáveis de ambiente
  if (!BASE_URL || !ANON_KEY) {
    console.error('❌ Variáveis Supabase ausentes:', { BASE_URL: !!BASE_URL, ANON_KEY: !!ANON_KEY })
    throw new Error('Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes')
  }
  
  const url = new URL(`${BASE_URL}/rest/v1/${path}`)
  Object.entries(opts.query || {}).forEach(([k, v]) => url.searchParams.set(k, v))
  const token = getSupabaseAccessToken() || ANON_KEY
  const res = await fetch(url.toString(), {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    // ✅ FIX: Log detalhado do erro
    const errorText = await res.text().catch(() => '')
    console.error(`❌ Supabase GET ${path} failed:`, res.status, errorText)
    throw new Error(`Supabase GET ${path} failed: ${res.status} - ${errorText}`)
  }
  return res.json()
}

async function restPost(path: string, body: unknown) {
  const url = `${BASE_URL}/rest/v1/${path}`
  const token = getSupabaseAccessToken() || ANON_KEY
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    console.error(`❌ Supabase POST ${path} failed:`, res.status, errorText)
    throw new Error(`Supabase POST ${path} failed: ${res.status} - ${errorText}`)
  }
  return res.json()
}

export const SupabaseRest = {
  restGet,
  restPost,
  
  // ✅ NOVO: Buscar empresas do usuário pela tabela user_companies
  getUserCompanies: async (userId: string): Promise<string[]> => {
    try {
      const rows = await restGet('user_companies', { 
        query: { 
          user_id: `eq.${userId}`, 
          select: 'company_cnpj',
          limit: '100' 
        } 
      })
      if (!Array.isArray(rows)) return []
      const cnpjs = rows.map((r: any) => r.company_cnpj).filter(Boolean)
      console.log('✅ getUserCompanies encontrou', cnpjs.length, 'empresas para usuário', userId)
      return cnpjs
    } catch (err: any) {
      console.warn('⚠️ Erro ao buscar empresas do usuário:', err?.message || err)
      return []
    }
  },
  
  // ✅ FIX: getCompanies não busca mais coluna inexistente
  getCompanies: async () => {
    const cnpj14 = MATRIZ_CNPJ.replace(/^0+/, '')
    try {
      // ✅ FIX: Buscar apenas colunas que existem na tabela
      const rows = await restGet('integration_f360', { 
        query: { 
          select: 'cliente_nome,cnpj',  // Removido grupo_empresarial
          cnpj: `eq.${cnpj14}`, 
          limit: '10' 
        } 
      })
      if (Array.isArray(rows) && rows.length) {
        // Adicionar grupo_empresarial como fallback
        return rows.map((r: any) => ({
          grupo_empresarial: r.grupo_empresarial || 'Grupo Volpe',  // Fallback
          cliente_nome: r.cliente_nome || r.nome || 'Empresa',
          cnpj: r.cnpj || cnpj14
        }))
      }
    } catch (err: any) {
      console.warn('⚠️ Erro ao buscar empresas de integration_f360:', err?.message || err)
    }
    // Fallback: construir a empresa padrão
    return [{ grupo_empresarial: 'Grupo Volpe', cliente_nome: 'Volpe Matriz', cnpj: cnpj14 }]
  },
  
  getDRE: async (cnpj: string) => {
    const cnpj14 = (cnpj || MATRIZ_CNPJ).replace(/^0+/, '')
    const rows = await restGet('dre_entries', { query: { company_cnpj: `eq.${cnpj14}`, select: '*', limit: '5000' } })
    if (!Array.isArray(rows)) return []
    console.log('🔍 getDRE recebeu', rows.length, 'registros para CNPJ', cnpj14);
    return rows.map((r: any) => ({
      data: r.date || r.data,
      conta: r.account ?? r.conta ?? 'Conta',
      natureza: r.nature ?? r.natureza ?? null,
      valor: Number(r.amount ?? r.valor ?? 0)
    }))
  },
  
  getDFC: async (cnpj: string) => {
    const cnpj14 = (cnpj || MATRIZ_CNPJ).replace(/^0+/, '')
    const rows = await restGet('cashflow_entries', { query: { company_cnpj: `eq.${cnpj14}`, select: '*', limit: '5000' } })
    if (!Array.isArray(rows)) return []
    console.log('🔍 getDFC recebeu', rows.length, 'registros para CNPJ', cnpj14);
    // Se já estiver no formato esperado, retorne direto
    if (rows.length && (rows[0].entrada !== undefined || rows[0].saida !== undefined)) return rows
    // Caso contrário, transformar de (date, kind, category, amount) -> (data, descricao, entrada, saida, saldo)
    const sorted = [...rows].sort((a: any, b: any) => new Date(a.date || a.data).getTime() - new Date(b.date || b.data).getTime())
    let running = 0
    return sorted.map((r: any) => {
      const entrada = String(r.kind || '').toLowerCase() === 'in' ? Number(r.amount || 0) : 0
      const saida = String(r.kind || '').toLowerCase() === 'out' ? Number(r.amount || 0) : 0
      running += (entrada - saida)
      return {
        data: r.date || r.data,
        descricao: r.category || r.descricao || 'Lançamento',
        entrada,
        saida,
        saldo: running,
        id: r.id ?? undefined,
      }
    })
  },
  
  log: (item: { level: 'info'|'warn'|'error'; service: 'UI'|'API'|'Edge'; endpoint?: string; companyCnpj?: string; userId?: string; message: string; latencyMs?: number }) => {
    // ✅ FIX: Não falhar se log falhar
    return restPost('app_logs', { ...item, ts: new Date().toISOString() }).catch(err => {
      console.warn('⚠️ Falha ao enviar log:', err?.message || err)
      return null
    })
  }
}
