import * as XLSX from 'xlsx'

export type DreRow = { data: string; conta: string; natureza: string; valor: number }
export type DfcRow = { data: string; descricao: string; entrada: number; saida: number }

function monthIndex(name: string) {
  const map = {
    'jan': 0, 'janeiro': 0,
    'fev': 1, 'fevereiro': 1,
    'mar': 2, 'março': 2, 'marco': 2,
    'abr': 3, 'abril': 3,
    'mai': 4, 'maio': 4,
    'jun': 5, 'junho': 5,
    'jul': 6, 'julho': 6,
    'ago': 7, 'agosto': 7,
    'set': 8, 'setembro': 8,
    'out': 9, 'outubro': 9,
    'nov':10, 'novembro':10,
    'dez':11, 'dezembro':11,
  } as Record<string, number>
  const k = name.toLowerCase().trim()
  return map[k]
}

function toMonthKey(year: number, idx: number) {
  const m = String(idx+1).padStart(2, '0')
  return `${year}-${m}`
}

async function fetchWorkbook(path: string) {
  const res = await fetch(path)
  const buf = await res.arrayBuffer()
  return XLSX.read(buf, { type: 'array' })
}

export async function importMatrizFromExcel(): Promise<{ dre: DreRow[]; dfc: DfcRow[] }> {
  // Paths convencionados em public/dados
  const base = '/dados'
  const wbPlan = await fetchWorkbook(`${base}/PlanoDeContas.xlsx`).catch(()=>null)
  const wbVolpe = await fetchWorkbook(`${base}/DREDFC_VOLPE.xlsx`).catch(()=>null)
  const wbMatriz = await fetchWorkbook(`${base}/26888098000159.xlsx`).catch(()=>null)

  const dre: DreRow[] = []
  const dfc: DfcRow[] = []

  // Função de mapeamento natureza por plano de contas (simplificada)
  const natureByAccount: Record<string,string> = {}
  if (wbPlan) {
    const sheet = wbPlan.Sheets[wbPlan.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' })
    rows.forEach(r => {
      const conta = String(r['Conta'] || r['Código'] || '').trim()
      const nat = String(r['Natureza'] || r['Tipo'] || '').trim().toLowerCase()
      if (conta) natureByAccount[conta] = nat.includes('receit') ? 'receita' : 'despesa'
    })
  }

  function pushDreRow(year: number, monthIdx: number, conta: string, valor: number) {
    const monthKey = toMonthKey(year, monthIdx)
    dre.push({ data: `${monthKey}-15`, conta, natureza: natureByAccount[conta] || (valor>=0?'receita':'despesa'), valor: Number(valor||0) })
  }

  // Parse DRE/DFC do arquivo consolidado VOLPE
  if (wbVolpe) {
    const sheet = wbVolpe.Sheets[wbVolpe.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { header:1, defval: '' }) as any[][]
    // Descobrir cabeçalho de meses e ano
    const header = rows[1] || rows[0] || []
    const monthCols: { idx: number; monthIdx: number }[] = []
    let year = new Date().getFullYear()
    header.forEach((cell, i) => {
      const text = String(cell).toLowerCase()
      const mi = monthIndex(text)
      if (mi !== undefined) monthCols.push({ idx:i, monthIdx:mi })
      const matchYear = text.match(/20\d{2}/)
      if (matchYear) year = Number(matchYear[0])
    })
    // Linhas: primeira coluna é conta; meses nas colunas identificadas
    for (let r = 2; r < rows.length; r++) {
      const row = rows[r]
      const conta = String(row[0] || '').trim()
      if (!conta) continue
      monthCols.forEach(mc => {
        const val = Number(String(row[mc.idx]).replace(/\./g,'').replace(',','.'))
        if (!isFinite(val) || Math.abs(val) < 0.0001) return
        pushDreRow(year, mc.monthIdx, conta, val)
      })
    }
  }

  // Parse arquivo específico da Matriz se existir
  if (wbMatriz) {
    const sheet = wbMatriz.Sheets[wbMatriz.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { header:1, defval: '' }) as any[][]
    // heuristic similar
    const header = rows[0] || []
    const monthCols: { idx: number; monthIdx: number }[] = []
    let year = new Date().getFullYear()
    header.forEach((cell, i) => {
      const text = String(cell).toLowerCase()
      const mi = monthIndex(text)
      if (mi !== undefined) monthCols.push({ idx:i, monthIdx:mi })
      const matchYear = text.match(/20\d{2}/)
      if (matchYear) year = Number(matchYear[0])
    })
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const conta = String(row[0] || '').trim()
      if (!conta) continue
      monthCols.forEach(mc => {
        const val = Number(String(row[mc.idx]).replace(/\./g,'').replace(',','.'))
        if (!isFinite(val) || Math.abs(val) < 0.0001) return
        pushDreRow(year, mc.monthIdx, conta, val)
      })
    }
  }

  // DFC pode estar no VOLPE em outra planilha
  if (wbVolpe && wbVolpe.SheetNames.length > 1) {
    const dfcSheet = wbVolpe.Sheets[wbVolpe.SheetNames[1]]
    const rows = XLSX.utils.sheet_to_json<any>(dfcSheet, { header:1, defval: '' }) as any[][]
    const header = rows[0] || []
    const monthCols: { idx: number; monthIdx: number }[] = []
    let year = new Date().getFullYear()
    header.forEach((cell, i) => {
      const text = String(cell).toLowerCase()
      const mi = monthIndex(text)
      if (mi !== undefined) monthCols.push({ idx:i, monthIdx:mi })
      const matchYear = text.match(/20\d{2}/)
      if (matchYear) year = Number(matchYear[0])
    })
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const descricao = String(row[0] || '').trim()
      if (!descricao) continue
      monthCols.forEach(mc => {
        const entrada = Number(String(row[mc.idx]).replace(/\./g,'').replace(',','.'))
        const saida = 0
        if (!isFinite(entrada) || Math.abs(entrada) < 0.0001) return
        const monthKey = toMonthKey(year, mc.monthIdx)
        dfc.push({ data: `${monthKey}-15`, descricao, entrada: Math.abs(entrada), saida: 0 })
      })
    }
  }

  return { dre, dfc }
}

export async function importFromPath(path: string): Promise<{ dre: DreRow[]; dfc: DfcRow[] }> {
  const wb = await fetchWorkbook(path)
  const dre: DreRow[] = []
  const dfc: DfcRow[] = []
  // tentar detectar meses/ano na primeira planilha
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<any>(sheet, { header:1, defval: '' }) as any[][]
  const header = rows[0] || []
  const monthCols: { idx: number; monthIdx: number }[] = []
  let year = new Date().getFullYear()
  header.forEach((cell, i) => {
    const text = String(cell).toLowerCase()
    const mi = monthIndex(text)
    if (mi !== undefined) monthCols.push({ idx:i, monthIdx:mi })
    const matchYear = text.match(/20\d{2}/)
    if (matchYear) year = Number(matchYear[0])
  })
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const conta = String(row[0] || '').trim()
    if (!conta) continue
    monthCols.forEach(mc => {
      const val = Number(String(row[mc.idx]).replace(/\./g,'').replace(',','.'))
      if (!isFinite(val) || Math.abs(val) < 0.0001) return
      const monthKey = toMonthKey(year, mc.monthIdx)
      dre.push({ data: `${monthKey}-15`, conta, natureza: val>=0?'receita':'despesa', valor: Number(val||0) })
    })
  }
  return { dre, dfc }
}