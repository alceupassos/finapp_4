import { SupabaseRest } from './supabaseRest'

// Desabilitar logs em produção para evitar erros 400
const isProduction = import.meta.env.PROD

export const logger = {
  info: (message: string, meta: Partial<{ endpoint: string; companyCnpj: string; userId: string; latencyMs: number }> = {}) => {
    if (!isProduction) console.info(message, meta)
    // Remover logs para Supabase temporariamente
    return Promise.resolve()
  },
  warn: (message: string, meta: Partial<{ endpoint: string; companyCnpj: string; userId: string; latencyMs: number }> = {}) => {
    if (!isProduction) console.warn(message, meta)
    return Promise.resolve()
  },
  error: (message: string, meta: Partial<{ endpoint: string; companyCnpj: string; userId: string; latencyMs: number }> = {}) => {
    console.error(message, meta)
    return Promise.resolve()
  },
}

