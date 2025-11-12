import { SupabaseRest } from './supabaseRest'

export async function loadCompaniesFallback() {
  try {
    const data = await SupabaseRest.getCompanies()
    if (Array.isArray(data) && data.length) return data
  } catch {}
  return [{ grupo_empresarial: 'Grupo Volpe', cliente_nome: 'Volpe Tech', cnpj: '11.111.111/0100-11' }]
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

