import { SupabaseRest } from './supabaseRest'
import type { NewsItemRecord, IndicatorsRecord } from '../types/news'

export async function pushNews(items: NewsItemRecord[], indicators: IndicatorsRecord[]) {
  if (!items.length && !indicators.length) return
  const newsResp = items.length ? await SupabaseRest.restPost('news_items', items, { on_conflict: 'date,title' }) : null
  const indResp = indicators.length ? await SupabaseRest.restPost('news_indicators', indicators) : null
  return { news: newsResp, indicators: indResp }
}

