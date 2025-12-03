/**
 * Formatters centralizados para valores monetários, números e percentuais
 * Garante consistência em todo o site
 */

/**
 * Formata valor como moeda brasileira (R$)
 * @param value Valor numérico
 * @param options Opções de formatação
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export function formatCurrency(
  value: number,
  options: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    showSymbol?: boolean
  } = {}
): string {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    showSymbol = true,
  } = options

  return new Intl.NumberFormat('pt-BR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

/**
 * Formata número com separadores brasileiros
 * @param value Valor numérico
 * @returns String formatada (ex: "1.234.567")
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

/**
 * Formata valor como percentual
 * @param value Valor numérico (ex: 15.5 para 15,5%)
 * @param decimals Número de casas decimais (padrão: 2)
 * @returns String formatada (ex: "15,50%")
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals).replace('.', ',')}%`
}

/**
 * Formata valor monetário compacto (ex: "R$ 1,2M" para 1.200.000)
 * @param value Valor numérico
 * @returns String formatada
 */
export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`
  }
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`
  }
  return formatCurrency(value)
}

/**
 * Formata data no padrão brasileiro
 * @param date Data (Date, string ISO ou timestamp)
 * @returns String formatada (ex: "01/12/2025")
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

/**
 * Formata data e hora no padrão brasileiro
 * @param date Data (Date, string ISO ou timestamp)
 * @returns String formatada (ex: "01/12/2025 14:30")
 */
export function formatDateTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Valida e formata CNPJ
 * @param cnpj CNPJ com ou sem formatação
 * @returns CNPJ formatado (ex: "12.345.678/0001-90")
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

