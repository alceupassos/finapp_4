import { parseF360Excel } from './integration/f360'
import { extractTextFromImage, parseIdentity } from './ocr'
import { SupabaseRest } from './supabaseRest'

export type F360TestResult = {
  identity: { nome?: string; cnpj?: string; token?: string }
  dreCount: number
  dfcCount: number
  dreTotal: number
  dfcEntrada: number
  dfcSaida: number
  dfcSaldo: number
  tokenExists: boolean
}

export async function runF360Test({ excelUrl, imageUrl }: { excelUrl: string; imageUrl: string }): Promise<F360TestResult> {
  const { dre, dfc } = await parseF360Excel(excelUrl)
  const text = await extractTextFromImage(imageUrl)
  const identity = parseIdentity(text)
  const dreTotal = dre.reduce((a,b)=> a + (Number(b.valor)||0), 0)
  const dfcEntrada = dfc.reduce((a,b)=> a + (Number(b.entrada)||0), 0)
  const dfcSaida = dfc.reduce((a,b)=> a + (Number(b.saida)||0), 0)
  const dfcSaldo = dfc.reduce((a,b)=> a + (Number(b.saldo)||0), 0)
  let tokenExists = false
  try {
    const res = await SupabaseRest.restGet('integration_f360', { query: { select: 'id' } })
    tokenExists = !!identity.token && Array.isArray(res) && res.some((r:any)=> String(r.id).toLowerCase() === String(identity.token).toLowerCase())
  } catch {}
  return { identity, dreCount: dre.length, dfcCount: dfc.length, dreTotal, dfcEntrada, dfcSaida, dfcSaldo, tokenExists }
}