import { read, utils } from 'xlsx'
import type { DREEntry, DFCEntry } from '../../types/finance'

export async function parseOmieExcel(url: string): Promise<{ dre: DREEntry[]; dfc: DFCEntry[] }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  const buf = await res.arrayBuffer()
  const wb = read(buf, { type: 'array' })
  const dreSheet = wb.Sheets[wb.SheetNames.find(n => /dre|resultado/i.test(n)) || wb.SheetNames[0]]
  const dfcSheet = wb.Sheets[wb.SheetNames.find(n => /dfc|fluxo/i.test(n)) || wb.SheetNames[1] || wb.SheetNames[0]]
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
