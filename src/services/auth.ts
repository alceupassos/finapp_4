import { createClient } from '@supabase/supabase-js'

type Role = 'admin'|'franqueado'|'cliente'|'personalizado'
export type Session = {
  id: string
  email: string
  name: string
  role: Role
  defaultCompany: any
  mode: string
  accessToken: string
}

// --- Mock (mantido para modo demo) -------------------------------------------------
export async function validateMockLogin(email: string, password: string): Promise<Session | null> {
  try {
    const res = await fetch('/dados/mock_users.json')
    const users = await res.json()
    const u = users.find((x: any) => x.email === email && x.password === password)
    const demoUser = users.find((x: any) => x.email === email)
    const isDemo = password === 'fin-demo'
    if (!u && !isDemo) return null
    const base = isDemo ? demoUser : u
    if (!base) return null
    const session: Session = { id: base.id || base.email, email: base.email, name: base.name, role: base.role as Role, defaultCompany: base.defaultCompany, mode: isDemo ? 'demo' : 'active', accessToken: '' }
    localStorage.setItem('session_user', JSON.stringify(session))
    return session
  } catch {
    return null
  }
}

// --- Supabase Auth -----------------------------------------------------------------
function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!url || !anon) throw new Error('Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes')
  return createClient(url, anon)
}

export async function loginSupabase(email: string, password: string): Promise<Session | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) return null
  // persistimos sessão supabase separada
  localStorage.setItem('supabase_session', JSON.stringify(data.session))
  const user = data.session.user
  const isDevAdmin = (user.email || '').toLowerCase() === 'dev@angrax.com.br'
  const role: Role = isDevAdmin ? 'admin' : 'cliente'
  const session: Session = {
    id: user.id,
    email: user.email,
    name: user.email?.split('@')[0],
    role,
    defaultCompany: null,
    mode: 'supabase',
    accessToken: data.session.access_token,
  }
  localStorage.setItem('session_user', JSON.stringify(session))
  return session
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

// Verificador de acesso a dados reais usando REST da Supabase
import { SupabaseRest } from './supabaseRest'
import { logger } from './logger'

export async function verifySupabaseDataAccess() {
  try {
    const companies = await SupabaseRest.getCompanies()
    const ok = Array.isArray(companies) && companies.length > 0
    if (ok) {
      logger.info('[auth] Verificado: acesso real a empresas via Supabase', { endpoint: 'integration_f360' })
      return { ok: true, count: companies.length }
    }
    logger.warn('[auth] Sem empresas retornadas da Supabase', { endpoint: 'integration_f360' })
    return { ok: false, count: 0 }
  } catch (err: any) {
    logger.error('[auth] Falha ao verificar dados reais', { endpoint: 'integration_f360' })
    return { ok: false, error: String(err) }
  }
}
