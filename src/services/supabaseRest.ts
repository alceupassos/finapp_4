import { getSession } from './auth'

const BASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const MATRIZ_CNPJ = (import.meta.env.VITE_CNPJ_MATRIZ || '26888098000159') as string

function getSupabaseAccessToken(): string | null {
  const raw = localStorage.getItem('supabase_session')
  if (!raw) return null
  try { return JSON.parse(raw).access_token || null } catch { return null }
}

async function restGet(path: string, opts: { query?: Record<string, string> } = {}) {
  // ✅ FIX: Verificação de variáveis de ambiente
  if (!BASE_URL || !ANON_KEY) {
    console.error('❌ Variáveis Supabase ausentes:', { BASE_URL: !!BASE_URL, ANON_KEY: !!ANON_KEY })
    throw new Error('Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes')
  }
  
  const url = new URL(`${BASE_URL}/rest/v1/${path}`)
  Object.entries(opts.query || {}).forEach(([k, v]) => url.searchParams.set(k, v))
  const token = getSupabaseAccessToken() || ANON_KEY
  const res = await fetch(url.toString(), {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    // ✅ FIX: Log detalhado do erro
    const errorText = await res.text().catch(() => '')
    console.error(`❌ Supabase GET ${path} failed:`, res.status, errorText)
    throw new Error(`Supabase GET ${path} failed: ${res.status} - ${errorText}`)
  }
  return res.json()
}

async function restPost(path: string, body: unknown) {
  const url = `${BASE_URL}/rest/v1/${path}`
  const token = getSupabaseAccessToken() || ANON_KEY
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    console.error(`❌ Supabase POST ${path} failed:`, res.status, errorText)
    throw new Error(`Supabase POST ${path} failed: ${res.status} - ${errorText}`)
  }
  return res.json()
}

