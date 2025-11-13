export type Sentiment = 'positivo'|'negativo'|'neutro'
export type Direction = 'up'|'down'|'neutral'

export interface NewsItemRecord {
  date: string
  title: string
  summary: string
  sentiment: Sentiment
  source: string
  url: string
  tab: 'Grupo'|'Concorrentes'|'Tendências'
  period: 'Dia'|'Semana'|'Mês'|'Ano'
}

export interface IndicatorsRecord {
  metric: string
  value: number
  direction: Direction
}

