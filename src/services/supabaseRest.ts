import { getSupabaseAccessToken } from './auth'

const BASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

async function restGet(path: string, opts: { query?: Record<string, string> } = {}) {
  const url = new URL(`${BASE_URL}/rest/v1/${path}`)
  Object.entries(opts.query || {}).forEach(([k, v]) => url.searchParams.set(k, v))
  const token = getSupabaseAccessToken()
  const res = await fetch(url.toString(), {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token || ANON_KEY}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Supabase GET ${path} failed: ${res.status}`)
  return res.json()
}

async function restPost(path: string, body: unknown, query?: Record<string,string>) {
  const urlObj = new URL(`${BASE_URL}/rest/v1/${path}`)
  Object.entries(query || {}).forEach(([k,v])=> urlObj.searchParams.set(k,v))
  const url = urlObj.toString()
  const token = getSupabaseAccessToken()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token || ANON_KEY}`,
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
  getCompanies: () => restGet('integration_f360', { query: { select: 'cliente_nome,cnpj' } }),
  getDRE: (cnpj: string) => restGet('dre_entries', { query: { company_cnpj: `eq.${cnpj}`, select: '*' } }),
  getDFC: (cnpj: string) => restGet('cashflow_entries', { query: { company_cnpj: `eq.${cnpj}`, select: '*' } }),
  log: (item: { level: 'info'|'warn'|'error'; service: 'UI'|'API'|'Edge'; endpoint?: string; companyCnpj?: string; userId?: string; message: string; latencyMs?: number }) => restPost('app_logs', { ...item, ts: new Date().toISOString() })
}
