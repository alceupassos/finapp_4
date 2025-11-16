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
  return [{ cliente_nome: 'Volpe Tech', cnpj: '26888098000159' }]
}

export async function loadDREFallback(cnpj?: string) {
  try {
    if (cnpj) {
      const data = await SupabaseRest.getDRE(cnpj)
      if (Array.isArray(data) && data.length) {
        console.log('[dataLoader] Supabase DRE loaded for', cnpj, ':', data.length, 'entries')
        // Transformar { date, account, nature, amount } -> { data, conta, natureza, valor }
        const transformed = data.map((d: any) => ({
          data: d.date,
          conta: d.account,
          natureza: d.nature,
          valor: Number(d.amount)
        }))
        return transformed
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
        // Transformar { date, kind, amount } -> { data, entrada, saida, saldo }
        let saldo = 0
        const transformed = data.map((d: any) => {
          const entrada = d.kind === 'in' ? Number(d.amount) : 0
          const saida = d.kind === 'out' ? Number(d.amount) : 0
          saldo += entrada - saida
          return {
            data: d.date,
            descricao: d.category || '',
            entrada,
            saida,
            saldo
          }
        })
        return transformed
      }
    }
  } catch (err) {
    console.warn('[dataLoader] Failed to load DFC from Supabase:', err)
  }
  console.log('[dataLoader] Using mock DFC fallback')
  const res = await fetch('/dados/dfc.json')
  return res.json()
}

