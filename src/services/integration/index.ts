import type { DREEntry, DFCEntry } from '../../types/finance'
import { parseF360Excel, getF360Token } from './f360'
import { parseOmieExcel } from './omie'

export async function loadFromAvant(): Promise<{ dre: DREEntry[]; dfc: DFCEntry[] }> {
  const basePaths = ['/avant', '/vant', '/public/dados']
  const tryFetch = async (rel: string) => {
    for (const b of basePaths) {
      const url = `${b}/${rel}`
      const res = await fetch(url)
      if (res.ok) return url
    }
    return null
  }

  const candidates = [
    'erp/f360_dados.xlsx',
    'erp/omie_dados.xlsx',
    'DRE e DFC.xlsx',
    'E.A.S COMERCIAL.xlsx',
    'LUMINI BRASÍLIA.xlsx',
  ]
  for (const rel of candidates) {
    const url = await tryFetch(rel)
    if (url) {
      // usar parser genérico (F360) que detecta nomes de folhas (DRE/DFC)
      try {
        return await parseF360Excel(url)
      } catch {
        try {
          return await parseOmieExcel(url)
        } catch {
          continue
        }
      }
    }
  }
  return { dre: [], dfc: [] }
}

export async function loadF360Token(): Promise<string | null> {
  const paths = ['/avant/volpe.md', '/vant/volpe.md']
  for (const p of paths) {
    const t = await getF360Token(p)
    if (t) return t
  }
  return null
}
