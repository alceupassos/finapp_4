import { SupabaseRest } from './supabaseRest'

export async function loadCompaniesFallback() {
  try {
    const data = await SupabaseRest.getCompanies()
    if (Array.isArray(data) && data.length) {
      console.log('[dataLoader] Supabase companies loaded:', data.length)
      // Filtrar apenas empresas do grupo VOLPE
      const volpeCompanies = data.filter(c => 
        c.cliente_nome?.toLowerCase().includes('volpe') ||
        String(c.cnpj || '').startsWith('26888098')
      )
      
      // Normalizar CNPJ removendo zeros à esquerda e forçar matriz 0159 como primeiro
      const normalized = volpeCompanies.map(c => ({
        ...c,
        cnpj: c.cnpj ? c.cnpj.replace(/^0+/, '') : c.cnpj
      }))
      
      // Forçar matriz 0159 como primeira opção
      normalized.sort((a: any, b: any) => {
        const aIs0159 = String(a.cnpj || '') === '26888098000159' ? -1 : 1
        const bIs0159 = String(b.cnpj || '') === '26888098000159' ? -1 : 1
        return aIs0159 - bIs0159
      })
      
      console.log('[dataLoader] Volpe companies loaded:', normalized.length)
      return normalized.length > 0 ? normalized : [{ cliente_nome: 'Volpe Tech', cnpj: '26888098000159' }]
    }
  } catch (err) {
    console.warn('[dataLoader] Failed to load companies from Supabase:', err)
  }
  console.log('[dataLoader] Using mock company fallback')
  return [{ cliente_nome: 'Volpe Tech', cnpj: '26888098000159' }]
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

