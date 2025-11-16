import { SupabaseRest } from './supabaseRest'

export async function loadCompaniesFallback() {
  try {
    const data = await SupabaseRest.getCompanies()
    if (Array.isArray(data) && data.length) {
      console.log('[dataLoader] Supabase companies loaded:', data.length)
      return data
    }
  } catch (err) {
    console.warn('[dataLoader] Failed to load companies from Supabase:', err)
  }
  console.log('[dataLoader] Using mock company fallback')
  return [{ grupo_empresarial: 'Grupo Volpe', cliente_nome: 'Volpe Tech', cnpj: '11.111.111/0100-11' }]
}

export async function loadDREFallback(cnpj?: string) {
  try {
    if (cnpj) {
      const data = await SupabaseRest.getDRE(cnpj)
      if (Array.isArray(data) && data.length) {
        console.log('[dataLoader] Supabase DRE loaded for', cnpj, ':', data.length, 'entries')
        return data
      }
    }
  } catch (err) {
    console.warn('[dataLoader] Failed to load DRE from Supabase:', err)
  }
  console.log('[dataLoader] Using mock DRE fallback')
  const res = await fetch('/dados/dre.json')
  return res.json()
}

export async function loadDFCFallback(cnpj?: string) {
  try {
    if (cnpj) {
      const data = await SupabaseRest.getDFC(cnpj)
      if (Array.isArray(data) && data.length) {
        console.log('[dataLoader] Supabase DFC loaded for', cnpj, ':', data.length, 'entries')
        return data
      }
    }
  } catch (err) {
    console.warn('[dataLoader] Failed to load DFC from Supabase:', err)
  }
  console.log('[dataLoader] Using mock DFC fallback')
  const res = await fetch('/dados/dfc.json')
  return res.json()
}

