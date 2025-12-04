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
export let lastAuthBase = ''
export let lastAuthUrl = ''

export async function gotruePasswordSignIn(email: string, password: string) {
  const raw = import.meta.env.VITE_SUPABASE_URL as string
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!raw || !anon) throw new Error('Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes')
  const base = raw.replace(/\/$/, '').replace(/\/rest\/v1$/, '')
  const url = `${base}/auth/v1/token?grant_type=password`
  lastAuthBase = base
  lastAuthUrl = url
  const res = await fetch(url, {
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

async function gotrueSigninFallback(email: string, password: string) {
  const raw = import.meta.env.VITE_SUPABASE_URL as string
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const base = raw.replace(/\/$/, '').replace(/\/rest\/v1$/, '')
  const url = `${base}/auth/v1/signin`
  lastAuthBase = base
  lastAuthUrl = url
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon, Accept: 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) {
    try { const err = await res.json(); lastLoginError = String(err.error_description || err.error || `HTTP ${res.status}`) } catch { lastLoginError = `HTTP ${res.status}` }
    return null
  }
  lastLoginError = ''
  return res.json()
}

export async function checkAuthEndpoint() {
  const raw = import.meta.env.VITE_SUPABASE_URL as string
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const base = raw?.replace(/\/$/, '').replace(/\/rest\/v1$/, '') || ''
  if (!base || !anon) return { ok: false, error: 'ENV ausente' }
  try {
    const url = `${base}/auth/v1/settings`
    const res = await fetch(url, { headers: { apikey: anon, Accept: 'application/json' } })
    return { ok: res.ok, status: res.status, url }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
}

// ✅ FIX: Buscar empresas do usuário após login
export async function loginSupabase(email: string, password: string): Promise<Session | null> {
  try {
    let data = await gotruePasswordSignIn(email, password)
    if (!data) {
      data = await gotrueSigninFallback(email, password)
    }
    if (!data || !data.access_token) return null
    localStorage.setItem('supabase_session', JSON.stringify(data))
    const user = { id: data.user?.id || 'unknown', email }
    
    // ✅ FIX: Buscar empresas do usuário após autenticação
    let defaultCompany: string | null = null
    try {
      const userCompanies = await SupabaseRest.getUserCompanies(user.id)
      if (userCompanies.length > 0) {
        defaultCompany = userCompanies[0]
        console.log('✅ Empresa padrão do usuário:', defaultCompany)
      } else {
        // Usuário sem empresas - não definir empresa padrão
        defaultCompany = null
        console.log('⚠️ Usuário sem empresas associadas')
      }
    } catch (err: any) {
      console.warn('Erro ao buscar empresas do usuário durante login:', err)
      // Em caso de erro, não definir empresa padrão
      defaultCompany = null
    }
    
    const session: Session = {
      id: user.id,
      email: user.email || email,
      name: (user.email || email).split('@')[0],
      role: 'cliente',
      defaultCompany, // ✅ Agora é preenchido!
      mode: 'supabase',
      accessToken: data.access_token,
    }
    localStorage.setItem('session_user', JSON.stringify(session))
    return session
  } catch (e: any) {
    lastLoginError = lastLoginError || String(e?.message || e) || 'Erro inesperado no login'
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

export async function validateMockLogin(email: string, password: string): Promise<Session | null> {
  // Mock login for demo mode
  if (password === 'fin-demo' || password === 'fin123' || password === 'B5b0dcf500@#' || password === 'app321') {
    const session: Session = {
      id: 'demo-user',
      email,
      name: email.split('@')[0],
      role: email.includes('admin') ? 'admin' : email.includes('franqueado') ? 'franqueado' : 'cliente',
      defaultCompany: null,
      mode: 'demo',
      accessToken: 'demo-token',
    }
    localStorage.setItem('session_user', JSON.stringify(session))
    return session
  }
  return null
}
