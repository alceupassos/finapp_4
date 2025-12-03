import { SupabaseRest } from './supabaseRest'

export async function loadCompaniesFallback() {
  try {
    const data = await SupabaseRest.getCompanies()
    if (Array.isArray(data) && data.length) {
      console.log('[dataLoader] Supabase companies loaded:', data.length)
      // Normalizar CNPJ removendo zeros à esquerda
      const normalized = data.map(c => ({
        ...c,
        cnpj: c.cnpj ? c.cnpj.replace(/^0+/, '') : c.cnpj
      }))
      
      console.log('[dataLoader] Companies loaded:', normalized.length)
      return normalized.length > 0 ? normalized : []
    }
  } catch (err) {
    console.warn('[dataLoader] Failed to load companies from Supabase:', err)
  }
  console.log('[dataLoader] Using mock company fallback')
  return []
}

export async function loadDREFallback(cnpj?: string) {
  try {
    if (cnpj) {
      const data = await SupabaseRest.getDRE(cnpj)
      if (Array.isArray(data) && data.length) return data
    }
  } catch {}
  const res = await fetch('/dados/dre.json')
  return res.json()
}

export async function loadDFCFallback(cnpj?: string) {
  try {
    if (cnpj) {
      const data = await SupabaseRest.getDFC(cnpj)
      if (Array.isArray(data) && data.length) return data
    }
  } catch {}
  const res = await fetch('/dados/dfc.json')
  return res.json()
}

