const BASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
function getSupabaseAccessToken(): string | null {
  const raw = localStorage.getItem('supabase_session')
  if (!raw) return null
  try { return JSON.parse(raw).access_token || null } catch { return null }
}

async function restGet(path: string, opts: { query?: Record<string, string> } = {}) {
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
  if (!res.ok) throw new Error(`Supabase GET ${path} failed: ${res.status}`)
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
  if (!res.ok) throw new Error(`Supabase POST ${path} failed: ${res.status}`)
  return res.json()
}

export const SupabaseRest = {
  restGet,
  restPost,
  getCompanies: async () => {
    // Buscar empresas únicas de dre_entries e cashflow_entries
    const dreRows = await restGet('dre_entries', { query: { select: 'company_cnpj,company_nome', limit: '1000' } })
    const dfcRows = await restGet('cashflow_entries', { query: { select: 'company_cnpj,company_nome', limit: '1000' } })
    
    const empresasMap = new Map()
    
    ;[...dreRows, ...dfcRows].forEach((row: any) => {
      const cnpj = row.company_cnpj
      if (!empresasMap.has(cnpj)) {
        empresasMap.set(cnpj, {
          cnpj,
          cliente_nome: row.company_nome,
          grupo_empresarial: row.company_nome.includes('VOLPE') ? 'Grupo Volpe' : 'Outros'
        })
      }
    })
    
    return Array.from(empresasMap.values()).sort((a, b) => a.cnpj.localeCompare(b.cnpj))
  },
  getDRE: async (cnpj: string) => {
    const cnpj14 = (cnpj || '').replace(/^0+/, '')
    const rows = await restGet('dre_entries', { query: { company_cnpj: `eq.${cnpj14}`, select: '*' } })
    if (!Array.isArray(rows)) return []
    return rows.map((r: any) => ({
      data: r.date || r.data,
      conta: r.account ?? r.conta ?? 'Conta',
      natureza: r.nature ?? r.natureza ?? null,
      valor: Number(r.amount ?? r.valor ?? 0)
    }))
  },
  getDFC: async (cnpj: string) => {
    const cnpj14 = (cnpj || '').replace(/^0+/, '')
    const rows = await restGet('cashflow_entries', { query: { company_cnpj: `eq.${cnpj14}`, select: '*' } })
    if (!Array.isArray(rows)) return []
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
  log: (item: { level: 'info'|'warn'|'error'; service: 'UI'|'API'|'Edge'; endpoint?: string; companyCnpj?: string; userId?: string; message: string; latencyMs?: number }) => restPost('app_logs', { ...item, ts: new Date().toISOString() })
}
