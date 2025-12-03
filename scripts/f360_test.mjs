import path from 'path'
import fs from 'fs'
import { read, utils } from 'xlsx'
import Tesseract from 'tesseract.js'

const root = process.cwd()
const excelPath = path.join(root, 'avant', 'integracao', 'f360', 'DRE e DFC outubro.2025.xlsx')
const imagePath = path.join(root, 'avant', 'integracao', 'f360', 'WhatsApp Image 2025-11-13 at 18.48.30.jpeg')

function toNumberBR(v){
  if (v == null) return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/\s|R\$|\./g,'').replace(',','.')
  const n = Number(s)
  return isNaN(n) ? 0 : n
}

function pick(obj, keys){ for (const k of keys) if (obj[k] != null && obj[k] !== '') return obj[k]; return '' }

async function parseExcelLocal(p){
  const buf = fs.readFileSync(p)
  const wb = read(buf, { type: 'buffer' })
  const sheetNames = wb.SheetNames
  const findSheet = (keys) => sheetNames.find(n => keys.some(k => n.toLowerCase().includes(k)))
  const dreSheetName = findSheet(['dre','resultado']) || sheetNames[0]
  const dfcSheetName = findSheet(['dfc','fluxo']) || sheetNames[1] || sheetNames[0]
  const dreSheet = wb.Sheets[dreSheetName]
  const dfcSheet = wb.Sheets[dfcSheetName]
  const dreStd = utils.sheet_to_json(dreSheet, { defval: '' })
  const dfcStd = utils.sheet_to_json(dfcSheet, { defval: '' })
  let dre = dreStd.map(r => ({ conta: String(pick(r,['conta','Conta','CONTA','categoria','Categoria','CATEGORIA'])).trim(), valor: toNumberBR(pick(r,['valor','Valor','VALOR','total','Total','TOTAL'])) }))
  let dfc = dfcStd.map(r => ({ descricao: String(pick(r,['descricao','Descrição','DESCRICAO','categoria','Categoria','CATEGORIA'])).trim(), entrada: toNumberBR(pick(r,['entrada','Entrada','ENTRADA'])), saida: toNumberBR(pick(r,['saida','Saída','SAIDA'])), saldo: toNumberBR(pick(r,['saldo','Saldo','SALDO'])) }))
  const empty = (arr) => !arr.length || arr.every(x => (!x.conta && !x.descricao))
  if (empty(dre)) {
    const m = utils.sheet_to_json(dreSheet, { header: 1 })
    dre = m.map(row => {
      if (!Array.isArray(row)) return { conta: '', valor: 0 }
      const contaCell = row.find(x => typeof x === 'string' && x.trim()) || ''
      const nums = row.filter(x => typeof x === 'number' || (typeof x === 'string' && /\d/.test(x)))
      const lastNum = nums.length ? toNumberBR(nums[nums.length-1]) : 0
      return { conta: String(contaCell).trim(), valor: lastNum }
    }).filter(r => r.conta || r.valor)
  }
  if (empty(dfc)) {
    const m = utils.sheet_to_json(dfcSheet, { header: 1 })
    dfc = m.map(row => {
      if (!Array.isArray(row)) return { descricao: '', entrada: 0, saida: 0, saldo: 0 }
      const descricao = row.find(x => typeof x === 'string' && x.trim()) || ''
      const nums = row.filter(x => typeof x === 'number' || (typeof x === 'string' && /\d/.test(x)))
      const entrada = nums[0] ? toNumberBR(nums[0]) : 0
      const saida = nums[1] ? toNumberBR(nums[1]) : 0
      const saldo = nums[2] ? toNumberBR(nums[2]) : (entrada - saida)
      return { descricao: String(descricao).trim(), entrada, saida, saldo }
    }).filter(r => r.descricao || r.entrada || r.saida)
  }
  return { dre, dfc }
}

async function ocrIdentity(p){
  const res = await Tesseract.recognize(p, 'por', { logger: ()=>{} })
  const text = (res.data.text || '').replace(/\s+/g,' ').trim()
  const cnpjMatch = text.match(/\b\d{2}\.\d{3}\.\d{3}\/[0-9]{4}-\d{2}\b/)
  const tokenMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  const nomeMatch = text.match(/Nome\s*[:\-]?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i)
  return { nome: nomeMatch?.[1]?.trim(), cnpj: cnpjMatch?.[0], token: tokenMatch?.[0] }
}

async function main(){
  const { dre, dfc } = await parseExcelLocal(excelPath)
  const id = await ocrIdentity(imagePath)
  const out = {
    identity: id,
    dreCount: dre.length,
    dfcCount: dfc.length,
    dreTotal: dre.reduce((a,b)=> a + (Number(b.valor)||0), 0),
    dfcEntrada: dfc.reduce((a,b)=> a + (Number(b.entrada)||0), 0),
    dfcSaida: dfc.reduce((a,b)=> a + (Number(b.saida)||0), 0),
    dfcSaldo: dfc.reduce((a,b)=> a + (Number(b.saldo)||0), 0),
    sampleDre: dre.slice(0,3),
    sampleDfc: dfc.slice(0,3)
  }
  process.stdout.write(JSON.stringify(out,null,2)+"\n")
}

main().catch(e=>{ console.error(e); process.exit(1) })