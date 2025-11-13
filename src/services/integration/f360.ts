import { read, utils } from 'xlsx'
import type { DREEntry, DFCEntry } from '../../types/finance'

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  return await res.arrayBuffer()
}

export async function parseF360Excel(url: string): Promise<{ dre: DREEntry[]; dfc: DFCEntry[] }> {
  const buf = await fetchArrayBuffer(url)
  const wb = read(buf, { type: 'array' })
  const sheetNames = wb.SheetNames
  const findSheet = (keys: string[]) => sheetNames.find(n => keys.some(k => n.toLowerCase().includes(k)))
  const dreSheetName = findSheet(['dre','resultado']) || sheetNames[0]
  const dfcSheetName = findSheet(['dfc','fluxo']) || sheetNames[1] || sheetNames[0]
  const dreSheet = wb.Sheets[dreSheetName]
  const dfcSheet = wb.Sheets[dfcSheetName]
  const dreRows = utils.sheet_to_json<any>(dreSheet, { defval: '' })
  const dfcRows = utils.sheet_to_json<any>(dfcSheet, { defval: '' })

  const toNumberBR = (v: any) => {
    if (v == null) return 0
    if (typeof v === 'number') return v
    const s = String(v).replace(/\s|R\$|\./g, '').replace(',', '.')
    const n = Number(s)
    return isNaN(n) ? 0 : n
  }

  const pick = (obj: any, keys: string[]) => {
    for (const k of keys) if (obj[k] != null && obj[k] !== '') return obj[k]
    return ''
  }

  const dre: DREEntry[] = dreRows.map(r => ({
    conta: String(pick(r, ['conta','Conta','CONTA','categoria','Categoria','CATEGORIA'])).trim(),
    valor: toNumberBR(pick(r, ['valor','Valor','VALOR','total','Total','TOTAL'])),
  }))

  const dfc: DFCEntry[] = dfcRows.map(r => ({
    descricao: String(pick(r, ['descricao','Descrição','DESCRICAO','categoria','Categoria','CATEGORIA'])).trim(),
    entrada: toNumberBR(pick(r, ['entrada','Entrada','ENTRADA'])),
    saida: toNumberBR(pick(r, ['saida','Saída','SAIDA'])),
    saldo: toNumberBR(pick(r, ['saldo','Saldo','SALDO'])),
  }))
  return { dre, dfc }
}

export async function getF360Token(mdUrl: string): Promise<string | null> {
  try {
    const res = await fetch(mdUrl)
    if (!res.ok) return null
    const txt = await res.text()
    const m = txt.match(/token=['"]([a-f0-9\-]{36})['"]/i)
    return m?.[1] || null
  } catch { return null }
}
