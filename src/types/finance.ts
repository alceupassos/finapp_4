export interface DREEntry {
  conta: string
  valor: number
  cnpj?: string
  data?: string
}

export interface DFCEntry {
  descricao: string
  entrada: number
  saida: number
  saldo: number
  cnpj?: string
  data?: string
}

export interface CompanyInfo {
  nome: string
  cnpj: string
  grupo?: string
}