export const SupabaseRest = {
  restGet,
  restPost,
  getMaskedSecrets: async (): Promise<Array<{ name: string; value: string }>> => {
    try {
      const rows = await restPost('rpc/get_masked_secrets', {})
      if (!Array.isArray(rows)) return []
      return rows.map((r: any) => ({
        name: r.name || r.key || '',
        value: r.value_masked || r.masked || r.value || ''
      })).filter(s => s.name)
    } catch (err: any) {
      return []
    }
  },
  
  // ✅ NOVO: Buscar empresas do usuário pela tabela user_companies
  getUserCompanies: async (userId: string): Promise<string[]> => {
    try {
      const rows = await restGet('user_companies', { 
        query: { 
          user_id: `eq.${userId}`, 
          select: 'company_cnpj',
          limit: '100' 
        } 
      })
      if (!Array.isArray(rows)) return []
      const cnpjs = rows.map((r: any) => r.company_cnpj).filter(Boolean)
      console.log('✅ getUserCompanies encontrou', cnpjs.length, 'empresas para usuário', userId)
      return cnpjs
    } catch (err: any) {
      console.warn('⚠️ Erro ao buscar empresas do usuário:', err?.message || err)
      return []
    }
  },
  
  // ✅ FIX: getCompanies agora busca empresas do usuário logado
  getCompanies: async () => {
    try {
      // Buscar empresas do usuário logado
      const session = getSession()
      if (session?.id) {
        // Buscar CNPJs do usuário diretamente
        let userCnpjs: string[] = []
        try {
          const rows = await restGet('user_companies', { 
            query: { 
              user_id: `eq.${session.id}`, 
              select: 'company_cnpj',
              limit: '100' 
            } 
          })
          if (Array.isArray(rows)) {
            userCnpjs = rows.map((r: any) => r.company_cnpj).filter(Boolean)
            console.log('✅ getCompanies encontrou', userCnpjs.length, 'empresas para usuário', session.id)
          }
        } catch (err: any) {
          console.warn('⚠️ Erro ao buscar empresas do usuário em getCompanies:', err?.message || err)
        }
        
        if (userCnpjs.length > 0) {
          console.log('✅ Buscando detalhes de', userCnpjs.length, 'empresas do usuário')
          
          // Buscar detalhes de cada empresa na tabela integration_f360 ou companies
          const companiesList = []
          for (const cnpj of userCnpjs) {
            const cnpj14 = cnpj.replace(/^0+/, '')
            try {
              // Tentar buscar em integration_f360 primeiro
              const rows = await restGet('integration_f360', { 
                query: { 
                  select: 'cliente_nome,cnpj,grupo_empresarial',
                  cnpj: `eq.${cnpj14}`, 
                  limit: '1' 
                } 
              })
              
              if (Array.isArray(rows) && rows.length > 0) {
                companiesList.push({
                  grupo_empresarial: rows[0].grupo_empresarial || 'Grupo Volpe',
                  cliente_nome: rows[0].cliente_nome || rows[0].nome || 'Empresa',
                  cnpj: cnpj14
                })
              } else {
                // Fallback: buscar na tabela companies
                const companyRows = await restGet('companies', {
                  query: {
                    select: 'razao_social,nome_fantasia,cnpj',
                    cnpj: `eq.${cnpj14}`,
                    limit: '1'
                  }
                })
                
                if (Array.isArray(companyRows) && companyRows.length > 0) {
                  companiesList.push({
                    grupo_empresarial: 'Grupo Volpe',
                    cliente_nome: companyRows[0].nome_fantasia || companyRows[0].razao_social || 'Empresa',
                    cnpj: cnpj14
                  })
                } else {
                  // Se não encontrar, criar entrada básica
                  companiesList.push({
                    grupo_empresarial: 'Grupo Volpe',
                    cliente_nome: `Empresa ${cnpj14}`,
                    cnpj: cnpj14
                  })
                }
              }
            } catch (err: any) {
              console.warn(`⚠️ Erro ao buscar detalhes da empresa ${cnpj14}:`, err?.message || err)
              // Adicionar entrada básica mesmo com erro
              companiesList.push({
                grupo_empresarial: 'Grupo Volpe',
                cliente_nome: `Empresa ${cnpj14}`,
                cnpj: cnpj14
              })
            }
          }
          
          if (companiesList.length > 0) {
            console.log('✅ Retornando', companiesList.length, 'empresas do usuário')
            return companiesList
          }
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Erro ao buscar empresas do usuário:', err?.message || err)
    }
    
    // Fallback: se não houver usuário logado ou empresas, retornar apenas matriz
    const cnpj14 = MATRIZ_CNPJ.replace(/^0+/, '')
    try {
      const rows = await restGet('integration_f360', { 
        query: { 
          select: 'cliente_nome,cnpj,grupo_empresarial',
          cnpj: `eq.${cnpj14}`, 
          limit: '1' 
        } 
      })
      if (Array.isArray(rows) && rows.length) {
        return rows.map((r: any) => ({
          grupo_empresarial: r.grupo_empresarial || 'Grupo Volpe',
          cliente_nome: r.cliente_nome || r.nome || 'Empresa',
          cnpj: r.cnpj || cnpj14
        }))
      }
    } catch (err: any) {
      console.warn('⚠️ Erro ao buscar empresa matriz:', err?.message || err)
    }
    
    // Último fallback: construir a empresa padrão
    return [{ grupo_empresarial: 'Grupo Volpe', cliente_nome: 'Volpe Matriz', cnpj: cnpj14 }]
  },
  
  getDRE: async (cnpj: string) => {
    // Ignorar se for string 'CONSOLIDADO' ou inválida
    if (!cnpj || cnpj === 'CONSOLIDADO' || typeof cnpj !== 'string') {
      console.warn('⚠️ getDRE: CNPJ inválido ou consolidado, usando matriz')
      return []
    }
    const cnpj14 = cnpj.replace(/^0+/, '')
    try {
      const rows = await restGet('dre_entries', { query: { company_cnpj: `eq.${cnpj14}`, select: '*', limit: '5000' } })
      if (!Array.isArray(rows)) {
        console.warn('⚠️ getDRE: resposta não é array', rows)
        return []
      }
      
      console.log(`✅ getDRE: ${rows.length} registros para CNPJ ${cnpj14}`)
      
      // Log da estrutura do primeiro registro para debug
      if (rows.length > 0) {
        const first = rows[0]
        console.log('📋 getDRE - Estrutura do primeiro registro:', {
          date: first.date,
          data: first.data,
          account: first.account,
          conta: first.conta,
          nature: first.nature,
          natureza: first.natureza,
          amount: first.amount,
          valor: first.valor
        })
      }
      
      const mapped = rows.map((r: any) => {
        // Mapear data: priorizar date, depois data, depois periodo
        const dataValue = r.date || r.data || r.periodo || null
        
        // Mapear conta: priorizar account, depois conta, depois dre_line
        const contaValue = r.account ?? r.conta ?? r.dre_line ?? 'Conta'
        
        // Mapear natureza: priorizar nature, depois natureza
        const naturezaValue = r.nature ?? r.natureza ?? null
        
        // Mapear valor: priorizar amount, depois valor
        const valorValue = Number(r.amount ?? r.valor ?? 0)
        
        return {
          data: dataValue,
          conta: contaValue,
          natureza: naturezaValue,
          valor: valorValue
        }
      })
      
      // Log de amostra dos dados mapeados
      if (mapped.length > 0) {
        console.log('📊 getDRE - Amostra de dados mapeados (primeiros 3):', mapped.slice(0, 3))
        const receitas = mapped.filter((r: any) => r.natureza === 'receita').length
        const despesas = mapped.filter((r: any) => r.natureza === 'despesa').length
        const totalReceitas = mapped.filter((r: any) => r.natureza === 'receita').reduce((sum: number, r: any) => sum + r.valor, 0)
        const totalDespesas = mapped.filter((r: any) => r.natureza === 'despesa').reduce((sum: number, r: any) => sum + r.valor, 0)
        console.log(`📊 getDRE - Resumo: ${receitas} receitas (R$ ${totalReceitas.toLocaleString('pt-BR')}), ${despesas} despesas (R$ ${totalDespesas.toLocaleString('pt-BR')})`)
      }
      
      return mapped
    } catch (err: any) {
      console.error('❌ getDRE falhou:', err?.message || err)
      return []
    }
  },
  
  getDFC: async (cnpj: string) => {
    // Ignorar se for string 'CONSOLIDADO' ou inválida
    if (!cnpj || cnpj === 'CONSOLIDADO' || typeof cnpj !== 'string') {
      console.warn('⚠️ getDFC: CNPJ inválido ou consolidado, usando matriz')
      return []
    }
    const cnpj14 = cnpj.replace(/^0+/, '')
    try {
      const rows = await restGet('cashflow_entries', { query: { company_cnpj: `eq.${cnpj14}`, select: '*', limit: '5000' } })
      if (!Array.isArray(rows)) {
        console.warn('⚠️ getDFC: resposta não é array', rows)
        return []
      }
      
      console.log(`✅ getDFC: ${rows.length} registros para CNPJ ${cnpj14}`)
      
      // ✅ TAREFA 3: Se tabela vazia, gerar DFC a partir do DRE
      if (rows.length === 0) {
        console.warn(`⚠️ getDFC: Tabela cashflow_entries vazia para CNPJ ${cnpj14}`)
        console.log('🔄 getDFC: Gerando fluxo de caixa a partir do DRE...')
        
        try {
          // Buscar dados DRE
          const dreData = await SupabaseRest.getDRE(cnpj14)
          if (dreData.length === 0) {
            console.warn('⚠️ getDFC: DRE também está vazio, não é possível gerar DFC')
            return []
          }
          
          // Agrupar DRE por data e calcular entrada/saída
          const dfcMap = new Map<string, { entrada: number; saida: number; descricao: string }>()
          
          dreData.forEach((dre: any) => {
            if (!dre.data) return
            
            const dataKey = dre.data // "2025-10-01"
            const existing = dfcMap.get(dataKey) || { entrada: 0, saida: 0, descricao: 'Lançamentos DRE' }
            
            if (dre.natureza === 'receita') {
              existing.entrada += Math.abs(dre.valor || 0)
            } else if (dre.natureza === 'despesa') {
              existing.saida += Math.abs(dre.valor || 0)
            }
            
            dfcMap.set(dataKey, existing)
          })
          
          // Converter para array e ordenar por data
          const dfcFromDre = Array.from(dfcMap.entries())
            .map(([data, values]) => {
              const v = values || { entrada: 0, saida: 0, descricao: 'Lançamentos DRE' }
              return {
                data,
                entrada: v.entrada,
                saida: v.saida,
                descricao: v.descricao,
                status: 'conciliado' as const,
                saldo: 0 // Será calculado depois
              }
            })
            .sort((a, b) => new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime())
          
          // Calcular saldo acumulado
          let running = 0
          dfcFromDre.forEach(item => {
            running += (item.entrada - item.saida)
            item.saldo = running
          })
          
          console.log(`✅ getDFC: Gerados ${dfcFromDre.length} registros de fluxo de caixa a partir do DRE`)
          const totalEntrada = dfcFromDre.reduce((sum, r) => sum + r.entrada, 0)
          const totalSaida = dfcFromDre.reduce((sum, r) => sum + r.saida, 0)
          console.log(`📊 getDFC - Resumo (gerado do DRE): Total entrada R$ ${totalEntrada.toLocaleString('pt-BR')}, Total saída R$ ${totalSaida.toLocaleString('pt-BR')}`)
          
          return dfcFromDre
        } catch (dreErr: any) {
          console.error('❌ getDFC: Erro ao gerar DFC a partir do DRE:', dreErr?.message || dreErr)
          return []
        }
      }
      
      // Log da estrutura do primeiro registro para debug
      const first = rows[0]
      console.log('📋 getDFC - Estrutura do primeiro registro:', {
        date: first.date,
        data: first.data,
        kind: first.kind,
        category: first.category,
        descricao: first.descricao,
        amount: first.amount,
        valor: first.valor,
        entrada: first.entrada,
        saida: first.saida,
        status: first.status
      })
      
      // Se já estiver no formato esperado (com entrada/saida), retornar direto
      if (first.entrada !== undefined || first.saida !== undefined) {
        console.log('✅ getDFC: Dados já no formato esperado (entrada/saida)')
        return rows.map((r: any) => ({
          data: r.date || r.data || null,
          entrada: Number(r.entrada || 0),
          saida: Number(r.saida || 0),
          status: r.status || 'conciliado',
          descricao: r.descricao || r.category || 'Lançamento',
          id: r.id
        }))
      }
      
      // Caso contrário, transformar de (date, kind, category, amount) -> (data, entrada, saida, saldo)
      console.log('🔄 getDFC: Transformando dados de (date, kind, category, amount) para (data, entrada, saida)')
      const sorted = [...rows].sort((a: any, b: any) => {
        const dateA = new Date(a.date || a.data || 0).getTime()
        const dateB = new Date(b.date || b.data || 0).getTime()
        return dateA - dateB
      })
      
      let running = 0
      const mapped = sorted.map((r: any) => {
        const kind = String(r.kind || '').toLowerCase()
        const entrada = kind === 'in' ? Number(r.amount || r.valor || 0) : 0
        const saida = kind === 'out' ? Number(r.amount || r.valor || 0) : 0
        running += (entrada - saida)
        
        return {
          data: r.date || r.data || null,
          descricao: r.category || r.descricao || 'Lançamento',
          entrada,
          saida,
          saldo: running,
          status: r.status || 'conciliado',
          id: r.id ?? undefined,
        }
      })
      
      // Log de amostra dos dados mapeados
      if (mapped.length > 0) {
        console.log('📊 getDFC - Amostra de dados mapeados (primeiros 3):', mapped.slice(0, 3))
        const totalEntrada = mapped.reduce((sum: number, r: any) => sum + r.entrada, 0)
        const totalSaida = mapped.reduce((sum: number, r: any) => sum + r.saida, 0)
        console.log(`📊 getDFC - Resumo: Total entrada R$ ${totalEntrada.toLocaleString('pt-BR')}, Total saída R$ ${totalSaida.toLocaleString('pt-BR')}`)
      }
      
      return mapped
    } catch (err: any) {
      console.error('❌ getDFC falhou:', err?.message || err)
      // Se erro 404 ou tabela não existe, retornar array vazio
      if (err?.message?.includes('404') || err?.message?.includes('does not exist')) {
        console.warn('⚠️ getDFC: Tabela cashflow_entries pode não existir')
      }
      return []
    }
  },
  
  log: (item: { level: 'info'|'warn'|'error'; service: 'UI'|'API'|'Edge'; endpoint?: string; companyCnpj?: string; userId?: string; message: string; latencyMs?: number }) => {
    // ✅ FIX: Não falhar se log falhar
    return restPost('app_logs', { ...item, ts: new Date().toISOString() }).catch(err => {
      console.warn('⚠️ Falha ao enviar log:', err?.message || err)
      return null
    })
  }
}
