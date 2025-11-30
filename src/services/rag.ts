const BASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

function getSupabaseAccessToken(): string | null {
  const raw = localStorage.getItem('supabase_session')
  if (!raw) return null
  try { return JSON.parse(raw).access_token || null } catch { return null }
}

async function restGet(path: string, query: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}/rest/v1/${path}`)
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
  const token = getSupabaseAccessToken() || ANON_KEY
  const res = await fetch(url.toString(), { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`)
  return res.json()
}

async function restPost(path: string, body: unknown) {
  const url = `${BASE_URL}/rest/v1/${path}`
  const token = getSupabaseAccessToken() || ANON_KEY
  const res = await fetch(url, { method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`)
  return res.json()
}

export const RagService = {
  getStatus: async () => {
    try {
      const rows = await restGet('rag_cache', { select: 'id,updated_at,items_count', limit: '1', order: 'updated_at.desc' })
      return Array.isArray(rows) && rows.length ? rows[0] : null
    } catch { return null }
  },
  refresh: async () => {
    try {
      await restPost('rpc/refresh_rag_cache', {})
      return true
    } catch { return false }
  }
}

