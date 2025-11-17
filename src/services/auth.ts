import { SupabaseRest } from './supabaseRest'

export type Role = 'admin'|'franqueado'|'cliente'|'personalizado'
export type Session = {
  id: string
  email: string
  name: string
  role: Role
  defaultCompany?: string | null
  mode: 'supabase'|'demo'
  accessToken: string
}

export const USE_DEMO = (import.meta.env.VITE_USE_DEMO === 'true')
export let lastLoginError = ''

export async function gotruePasswordSignIn(email: string, password: string) {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!url || !anon) throw new Error('Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes')
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon, Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    try {
      const err = await res.json()
      lastLoginError = String(err.error_description || err.error || `HTTP ${res.status}`)
    } catch {
      lastLoginError = `HTTP ${res.status}`
    }
    return null
  }
  lastLoginError = ''
  return res.json()
}

export async function loginSupabase(email: string, password: string): Promise<Session | null> {
  try {
    const data = await gotruePasswordSignIn(email, password)
    if (!data || !data.access_token) return null
    localStorage.setItem('supabase_session', JSON.stringify(data))
    const user = { id: data.user?.id || 'unknown', email }
    const session: Session = {
      id: user.id,
      email: user.email || email,
      name: (user.email || email).split('@')[0],
      role: 'cliente',
      defaultCompany: null,
      mode: 'supabase',
      accessToken: data.access_token,
    }
    localStorage.setItem('session_user', JSON.stringify(session))
    return session
  } catch {
    return null
  }
}

export function getSession(): Session | null {
  const raw = localStorage.getItem('session_user')
  return raw ? JSON.parse(raw) : null
}

export function getSupabaseAccessToken(): string | null {
  const raw = localStorage.getItem('supabase_session')
  if (!raw) return null
  try { return JSON.parse(raw).access_token || null } catch { return null }
}

export function logout() {
  localStorage.removeItem('session_user')
  localStorage.removeItem('supabase_session')
}

export async function verifySupabaseDataAccess() {
  try {
    const companies = await SupabaseRest.getCompanies()
    const ok = Array.isArray(companies) && companies.length > 0
    return { ok, count: ok ? companies.length : 0 }
  } catch (err: any) {
    return { ok: false, error: String(err) }
  }
}