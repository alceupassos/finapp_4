import { SupabaseRest } from './supabaseRest'

export const logger = {
  info: (message: string, meta: Partial<{ endpoint: string; companyCnpj: string; userId: string; latencyMs: number }> = {}) =>
    SupabaseRest.log({ level: 'info', service: 'UI', message, ...meta }),
  warn: (message: string, meta: Partial<{ endpoint: string; companyCnpj: string; userId: string; latencyMs: number }> = {}) =>
    SupabaseRest.log({ level: 'warn', service: 'UI', message, ...meta }),
  error: (message: string, meta: Partial<{ endpoint: string; companyCnpj: string; userId: string; latencyMs: number }> = {}) =>
    SupabaseRest.log({ level: 'error', service: 'UI', message, ...meta }),
}

